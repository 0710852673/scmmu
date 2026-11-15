import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../notify.functions.ts", import.meta.url), "utf8")
  .replace(/^import .*;$/gm, "")
  .replace(/await import\("@\/lib\/caller.server"\)/g, "callerModule")
  .replace(/await import\("@\/integrations\/supabase\/client.server"\)/g, "({ supabaseAdmin: client })")
  .replace(/await import\("@\/lib\/mail.server"\)/g, "mailModule");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const triggers = [{ key: "content.submitted" }, { key: "booking.status_changed" }];
const contentId = "123e4567-e89b-12d3-a456-426614174000";

function setup(options: {
  caller?: { userId: string | null; staff: boolean };
  claim?: unknown;
  claimError?: { message: string } | null;
  readResults?: Record<string, unknown>;
  insertResult?: { error?: { message: string } | null };
  finishResult?: { data?: boolean; error?: { message: string } | null };
} = {}) {
  const calls: { type: string; table?: string; rows?: unknown[]; name?: string; args?: Record<string, unknown> }[] = [];
  const caller = options.caller ?? { userId: "member-1", staff: false };
  const readResults = options.readResults ?? {};
  const insertResult = options.insertResult ?? { error: null };
  const finishResult = options.finishResult ?? { data: true, error: null };

  const client = {
    from(table: string) {
      const query: any = {
        select: () => query,
        eq: () => query,
        in: () => query,
        insert: vi.fn(async (rows: unknown[]) => {
          calls.push({ type: "insert", table, rows });
          return insertResult;
        }),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(readResults[table] ?? { data: [], error: null }).then(resolve, reject),
      };
      return query;
    },
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      calls.push({ type: "rpc", name, args });
      if (name === "claim_content_submission_notification") {
        return { data: options.claim ?? null, error: options.claimError ?? null };
      }
      if (name === "finish_content_submission_notification") return finishResult;
      return { data: null, error: null };
    }),
  };

  const mailModule = { sendMail: vi.fn(async () => undefined), wrapHtml: (_title: string, body: string) => body };
  const callerModule = { getCaller: async () => caller };
  const createServerFn = () => {
    let validator = (value: unknown) => value;
    const chain: any = {
      inputValidator(fn: (value: any) => any) {
        validator = fn;
        return chain;
      },
      handler(fn: (input: any) => Promise<unknown>) {
        return async (input: any) => fn({ ...input, data: validator(input.data) });
      },
    };
    return chain;
  };
  const exports: Record<string, (input: { data: any }) => Promise<any>> = {};
  new Function(
    "exports",
    "createServerFn",
    "NOTIFICATION_TRIGGERS",
    "callerModule",
    "client",
    "mailModule",
    compiled,
  )(exports, createServerFn, triggers, callerModule, client, mailModule);

  return {
    calls,
    invoke: (name: string, data: any) => exports[name]({ data }),
  };
}

