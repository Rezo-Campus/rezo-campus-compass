import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Clock, UserX } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/rh/")({
  component: RhDashboard,
});

const DEPT_LABELS: Record<string, string> = {
  "Sites & Logiciels": "Sites & Logiciels",
  "Automatisation": "Automatisation",
  "Accompagnement étudiant": "Accompagnement étudiant",
  "Marketing & Commercial": "Marketing & Commercial",
  "Comptabilité": "Comptabilité",
  "Projets IT": "Projets IT",
  "Ressources Humaines": "Ressources Humaines",
  "Général": "Général",
};

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-green-100 text-green-700",
  conge: "bg-amber-100 text-amber-700",
  inactif: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  conge: "En congé",
  inactif: "Inactif",
};

function RhDashboard() {
  const { data: personnel = [] } = useQuery({
    queryKey: ["personnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personnel")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = personnel.length;
  const actifs = personnel.filter((p) => p.status === "actif").length;
  const conges = personnel.filter((p) => p.status === "conge").length;
  const inactifs = personnel.filter((p) => p.status === "inactif").length;

  const recent = personnel.slice(0, 6);

  const byDept = Object.entries(DEPT_LABELS)
    .map(([key, label]) => ({
      key,
      label,
      count: personnel.filter((p) => p.department === key).length,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        eyebrow="Ressources Humaines"
        title="Tableau de bord"
        description="Suivi de l'effectif, des départements et des statuts du personnel."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Effectif total" value={String(total)} icon={Users} />
        <StatCard label="Actifs" value={String(actifs)} icon={UserCheck} />
        <StatCard label="En congé" value={String(conges)} icon={Clock} />
        <StatCard label="Inactifs" value={String(inactifs)} icon={UserX} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Personnel récent */}
        <Panel
          title="Personnel récent"
          action={
            <Link to="/rh/personnel" className="text-xs text-primary hover:underline">
              Voir tout →
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun agent enregistré.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.full_name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.department}{p.last_diploma ? ` · ${p.last_diploma}` : ""}
                    </div>
                  </div>
                  <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/rh/personnel" className="mt-3 block text-center text-xs text-primary hover:underline">
            Gérer le personnel →
          </Link>
        </Panel>

        {/* Répartition par département */}
        <Panel title="Répartition par département">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <ul className="space-y-2">
              {byDept.map(({ key, label, count }) => (
                <li key={key} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 truncate text-muted-foreground">{label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
