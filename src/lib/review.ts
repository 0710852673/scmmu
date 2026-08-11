import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dispatchNotification } from "@/lib/notify.functions";
import { getPortalAccess } from "@/lib/access";

/** Roles allowed to publish straight to the public site without review. */
export const PUBLISHER_ROLES = ["administrator", "tic", "executive_board"];

export function usePublishRights(userId: string, publishPermission?: string) {
  const q = useQuery({
    queryKey: ["my-roles", userId],
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
      }
    : {
        review_status: "pending",
        submitted_by: userId,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
      };
}

/** Tell reviewers something is waiting in the queue. Never throws. */
export async function notifySubmitted(label: string, title: string) {
  await dispatchNotification({
    data: {
      trigger: "content.submitted",
      title: `${label} submitted for review: ${title}`,
      body: "A new item is waiting in the content review queue.",
      link: "/portal/admin/review-queue",
      context: {},
    },
  }).catch(() => null);
}
