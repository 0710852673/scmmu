import { describe, expect, it } from "vitest";
import { exportCsvWithAuthorization } from "./authorized";

describe("authorized exports", () => {
  const admin = { userId: "u1", role: "admin" as const };
  const member = { userId: "u2", role: "member" as const };

  it("allows report exports only for authorized staff", () => {
    expect(exportCsvWithAuthorization(admin, [{ id: 1 }], (rows) => JSON.stringify(rows))).toBe("[{\"id\":1}]");
    expect(() => exportCsvWithAuthorization(member, [{ id: 1 }], (rows) => JSON.stringify(rows))).toThrow("FORBIDDEN");
  });
});
