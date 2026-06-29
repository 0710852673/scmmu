// Temporary one-shot bootstrap. Delete after first use.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bootstrap-tic")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "tic@sccmu.demo";
        const password = "TicSCCMU#2026!";
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email === email);
        let uid = existing?.id;
        if (!uid) {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { full_name: "Demo TIC" },
          });
          if (error) return Response.json({ error: error.message }, { status: 500 });
          uid = data.user!.id;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(uid, { password });
        }
        await supabaseAdmin.from("profiles").update({
          full_name: "Demo TIC", email, grade: "Teacher",
        } as any).eq("id", uid);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
        await supabaseAdmin.from("user_roles").insert([
          { user_id: uid, role: "member" },
          { user_id: uid, role: "tic" },
        ]);
        return Response.json({ ok: true, email, password });
      },
    },
  },
});
