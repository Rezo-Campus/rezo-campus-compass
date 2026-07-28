import type { ComponentType, ReactNode } from "react";
import { TrendingUp } from "lucide-react";

/* ── StatCard ── */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  trend?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5"
      style={{ backgroundImage: "var(--gradient-card)" }}
    >
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent rounded-t-2xl" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2.5 font-display text-3xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {trend && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <TrendingUp className="size-2.5" /> {trend}
              </span>
            )}
            {hint}
          </div>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

/* ── Panel ── */
export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border/50 bg-muted/25 px-6 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground leading-snug">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {/* Content */}
      <div className="p-6">{children}</div>
    </section>
  );
}

/* ── PageHeader ── */
export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          <span className="size-1.5 rounded-full bg-primary/70" />
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-[1.875rem]">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
