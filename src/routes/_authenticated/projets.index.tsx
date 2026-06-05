import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Clock, CheckCircle2, PauseCircle, AlertTriangle } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/projets/")({
  component: ProjetsDashboard,
});

const STATUS_LABELS: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  livre: "Livré",
  suspendu: "Suspendu",
  archive: "Archivé",
};

const STATUS_COLORS: Record<string, string> = {
  planifie: "bg-blue-100 text-blue-700",
  en_cours: "bg-yellow-100 text-yellow-700",
  livre: "bg-green-100 text-green-700",
  suspendu: "bg-orange-100 text-orange-700",
  archive: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  basse: "text-gray-400",
  normale: "text-blue-500",
  haute: "text-orange-500",
  urgente: "text-red-500",
};

const BRANCH_LABELS: Record<string, string> = {
  sites_logiciels: "Sites & Logiciels",
  automatisation: "Automatisation",
  accompagnement: "Accompagnement",
  autre: "Autre",
};

function ProjetsDashboard() {
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = projects.length;
  const enCours = projects.filter((p) => p.status === "en_cours").length;
  const livres = projects.filter((p) => p.status === "livre").length;
  const planifies = projects.filter((p) => p.status === "planifie").length;

  const recent = projects.slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Projets"
        title="Tableau de bord"
        description="Planification et suivi de tous les projets Rézo Campus."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total projets" value={String(total)} icon={FolderOpen} />
        <StatCard label="En cours" value={String(enCours)} icon={Clock} hint="Projets actifs" />
        <StatCard label="Livrés" value={String(livres)} icon={CheckCircle2} hint="Terminés" />
        <StatCard label="Planifiés" value={String(planifies)} icon={AlertTriangle} hint="À démarrer" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Projets récents */}
        <Panel title="Projets récents" action={
          <Link to="/projets/liste" className="text-xs text-primary hover:underline">Voir tout →</Link>
        }>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun projet créé.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((p) => (
                <li key={p.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FolderOpen className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status] ?? "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {p.client && <span>{p.client}</span>}
                      <span>{BRANCH_LABELS[p.branch] ?? p.branch}</span>
                      {p.end_date && <span>Livraison : {new Date(p.end_date).toLocaleDateString("fr-FR")}</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${PRIORITY_COLORS[p.priority] ?? ""}`}>
                    {p.priority?.charAt(0).toUpperCase() + p.priority?.slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/projets/liste" className="mt-3 block text-center text-xs text-primary hover:underline">
            Gérer tous les projets →
          </Link>
        </Panel>

        {/* Répartition par statut */}
        <Panel title="Répartition par statut">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun projet.</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const count = projects.filter((p) => p.status === status).length;
                if (count === 0) return null;
                return (
                  <li key={status} className="flex items-center gap-3">
                    <span className={`w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-medium ${STATUS_COLORS[status]}`}>{label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