describe("content-submission notification authorization", () => {
  it("rejects the generic content.submitted trigger even for staff", async () => {
    const app = setup({ caller: { userId: "staff-1", staff: true } });
    await expect(app.invoke("dispatchNotification", {
      trigger: "content.submitted",
      title: "Forged submission",
    })).resolves.toMatchObject({ delivered: 0, emails: 0 });
    expect(app.calls).toHaveLength(0);
  });

  it("keeps other generic triggers staff-only", async () => {
    const app = setup({ caller: { userId: "member-1", staff: false } });
    await expect(app.invoke("dispatchNotification", {
      trigger: "booking.status_changed",
      title: "Forged status",
    })).resolves.toMatchObject({ error: "Forbidden" });
    expect(app.calls).toHaveLength(0);
  });

  it("rejects unauthenticated submission notification requests before claiming", async () => {
    const app = setup({ caller: { userId: null, staff: false } });
    await expect(app.invoke("notifyContentSubmission", { table: "projects", id: contentId }))
      .resolves.toMatchObject({ error: "Unauthorized", skipped: true });
    expect(app.calls).toHaveLength(0);
  });

  it("validates the table allowlist and content UUID", async () => {
    const app = setup();
    await expect(app.invoke("notifyContentSubmission", { table: "profiles", id: contentId }))
      .rejects.toThrow("Unsupported content table");
    await expect(app.invoke("notifyContentSubmission", { table: "projects", id: "not-a-uuid" }))
      .rejects.toThrow("A valid content ID is required");
    expect(app.calls).toHaveLength(0);
  });

  it("uses the database-verified title and sends only once for a successful claim", async () => {
    const app = setup({
      claim: { claim_token: "claim-1", title: "Verified title" },
      readResults: {
        notification_rules: {
          data: [{
            conditions: {},
            recipient_user_ids: ["reviewer-1"],
            recipient_roles: [],
            deliver_portal: true,
            deliver_email: false,
            priority: "normal",
          }],
          error: null,
        },
      },
    });
    await expect(app.invoke("notifyContentSubmission", {
      table: "projects",
      id: contentId,
      title: "Forged title",
    })).resolves.toMatchObject({ delivered: 1, skipped: false, error: null });

    const insert = app.calls.find((call) => call.type === "insert" && call.table === "notifications");
    expect(insert?.rows?.[0]).toMatchObject({
      title: "Project submitted for review: Verified title",
      kind: "content.submitted",
      link: "/portal/admin/review-queue",
    });
    const finish = app.calls.find((call) =>
      call.type === "rpc" && call.name === "finish_content_submission_notification",
    );
    expect(finish?.args).toMatchObject({ p_succeeded: true, p_claim_token: "claim-1" });
  });

  it("does not dispatch when the database refuses a duplicate or invalid claim", async () => {
    const app = setup({ claim: null });
    await expect(app.invoke("notifyContentSubmission", { table: "projects", id: contentId }))
      .resolves.toMatchObject({ delivered: 0, skipped: true, error: null });
    expect(app.calls).toHaveLength(1);
    expect(app.calls[0].name).toBe("claim_content_submission_notification");
  });

  it("resolves every recipient set before inserting portal notifications", async () => {
    const app = setup({
      claim: { claim_token: "claim-roles", title: "Verified title" },
      readResults: {
        notification_rules: {
          data: [{
            conditions: {},
            recipient_user_ids: [],
            recipient_roles: ["section_head"],
            deliver_portal: true,
            deliver_email: false,
            priority: "normal",
          }],
          error: null,
        },
        user_roles: { data: null, error: { message: "roles unavailable" } },
      },
    });
    await expect(app.invoke("notifyContentSubmission", { table: "projects", id: contentId }))
      .rejects.toThrow("roles unavailable");
    expect(app.calls.some((call) => call.type === "insert" && call.table === "notifications")).toBe(false);
    const finish = app.calls.find((call) =>
      call.type === "rpc" && call.name === "finish_content_submission_notification",
    );
    expect(finish?.args).toMatchObject({ p_succeeded: false, p_claim_token: "claim-roles" });
  });

  it("marks a claim failed when portal delivery fails so a later retry can recover", async () => {
    const app = setup({
      claim: { claim_token: "claim-2", title: "Verified title" },
      readResults: {
        notification_rules: {
          data: [{
            conditions: {},
            recipient_user_ids: ["reviewer-1"],
            recipient_roles: [],
            deliver_portal: true,
            deliver_email: false,
            priority: "normal",
          }],
          error: null,
        },
      },
      insertResult: { error: { message: "notification insert failed" } },
    });
    await expect(app.invoke("notifyContentSubmission", { table: "projects", id: contentId }))
      .rejects.toThrow("notification insert failed");
    const finish = app.calls.find((call) =>
      call.type === "rpc" && call.name === "finish_content_submission_notification",
    );
    expect(finish?.args).toMatchObject({ p_succeeded: false, p_claim_token: "claim-2" });
  });
});

describe("content-submission notification migration contract", () => {
  const sql = readFileSync(
    new URL("../../../drizzle/migrations/0008_content_submission_notification_guard.sql", import.meta.url),
    "utf8",
  );

  it("restricts claims to owned, pending, recently created, non-deleted content", () => {
    expect(sql).toContain("submitted_by = p_submitted_by");
    expect(sql).toContain("review_status = 'pending'");
    expect(sql).toContain("created_at >= now() - interval '10 minutes'");
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("existing.claimed_at < now() - interval '10 minutes'");
  });

  it("uses a unique event key and service-role-only database functions", () => {
    expect(sql).toContain("PRIMARY KEY (content_table, content_id)");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
    expect(sql).toContain("TO service_role");
    expect(sql).toContain("claim_token");
  });
});
