import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpDown } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/comptabilite/")({
  component: ComptabiliteDashboard,
});

const BRANCH_LABELS: Record<string, string> = {
  sites_logiciels: "Sites & Logiciels",
  automatisation: "Automatisation",
  accompagnement: "Accompagnement étudiant",
  marketing: "Marketing & Commercial",
  general: "Général",
};

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
}

function ComptabiliteDashboard() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const firstOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

  const { data: monthData } = useQuery({
    queryKey: ["compta-month", firstOfMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("type, amount, branch")
        .gte("date", firstOfMonth);
      return data ?? [];
    },
  });

  const { data: yearData } = useQuery({
    queryKey: ["compta-year", firstOfYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("type, amount, branch")
        .gte("date", firstOfYear);
      return data ?? [];
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["compta-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const recettesMois = (monthData ?? []).filter((t) => t.type === "recette").reduce((s, t) => s + t.amount, 0);
  const depensesMois = (monthData ?? []).filter((t) => t.type === "depense").reduce((s, t) => s + t.amount, 0);
  const soldeMois = recettesMois - depensesMois;
  const recettesAn = (yearData ?? []).filter((t) => t.type === "recette").reduce((s, t) => s + t.amount, 0);

  const branchStats = Object.keys(BRANCH_LABELS).map((b) => {
    const rec = (yearData ?? []).filter((t) => t.branch === b && t.type === "recette").reduce((s, t) => s + t.amount, 0);
    const dep = (yearData ?? []).filter((t) => t.branch === b && t.type === "depense").reduce((s, t) => s + t.amount, 0);
    return { branch: b, recettes: rec, depenses: dep, solde: rec - dep };
  }).filter((b) => b.recettes > 0 || b.depenses > 0);

  const maxVal = Math.max(...branchStats.map((b) => b.recettes), 1);

  return (
    <>
      <PageHeader
        eyebrow="Comptabilité"
        title="Vue financière"
        description="Suivi des recettes et dépenses de Rézo Campus Consulting."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Recettes du mois"
          value={fmt(recettesMois)}
          icon={TrendingUp}
          hint={now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        />
        <StatCard
          label="Dépenses du mois"
          value={fmt(depensesMois)}
          icon={TrendingDown}
          hint={now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        />
        <StatCard
          label="Solde du mois"
          value={fmt(soldeMois)}
          icon={DollarSign}
          hint={soldeMois >= 0 ? "Bénéficiaire" : "Déficitaire"}
        />
        <StatCard
          label="Recettes (année)"
          value={fmt(recettesAn)}
          icon={TrendingUp}
          hint={String(now.getFullYear())}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Répartition par branche */}
        <Panel title="Recettes par branche (année en cours)">
          {branchStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
          ) : (
            <ul className="space-y-3">
              {branchStats.sort((a, b) => b.recettes - a.recettes).map((b) => (
                <li key={b.branch}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{BRANCH_LABELS[b.branch] ?? b.branch}</span>
                    <span className={b.solde >= 0 ? "text-green-600" : "text-red-500"}>{fmt(b.solde)}</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(b.recettes / maxVal) * 100}%` }}
                    />
                  </div>
                  <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>Recettes : {fmt(b.recettes)}</span>
                    <span>Dépenses : {fmt(b.depenses)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Dernières transactions */}
        <Panel title="Dernières transactions" action={
          <Link to="/comptabilite/transactions" className="text-xs text-primary hover:underline">
            Voir tout →
          </Link>
        }>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune transaction enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`grid size-7 place-items-center rounded-lg ${t.type === "recette" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                      {t.type === "recette" ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t.description || t.category}</div>
                      <div className="text-xs text-muted-foreground">
                        {BRANCH_LABELS[t.branch] ?? t.branch} · {new Date(t.date).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === "recette" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "recette" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/comptabilite/transactions" className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary hover:underline">
            <ArrowUpDown className="size-3" /> Gérer les transactions
          </Link>
        </Panel>
      </div>
    </>
  );
}
