import { ALL_PERMISSIONS } from "../permissions";

export type AuthorizationRole =
  | "super_admin"
  | "administrator"
  | "section_head"
  | "executive_board"
  | "tic"
  | "member"
  | "guest";

export type AuthorizationActor = {
  role: AuthorizationRole;
  permissions?: readonly string[] | null;
};

const SUPER_ADMIN_PERMISSIONS = new Set(ALL_PERMISSIONS);

export function canPerform(
  actor: AuthorizationActor | null | undefined,
  permission: string,
): boolean {
  if (!actor || !permission) return false;
  if (actor.role === "super_admin") return true;
  if (!ALL_PERMISSIONS.includes(permission)) return false;
  return actor.permissions?.includes(permission) ?? false;
}

export function requiresSuperAdmin(permission: string): boolean {
  return permission === "system.super_admin.manage";
}

export function canManageSuperAdmin(actor: AuthorizationActor | null | undefined): boolean {
  return actor?.role === "super_admin";
}

export function normalizePermissionSet(
  permissions: readonly string[] | null | undefined,
): string[] {
  return [...new Set((permissions ?? []).filter((permission) => SUPER_ADMIN_PERMISSIONS.has(permission)))].sort();
}
