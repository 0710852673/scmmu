import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogoFullWhite } from "./Logo";
import { Facebook, Youtube, MessageCircle, Mail, MapPin, Phone } from "lucide-react";
import { getSiteSettings } from "@/lib/public-data.functions";

function TikTokIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.5 3a5.5 5.5 0 0 0 4.5 4.4v3a8.5 8.5 0 0 1-4.5-1.4v6.7A6.3 6.3 0 1 1 10.2 9.4v3.2a3.2 3.2 0 1 0 3.3 3.2V3z" />
    </svg>
  );
}

export function SiteFooter() {
  const settings = useQuery({ queryKey: ["site-settings"], queryFn: () => getSiteSettings() });
  const s = settings.data;

  const socials = [
    { icon: Facebook, href: s?.facebook_url ?? "#", label: "Facebook" },
    { icon: Youtube, href: s?.youtube_url ?? "#", label: "YouTube" },
    { icon: MessageCircle, href: s?.whatsapp_channel_url ?? "#", label: "WhatsApp Channel" },
    { icon: TikTokIcon, href: s?.tiktok_url ?? "#", label: "TikTok" },
  ];

  return (
    <footer className="relative mt-24 overflow-hidden bg-[oklch(0.11_0.015_265)] text-white">
      <div className="absolute inset-0 opacity-[0.06] hero-grid-bg" />
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-brand/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <LogoFullWhite width={160} />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/70">
              The student media unit of Sivali Central College — photography, video, live broadcast and storytelling for every event on the school calendar.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {socials.map((sc) => (
                <a key={sc.label} href={sc.href} target="_blank" rel="noopener noreferrer" aria-label={sc.label}
                   className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-all hover:bg-white hover:text-[oklch(0.11_0.015_265)] hover:-translate-y-0.5">
                  <sc.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <h5 className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber">Explore</h5>
            <ul className="space-y-3 text-sm text-white/75">
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/divisions" className="hover:text-white transition-colors">Divisions</Link></li>
              <li><Link to="/projects" className="hover:text-white transition-colors">Projects</Link></li>
              <li><Link to="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
              <li><Link to="/leadership" className="hover:text-white transition-colors">Board</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h5 className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-amber">Contact</h5>
            <ul className="space-y-4 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-amber" />
                <a href={s?.whatsapp_url ?? "#"} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  {s?.whatsapp_number ?? "+94 70 5951050"} <span className="ml-1 text-[10px] uppercase tracking-widest text-white/40">WhatsApp</span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-amber" />
                <a href={`mailto:${s?.email_address ?? "mediaunit.scc@gmail.com"}`} className="hover:text-white break-all">
                  {s?.email_address ?? "mediaunit.scc@gmail.com"}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-amber" />
                <span className="text-white/70">{s?.address_line ?? "Media Unit, Sivali Central College, Ratnapura"}</span>
              </li>
            </ul>
            <Link to="/book"
                  className="mt-6 inline-flex items-center justify-center rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95">
              Book Coverage
            </Link>
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
