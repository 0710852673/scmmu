import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Execute the real handler code with a fake authenticated client; no network or live writes.
const source = readFileSync(new URL("../letters.functions.ts", import.meta.url), "utf8")
  .replace(/^import .*;$/gm, "")
  .replace(/await import\("@\/integrations\/supabase\/client.server"\)/g, "({ supabaseAdmin: client })")
  .replace(/await import\("@\/lib\/docx-validate"\)/g, "({ validateDocx: () => ({ ok: true }) })")
  .replace(/await import\("fflate"\)/g, "codec");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function setup(results: Record<string, unknown>, storageErrors: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      let operation = "read";
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "neq", "in", "order", "single", "maybeSingle", "insert", "update", "delete"]) {
        query[method] = (...args: unknown[]) => {
          if (["insert", "update", "delete"].includes(method)) operation = method;
          if (method === "update") operation += (args[0] as { active?: boolean }).active === true ? ":on" : (args[0] as { active?: boolean }).active === false ? ":off" : "";
          return query;
        };
      }
      query.then = (resolve: (value: unknown) => unknown) => {
        const key = `${table}:${operation}`;
        calls.push(key);
        const value = results[key];
        return Promise.resolve(resolve(Array.isArray(value) ? value.shift() : value ?? { data: { id: "target" }, error: null }));
      };
      return query;
    },
    storage: { from: () => ({
      upload: vi.fn(async (path: string) => { calls.push(`upload:${path}`); return { error: storageErrors.upload ?? null }; }),
      remove: vi.fn(async (paths: string[]) => { calls.push(`remove:${paths[0]}`); return { error: storageErrors.remove ?? null }; }),
      download: vi.fn(async () => ({ data: new Blob(["master"]), error: storageErrors.download ?? null })),
    }) },
  };
  const builder = () => {
    const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
    return chain;
  };
  const exports: Record<string, (input: unknown) => Promise<unknown>> = {};
  new Function("exports", "client", "createServerFn", "requireSupabaseAuth", "fillDocumentXml", "codec", compiled)(
    exports, client, builder, {}, () => "filled", {
      unzipSync: () => ({ "word/document.xml": new Uint8Array([1]) }),
      strFromU8: () => "xml", strToU8: () => new Uint8Array([1]), zipSync: () => new Uint8Array([1]),
    },
  );
  const context = { userId: "staff", supabase: { from: () => ({ select: () => ({ eq: async () => ({ data: [{ role: "administrator" }] }) }) }) } };
  return { calls, invoke: (name: string, data: unknown) => exports[name]({ context, data }) };
}

describe("release-letter failure handling (mocked storage/database)", () => {
  it("surfaces archive errors and missing updated rows", async () => {
    for (const result of [{ error: { message: "archive denied" } }, { data: null }]) {
      const app = setup({ "release_letters:update": result });
      await expect(app.invoke("archiveReleaseLetter", { id: "letter", archived: true })).rejects.toThrow();
    }
  });
  it("reports archive success only with a returned row", async () => {
    const app = setup({});
    await expect(app.invoke("archiveReleaseLetter", { id: "letter", archived: true })).resolves.toEqual({ ok: true });
  });
  const generation = {
    "release_letters:read": { data: { id: "letter", template_id: "target", ref_no: "RL-2026-0001", event_name: "Real event" } },
    "release_letter_members:read": { data: [] },
    "letter_templates:read": { data: { id: "target", storage_path: "masters/existing.docx" } },
  };
  it("stops generation when student lookup fails", async () => {
    const app = setup({ ...generation, "release_letter_members:read": { error: { message: "students denied" } } });
    await expect(app.invoke("generateReleaseLetterDocx", { id: "letter" })).rejects.toThrow("students denied");
    expect(app.calls.some((call) => call.startsWith("upload:"))).toBe(false);
  });
  it("surfaces download and upload errors without updating the letter", async () => {
    for (const stage of ["download", "upload"]) {
      const app = setup({ ...generation }, { [stage]: { message: `${stage} failed` } });
      await expect(app.invoke("generateReleaseLetterDocx", { id: "letter" })).rejects.toThrow(`${stage} failed`);
      expect(app.calls).not.toContain("release_letters:update");
    }
  });
  it("removes only the new generated file on update failure and preserves the original error", async () => {
    const app = setup({ ...generation, "release_letters:update": { error: { message: "db failed" } } }, { remove: { message: "cleanup denied" } });
    await expect(app.invoke("generateReleaseLetterDocx", { id: "letter" })).rejects.toThrow("db failed; uploaded file cleanup failed: cleanup denied");
    const uploaded = app.calls.find((call) => call.startsWith("upload:"));
    expect(uploaded).toMatch(/^upload:generated\/letter\//);
    expect(app.calls).toContain(uploaded?.replace("upload:", "remove:"));
  });
  it("generates successfully after both upload and record update", async () => {
    const app = setup({ ...generation });
    await expect(app.invoke("generateReleaseLetterDocx", { id: "letter" })).resolves.toMatchObject({ base64: "AQ==" });
    expect(app.calls).toContain("release_letters:update");
    expect(app.calls.some((call) => call.startsWith("remove:"))).toBe(false);
  });
  it("validates name and encoded size before uploading", async () => {
    for (const data of [{ name: " ", base64: "AQ==" }, { name: "master", base64: "A".repeat(14 * 1024 * 1024) }]) {
      const app = setup({});
      await expect(app.invoke("uploadLetterTemplate", data)).rejects.toThrow();
      expect(app.calls.some((call) => call.startsWith("upload:"))).toBe(false);
    }
  });
  it("cleans up a failed template insert without deactivating the master", async () => {
    const app = setup({ "letter_templates:insert": { error: { message: "insert denied" } } });
    await expect(app.invoke("uploadLetterTemplate", { name: "master", base64: "AQ==" })).rejects.toThrow("insert denied");
    expect(app.calls.some((call) => call.startsWith("remove:masters/"))).toBe(true);
    expect(app.calls).not.toContain("letter_templates:update:off");
  });
  it("checks target existence before activation", async () => {
    const app = setup({ "letter_templates:read": { data: null, error: { message: "missing template" } } });
    await expect(app.invoke("setActiveTemplate", { id: "missing" })).rejects.toThrow("missing template");
    expect(app.calls).toEqual(["letter_templates:read"]);
  });
  it("restores previous activation when deactivation fails", async () => {
    const app = setup({
      "letter_templates:read": [{ data: { id: "target", active: false } }, { data: [{ id: "old" }] }],
      "letter_templates:update:on": [{ data: { id: "target" } }, { data: [{ id: "old" }] }],
      "letter_templates:update:off": [{ error: { message: "deactivation denied" } }, { data: { id: "target" } }],
    });
    await expect(app.invoke("setActiveTemplate", { id: "target" })).rejects.toThrow("previous activation restored");
    expect(app.calls.slice(-2)).toEqual(["letter_templates:update:on", "letter_templates:update:off"]);
  });
  it("surfaces rollback failure without disabling the new master", async () => {
    const app = setup({
      "letter_templates:read": [{ data: { id: "target", active: false } }, { data: [{ id: "old" }] }],
      "letter_templates:update:on": [{ data: { id: "target" } }, { error: { message: "restore denied" } }],
      "letter_templates:update:off": { error: { message: "deactivation denied" } },
    });
    await expect(app.invoke("setActiveTemplate", { id: "target" })).rejects.toThrow("rollback failed: restore denied");
    expect(app.calls.filter((call) => call === "letter_templates:update:off")).toHaveLength(1);
  });
});