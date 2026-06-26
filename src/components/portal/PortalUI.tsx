import type { ReactNode } from "react";

export function PortalPage({ title, eyebrow, action, children }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div>
      <header className="border-b border-foreground/10 px-8 py-10 flex items-end justify-between gap-6 flex-wrap">
        <div>
          {eyebrow ? <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">{eyebrow}</div> : null}
          <h1 className="font-serif text-4xl">{title}</h1>
        </div>
        {action}
      </header>
      <div className="p-8">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="border border-foreground/10 p-6 bg-card">
      <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">{label}</div>
      <div className="mt-3 font-serif text-4xl">{value}</div>
      {sub ? <div className="mt-2 text-xs text-foreground/60">{sub}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-foreground/20 p-12 text-center text-sm text-foreground/50">
      {children}
    </div>
  );
}
