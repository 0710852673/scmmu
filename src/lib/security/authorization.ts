export const ROLES = ["super_admin", "admin", "head", "member", "tic"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "members.read",
  "members.write",
  "board.read",
  "board.write",
  "release_letters.read",
  "release_letters.write",
  "reports.export",
  "incidents.read",
  "incidents.write",
  "content.review",
  "content.restore",
  "assistant.use",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  admin: [
    "members.read","members.write","board.read","board.write",
    "release_letters.read","release_letters.write","reports.export",
    "incidents.read","incidents.write","content.review","content.restore",
    "assistant.use",
  ],
  head: ["members.read","board.read","release_letters.read","content.review","assistant.use"],
  tic: ["members.read","board.read","release_letters.read","incidents.read","content.review"],
  member: ["members.read","board.read","release_letters.read"],
};

export type AuthorizationSubject = {
  userId: string;
  role: Role;
  isActive?: boolean;
};

export function hasPermission(
  subject: AuthorizationSubject | null | undefined,
  permission: Permission,
): boolean {
  if (!subject || subject.isActive === false) return false;
  return ROLE_PERMISSIONS[subject.role]?.includes(permission) ?? false;
}

export function requirePermission(
  subject: AuthorizationSubject | null | undefined,
  permission: Permission,
): void {
  if (!hasPermission(subject, permission)) {
    throw new Error("FORBIDDEN");
  }
}

export function isSingleSuperAdminInvariant(
  subjects: ReadonlyArray<AuthorizationSubject>,
): boolean {
  return subjects.filter((subject) => subject.role === "super_admin" && subject.isActive !== false).length === 1;
}

export function canManageRole(
  actor: AuthorizationSubject | null | undefined,
  targetRole: Role,
): boolean {
  if (!actor || actor.isActive === false) return false;
  if (actor.role !== "super_admin") return false;
  return targetRole !== "super_admin";
}
