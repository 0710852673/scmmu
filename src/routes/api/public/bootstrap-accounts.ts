import { createFileRoute } from "@tanstack/react-router";

/**
 * TEMPORARY bootstrap — creates the three demo accounts (admin/head/member).
 * Idempotent: re-running won't duplicate users. Delete this file once accounts exist.
 */
export const Route = createFileRoute("/api/public/bootstrap-accounts")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const accounts = [
          { email: "admin@sccmu.demo", password: "AdminSCCMU#2026!", full_name: "Demo Admin", role: "administrator" as const, board_category: null, role_title: "Administrator" },
          { email: "head@sccmu.demo",  password: "HeadSCCMU#2026!",  full_name: "Sanduni Ekanayake (demo)", role: "section_head" as const, board_category: "section_head", role_title: "Head of Videography" },
          { email: "member@sccmu.demo",password: "MemberSCCMU#2026!",full_name: "Ravindu Karunaratne (demo)", role: "member" as const, board_category: "member", role_title: "Photography Member" },
        ];

        const results: Array<{ email: string; status: string }> = [];

        for (const acc of accounts) {
          // Check if user exists
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
          const found = existing?.users?.find((u) => u.email === acc.email);
          let userId = found?.id;

          if (!userId) {
            const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
              email: acc.email, password: acc.password, email_confirm: true,
              user_metadata: { full_name: acc.full_name },
            });
            if (error) { results.push({ email: acc.email, status: `error: ${error.message}` }); continue; }
            userId = created.user.id;
          } else {
            await supabaseAdmin.auth.admin.updateUserById(userId, { password: acc.password });
          }

          // Ensure profile + role
          await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: acc.full_name, email: acc.email });
          await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
          await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: acc.role });

          results.push({ email: acc.email, status: "ok" });
        }

        return Response.json({ ok: true, results });
      },
    },
  },
});
