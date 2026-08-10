import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dispatchNotification } from "@/lib/notify.functions";

/** Roles allowed to publish straight to the public site without review. */
export const PUBLISHER_ROLES = ["administrator", "tic", "executive_board"];

export function usePublishRights(userId: string) {
  const q = useQuery({
    queryKey: ["my-roles", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return (data ?? []).map((r) => r.role as string);
    },
  });
  const roles = q.data ?? [];
  return {
    roles,
    loading: q.isLoading,
    canPublish: roles.some((r) => PUBLISHER_ROLES.includes(r)),
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
