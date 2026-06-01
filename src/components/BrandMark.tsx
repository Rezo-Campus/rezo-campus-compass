import { GraduationCap } from "lucide-react";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  const icon = size === "lg" ? "size-10" : size === "sm" ? "size-7" : "size-9";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${icon} grid place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-elegant)]`}
        style={{ background: "var(--gradient-hero)" }}
      >
        <GraduationCap className="size-1/2" />
      </div>
      <div className="leading-tight">
        <div className={`font-display font-semibold tracking-tight ${text}`}>
          Rézo <span className="text-accent">Campus</span>
        </div>
        {size !== "sm" && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Consulting
          </div>
        )}
      </div>
    </div>
  );
}
