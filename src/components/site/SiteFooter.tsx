import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="bg-foreground py-20 text-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-3xl font-bold tracking-tighter mb-6">
              SCC<span className="text-accent">MU</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-background/60">
              The Student Council Media Unit — capturing campus life with professional craft.
              Photography, video, live broadcast and storytelling, every day.
            </p>
          </div>
          <div>
            <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-accent">Connect</h5>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-accent">Facebook</a></li>
              <li><a href="#" className="hover:text-accent">WhatsApp Channel</a></li>
              <li><a href="#" className="hover:text-accent">TikTok</a></li>
              <li><a href="#" className="hover:text-accent">YouTube</a></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-accent">Unit</h5>
            <ul className="space-y-4 text-sm">
              <li><Link to="/leadership" className="hover:text-accent">Leadership</Link></li>
              <li><Link to="/divisions" className="hover:text-accent">Divisions</Link></li>
              <li><Link to="/book" className="hover:text-accent">Book Coverage</Link></li>
              <li><Link to="/auth" className="hover:text-accent">Member Portal</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-20 border-t border-background/10 pt-8 text-center text-[10px] uppercase tracking-widest text-background/40">
          © {new Date().getFullYear()} Student Council Media Unit — sccmu.lk
        </div>
      </div>
    </footer>
  );
}
