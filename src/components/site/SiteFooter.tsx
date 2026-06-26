import { Link } from "@tanstack/react-router";
import { LogoFullWhite } from "./Logo";
import { Facebook, Instagram, Youtube } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-[oklch(0.13_0.015_265)] text-white">
      <div className="absolute inset-0 opacity-[0.08] hero-grid-bg" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <LogoFullWhite width={170} />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/70">
              Sivali Central College Media Unit — the in-house student media team of
              Sivali Central College. Photography, video, live broadcast and storytelling
              for every event on the school calendar.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[
                { icon: Facebook, href: "#", label: "Facebook" },
                { icon: Instagram, href: "#", label: "Instagram" },
                { icon: Youtube, href: "#", label: "YouTube" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:bg-white hover:text-[oklch(0.13_0.015_265)]"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <h5 className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber">Explore</h5>
            <ul className="space-y-3 text-sm text-white/75">
              <li><Link to="/about" className="hover:text-white">About the Unit</Link></li>
              <li><Link to="/divisions" className="hover:text-white">Divisions</Link></li>
              <li><Link to="/projects" className="hover:text-white">Projects</Link></li>
              <li><Link to="/gallery" className="hover:text-white">Gallery</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h5 className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber">Unit</h5>
            <ul className="space-y-3 text-sm text-white/75">
              <li><Link to="/leadership" className="hover:text-white">Members</Link></li>
              <li><Link to="/book" className="hover:text-white">Book Coverage</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link to="/auth" className="hover:text-white">Member Portal</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h5 className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber">School</h5>
            <ul className="space-y-3 text-sm text-white/75">
              <li>Sivali Central College</li>
              <li>Ratnapura, Sri Lanka</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-[11px] uppercase tracking-[0.18em] text-white/40 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Sivali Central College Media Unit</span>
          <span>Built by students. For the school.</span>
        </div>
      </div>
    </footer>
  );
}
