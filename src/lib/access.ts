import { supabase } from "@/integrations/supabase/client";

export type PortalAccess = {
  roles: string[];
  permissions: string[];
};

export async function getPortalAccess(userId: string): Promise<PortalAccess> {
  const [rolesResult, assignmentsResult] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("user_permission_roles")
      .select("permission_roles(active,permissions)")
      .eq("user_id", userId),
  ]);

  const permissions = new Set<string>();
  for (const assignment of assignmentsResult.data ?? []) {
    const role = assignment.permission_roles as { active?: boolean; permissions?: string[] } | null;
    if (!role?.active) continue;
    for (const permission of role.permissions ?? []) permissions.add(permission);
  }

  return {
    roles: (rolesResult.data ?? []).map((row) => row.role as string),
    permissions: [...permissions],
  };
}

export function hasAnyPermission(access: PortalAccess, permissions: string[]) {
  return permissions.some((permission) => access.permissions.includes(permission));
}