import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: PortalLayout,
});

const NAV: { to: string; label: string; exact?: boolean }[] = [
  { to: "/portal", label: "Dashboard", exact: true },
  { to: "/portal/profile", label: "Profile" },
  { to: "/portal/events", label: "Events" },
  { to: "/portal/attendance", label: "Attendance" },
  { to: "/portal/contributions", label: "Contributions" },
  { to: "/portal/mediaflow", label: "MediaFlow" },
  { to: "/portal/rankings", label: "Rankings" },
  { to: "/portal/announcements", label: "Announcements" },
];

const ADMIN_NAV: { to: string; label: string }[] = [
  { to: "/portal/admin/members", label: "Members" },
  { to: "/portal/admin/bookings", label: "Bookings" },
  { to: "/portal/admin/events", label: "Events" },
  { to: "/portal/admin/projects", label: "Projects" },
  { to: "/portal/admin/messages", label: "Messages" },
];

function PortalLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).map((r) => r.role);
    },
  });

  const isStaff = roles?.some((r) => ["section_head", "executive_board", "tic", "administrator"].includes(r as string));
  const isAdmin = roles?.includes("administrator");

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background grid md:grid-cols-[260px_1fr]">
      <aside className="border-r border-foreground/10 bg-card flex flex-col">
        <Link to="/" className="px-6 py-6 border-b border-foreground/10 text-xl font-bold tracking-tighter">
          SCC<span className="text-accent">MU</span>
          <div className="text-[10px] uppercase tracking-widest text-foreground/40 font-normal mt-1">Portal</div>
        </Link>

        <nav className="flex-1 p-4 space-y-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={n.exact ? { exact: true } : undefined}
              className="block px-3 py-2 rounded hover:bg-muted"
              activeProps={{ className: "block px-3 py-2 rounded bg-foreground text-background" }}
            >
              {n.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="mt-6 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40">Admin</div>
              {ADMIN_NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="block px-3 py-2 rounded hover:bg-muted"
                  activeProps={{ className: "block px-3 py-2 rounded bg-foreground text-background" }}
                >
                  {n.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-foreground/10 text-sm">
          <div className="text-xs text-foreground/60 mb-2 truncate">{user.email}</div>
          {isStaff && (
            <div className="text-[10px] uppercase tracking-widest text-accent mb-3">
              {isAdmin ? "Administrator" : "Staff"}
            </div>
          )}
          <button onClick={signOut} className="w-full border border-foreground/20 py-2 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      <main className="overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
