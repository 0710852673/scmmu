import { describe, expect, it } from "vitest";
import {
  canManageRole,
  hasPermission,
  isSingleSuperAdminInvariant,
  requirePermission,
} from "./authorization";

describe("SCCMU authorization policy", () => {
  const superAdmin = { userId: "u1", role: "super_admin" as const };
  const admin = { userId: "u2", role: "admin" as const };
  const member = { userId: "u3", role: "member" as const };

  it("keeps reports and role administration server-guarded", () => {
    expect(hasPermission(admin, "reports.export")).toBe(true);
    expect(hasPermission(member, "reports.export")).toBe(false);
    expect(canManageRole(superAdmin, "admin")).toBe(true);
    expect(canManageRole(admin, "member")).toBe(false);
    expect(canManageRole(superAdmin, "super_admin")).toBe(false);
  });

  it("rejects inactive or missing subjects", () => {
    expect(hasPermission({ ...admin, isActive: false }, "members.read")).toBe(false);
    expect(hasPermission(null, "members.read")).toBe(false);
    expect(() => requirePermission(member, "content.restore")).toThrow("FORBIDDEN");
  });

  it("enforces exactly one active Super Admin", () => {
    expect(isSingleSuperAdminInvariant([superAdmin, admin, member])).toBe(true);
    expect(isSingleSuperAdminInvariant([superAdmin, { ...admin, role: "super_admin" }])).toBe(false);
    expect(isSingleSuperAdminInvariant([admin, member])).toBe(false);
  });
});
