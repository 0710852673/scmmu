import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Search } from "lucide-react";
import { LogoWordmark } from "./Logo";
import { ThemeToggle } from "@/lib/theme";

const nav = [
  { to: "/about", label: "About" },
  { to: "/divisions", label: "Divisions" },
  { to: "/projects", label: "Projects" },
  { to: "/gallery", label: "Gallery" },
  { to: "/live", label: "Live" },
  { to: "/leadership", label: "Members" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all ${
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-xl" : "border-b border-transparent bg-background/50 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link to="/" className="flex items-center" aria-label="SCCMU home">
          <LogoWordmark />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "rounded-full px-4 py-2 text-sm font-semibold bg-muted text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/search" aria-label="Search" className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/70 hover:bg-muted">
            <Search className="h-4 w-4" />
          </Link>
          <ThemeToggle />
          <Link
            to="/auth"
            className="hidden md:inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Member Sign in
          </Link>
          <Link
            to="/book"
            className="hidden md:inline-flex items-center gap-2 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:opacity-95 transition-opacity"
          >
            Book Coverage
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted"
                activeProps={{ className: "rounded-lg px-3 py-2.5 text-sm font-semibold bg-muted text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Member Sign in
            </Link>
            <Link
              to="/book"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
            >
              Book Coverage
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
