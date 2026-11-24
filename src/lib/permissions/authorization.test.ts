import { describe, expect, it } from "vitest";
import { canManageSuperAdmin, canPerform, normalizePermissionSet } from "./authorization";

describe("authorization boundaries", () => {
  it("allows super admin access to known permissions", () => {
    expect(canPerform({ role: "super_admin" }, "members.view")).toBe(true);
  });

  it("requires explicit scoped permissions for administrators", () => {
    expect(canPerform({ role: "administrator", permissions: ["members.view"] }, "members.view")).toBe(true);
    expect(canPerform({ role: "administrator", permissions: ["members.view"] }, "events.manage")).toBe(false);
  });

  it("rejects unknown permissions and missing actors", () => {
    expect(canPerform(null, "members.view")).toBe(false);
    expect(canPerform({ role: "administrator", permissions: ["system.root"] }, "system.root")).toBe(false);
  });

  it("does not let non-super-admins manage the super-admin boundary", () => {
    expect(canManageSuperAdmin({ role: "administrator", permissions: [] })).toBe(false);
    expect(canManageSuperAdmin({ role: "super_admin" })).toBe(true);
  });

  it("deduplicates and filters permissions", () => {
    expect(normalizePermissionSet(["members.view", "members.view", "system.root"])).toEqual(["members.view"]);
  });
});
