import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, User, Calendar, ClipboardCheck, FileText, ExternalLink,
  Trophy, Megaphone, Users, BookmarkCheck, FolderKanban, Mail, ImagePlus,
  LogOut, Settings, Shield, ChevronRight, Menu, X, CheckSquare, MailPlus, KeyRound,
} from "lucide-react";
import { ThemeToggle } from "@/lib/theme";
import { getSiteSettings } from "@/lib/public-data.functions";
import { LogoMark } from "@/components/site/Logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: PortalLayout,
});

type NavItem = { to?: string; href?: string; external?: boolean; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const MEMBER_NAV: NavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/portal/profile", label: "My Profile", icon: User },
  { to: "/portal/events", label: "Events", icon: Calendar },
  { to: "/portal/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/portal/contributions", label: "Send Requests", icon: FileText },
  { to: "/portal/rankings", label: "Rankings", icon: Trophy },
  { to: "/portal/announcements", label: "Announcements", icon: Megaphone },
  { to: "/portal/password", label: "Password", icon: KeyRound },
];

// TIC = Teacher In Charge. NO points, NO rankings, NO "send requests".
const TIC_NAV: NavItem[] = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/portal/profile", label: "My Profile", icon: User },
  { to: "/portal/admin/members", label: "Members", icon: Users },
  { to: "/portal/events", label: "Events & Approvals", icon: Calendar },
  { to: "/portal/admin/bookings", label: "Coverage Bookings", icon: BookmarkCheck },
  { to: "/portal/admin/messages", label: "Messages", icon: Mail },
  { to: "/portal/announcements", label: "Announcements", icon: Megaphone },
  { to: "/portal/password", label: "Password", icon: KeyRound },
];

const HEAD_NAV: NavItem[] = [
  { to: "/portal/admin/members", label: "Members", icon: Users },
  { to: "/portal/events", label: "Events & Approvals", icon: Calendar },
  { to: "/portal/admin/gallery", label: "Gallery", icon: ImagePlus },
  { to: "/portal/admin/bookings", label: "Coverage Bookings", icon: BookmarkCheck },
  { to: "/portal/admin/messages", label: "Messages", icon: Mail },
  { to: "/portal/announcements", label: "Announcements", icon: Megaphone },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/portal/admin/members", label: "All Members", icon: Users },
  { to: "/portal/admin/board", label: "Board & Leadership", icon: Shield },
  { to: "/portal/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/portal/admin/events", label: "Events", icon: Calendar },
  { to: "/portal/admin/gallery", label: "Gallery", icon: ImagePlus },
  { to: "/portal/admin/divisions", label: "Divisions", icon: FolderKanban },
  { to: "/portal/admin/bookings", label: "Bookings", icon: BookmarkCheck },
  { to: "/portal/admin/messages", label: "Messages", icon: Mail },
  { to: "/portal/admin/point-rules", label: "Point Rules", icon: CheckSquare },
  { to: "/portal/admin/email-templates", label: "Email Templates", icon: MailPlus },
  { to: "/portal/admin/site", label: "Site Settings", icon: Settings },
];

function PortalLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const loc = useLocation();

  const { data: roles } = useQuery({
    queryKey: ["my-roles", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).map((r) => r.role as string);
    },
  });
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });

  const isAdmin = roles?.includes("administrator");
  const isTic = roles?.includes("tic") && !isAdmin;
  const isHead = !isTic && !isAdmin && roles?.some((r) => ["section_head", "executive_board"].includes(r));
  const tier = isAdmin ? "Administrator" : isTic ? "TIC" : isHead ? "Head / Board" : "Member";
  const tierColor =
    isAdmin ? "from-brand to-amber" :
    isTic ? "from-emerald-500 to-teal-600" :
    isHead ? "from-blue-500 to-indigo-500" :
    "from-foreground/80 to-foreground";

  const mediaflowUrl = settings.data?.mediaflow_url ?? "https://sccmu.cybertec.lk/";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);

  const groups: { label: string; items: NavItem[]; accent?: boolean }[] = [];
  if (isAdmin) {
    groups.push({ label: "MEMBER", items: MEMBER_NAV });
    groups.push({ label: "ADMINISTRATOR", items: ADMIN_NAV, accent: true });
  } else if (isTic) {
    groups.push({ label: "TIC", items: TIC_NAV, accent: true });
  } else if (isHead) {
    groups.push({ label: "MEMBER", items: MEMBER_NAV });
    groups.push({ label: "HEAD / BOARD", items: HEAD_NAV, accent: true });
  } else {
    groups.push({ label: "MEMBER", items: MEMBER_NAV });
  }

  const sidebar = (
    <aside className="border-r border-border bg-card flex flex-col h-full w-[280px]">
      <Link to="/" className="px-6 py-5 border-b border-border flex items-center gap-2.5">
        <LogoMark size={28} />
        <div>
          <div className="font-display text-base font-extrabold tracking-tight leading-none">SCCMU PORTAL</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">Media Unit</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
        {groups.map((g) => (
          <NavGroup key={g.label} label={g.label} items={g.items} currentPath={loc.pathname} accent={g.accent} />
        ))}

        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">EXTERNAL</div>
          <a href={mediaflowUrl} target="_blank" rel="noopener noreferrer"
             className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
            <span className="flex items-center gap-2.5"><ExternalLink className="h-4 w-4 text-brand" /> MediaFlow</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </div>
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${tierColor} text-white text-xs font-bold shrink-0`}>
            {(user.email ?? "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate">{user.email}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{tier}</div>
          </div>
          <ThemeToggle />
        </div>
        <button onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-semibold hover:bg-foreground hover:text-background transition-colors">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[280px_1fr]">
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="font-display text-sm font-extrabold tracking-tight">SCCMU PORTAL</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border">
          <Menu className="h-4 w-4" />
        </button>
      </header>

      <div className="hidden md:block sticky top-0 h-screen">{sidebar}</div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">{sidebar}</div>
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
            className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <main className="overflow-x-hidden min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function NavGroup({ label, items, currentPath, accent }: { label: string; items: NavItem[]; currentPath: string; accent?: boolean }) {
  return (
    <div>
      <div className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${accent ? "text-brand" : "text-muted-foreground"}`}>{label}</div>
      <div className="space-y-0.5">
        {items.map((item) => {
          if (!item.to) return null;
          const active = item.exact ? currentPath === item.to : currentPath.startsWith(item.to) && (item.to !== "/portal" || currentPath === "/portal");
          return (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-foreground text-background" : "hover:bg-muted text-foreground/80"
              }`}>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
