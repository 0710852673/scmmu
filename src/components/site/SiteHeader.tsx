import { Link } from "@tanstack/react-router";

const nav = [
  { to: "/about", label: "About" },
  { to: "/divisions", label: "Divisions" },
  { to: "/projects", label: "Projects" },
  { to: "/gallery", label: "Gallery" },
  { to: "/leadership", label: "Leadership" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <nav className="sticky top-0 z-50 border-b border-foreground/5 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-2xl font-bold tracking-tighter">
          SCC<span className="text-accent">MU</span>
        </Link>
        <div className="hidden space-x-8 text-xs font-semibold uppercase tracking-widest md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="hover:text-accent transition-colors"
              activeProps={{ className: "text-accent" }}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <Link
          to="/book"
          className="bg-foreground px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-background hover:bg-accent transition-colors"
        >
          Book Coverage
        </Link>
      </div>
    </nav>
  );
}
