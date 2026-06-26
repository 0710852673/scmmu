import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="border-b border-foreground/10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        {eyebrow ? (
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-4 font-serif text-5xl md:text-7xl leading-[1.05]">{title}</h1>
        {intro ? (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/70">{intro}</p>
        ) : null}
      </div>
    </section>
  );
}
