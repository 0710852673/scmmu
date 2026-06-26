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
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <div className="absolute inset-0 hero-grid-bg opacity-50" />
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-28">
        {eyebrow ? (
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">{eyebrow}</span>
        ) : null}
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight md:text-7xl">{title}</h1>
        {intro ? (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{intro}</p>
        ) : null}
      </div>
    </section>
  );
}
