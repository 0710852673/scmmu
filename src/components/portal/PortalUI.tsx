import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function PortalPage({ title, eyebrow, action, children }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="px-5 py-5 md:px-8 md:py-6 flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-2">{eyebrow}</div>
            ) : null}
            <h1 className="font-display text-2xl md:text-4xl font-extrabold tracking-tight break-words">{title}</h1>
          </div>
          {action}
        </div>
      </header>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="p-5 md:p-8"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = "default" }: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "brand" | "success" | "info";
}) {
  const tones: Record<string, string> = {
    default: "from-foreground/5 to-foreground/0 text-foreground",
    brand: "from-brand/10 to-amber/5 text-brand",
    success: "from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
    info: "from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400",
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${tones[tone]} opacity-100`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
          {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        </div>
        <div className="mt-3 font-display text-3xl md:text-4xl font-extrabold tracking-tight">{value}</div>
        {sub ? <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div> : null}
      </div>
    </motion.div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-xl font-bold tracking-tight">{children}</h2>
      {sub ? <p className="text-sm text-muted-foreground mt-0.5">{sub}</p> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export type PortalRole = "Administrator" | "TIC" | "Head / Board" | "Member";

export function RoleBadge({ role }: { role: PortalRole }) {
  const styles: Record<PortalRole, string> = {
    Administrator: "bg-gradient-to-r from-brand to-amber text-white",
    TIC: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white",
    "Head / Board": "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
    Member: "bg-muted text-foreground/80",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${styles[role]}`}>
      {role}
    </span>
  );
}
