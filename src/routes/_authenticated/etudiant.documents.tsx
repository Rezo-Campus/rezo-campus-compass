import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type DocStatus = Database["public"]["Enums"]["document_status"];

export const Route = createFileRoute("/_authenticated/etudiant/documents")({
  component: DocumentsRedirect,
});

function DocumentsRedirect() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center px-4">
      <div className="max-w-sm">
        <p className="text-sm font-medium">Cette page a été fusionnée avec</p>
        <p className="mt-1 text-xl font-semibold">Parcours &amp; Documents</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Vos diplômes et documents administratifs sont désormais regroupés dans un seul espace.
        </p>
        <Link
          to="/etudiant/parcours"
          className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          Accéder à Parcours &amp; Documents →
        </Link>
      </div>
    </div>
  );
}

/* ── StatusBadge : conservé pour compatibilité avec conseiller.validations ── */
export function StatusBadge({ status }: { status: DocStatus }) {
  const cfg = {
    en_attente: { label: "En attente",  icon: Clock,         cls: "bg-amber-100 text-amber-900" },
    valide:     { label: "Validé",      icon: CheckCircle2,  cls: "bg-emerald-100 text-emerald-900" },
    rejete:     { label: "Rejeté",      icon: XCircle,       cls: "bg-red-100 text-red-900" },
  }[status] ?? { label: status, icon: Clock, cls: "bg-muted text-muted-foreground" };
  const Icon = cfg.icon;
  return (
    <Badge className={`gap-1 ${cfg.cls} hover:${cfg.cls}`} variant="secondary">
      <Icon className="size-3" /> {cfg.label}
    </Badge>
  );
}
