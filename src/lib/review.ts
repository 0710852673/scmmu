import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyContentSubmission, type ContentSubmissionTable } from "@/lib/notify.functions";
import { getPortalAccess } from "@/lib/access";

/** Roles allowed to publish straight to the public site without review. */
export const PUBLISHER_ROLES = ["administrator", "tic", "executive_board"];

export function usePublishRights(userId: string, publishPermission?: string) {
  const q = useQuery({
    queryKey: ["portal-access", userId],
    queryFn: async () => {
      return getPortalAccess(userId);
    },
  });
  const roles = q.data?.roles ?? [];
  return {
    roles,
    permissions: q.data?.permissions ?? [],
    loading: q.isLoading,
    canPublish: roles.some((r) => PUBLISHER_ROLES.includes(r)) || (!!publishPermission && (q.data?.permissions ?? []).includes(publishPermission)),
  };
}

/** Review columns to stamp on a create/update depending on the author's rights. */
export function reviewFields(canPublish: boolean, userId: string) {
  return canPublish
    ? {
        review_status: "approved",
        submitted_by: userId,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_note: null,
        updated_at: new Date().toISOString(),
      }
    : {
        review_status: "pending",
        submitted_by: userId,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        updated_at: new Date().toISOString(),
      };
}

/** Tell reviewers about a pending submission after server-side verification. */
export async function notifySubmitted(table: ContentSubmissionTable, id: string) {
  await notifyContentSubmission({ data: { table, id } }).catch(() => null);
}
