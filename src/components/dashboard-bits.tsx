import type { ComponentType, ReactNode } from "react";
import { TrendingUp } from "lucide-react";

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
      className="rounded-2xl border border-border p-5 shadow-[var(--shadow-soft)]"
      style={{ backgroundImage: "var(--gradient-card)" }}
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {trend && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-accent/15 px-1.5 py-0.5 font-medium text-accent-foreground">
            <TrendingUp className="size-3" /> {trend}
          </span>
        )}
        {hint}
      </div>
    </div>
  );
}

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
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

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
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </div>
      )}
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
