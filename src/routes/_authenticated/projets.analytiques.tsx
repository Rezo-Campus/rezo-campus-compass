import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, FolderOpen, CheckCircle2, Clock, AlertTriangle, BarChart3,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/projets/analytiques")({
  component: ProjetsAnalytiques,
});

const db = supabase as any;

function ProjetsAnalytiques() {
  const { data: events = [] } = useQuery({
    queryKey: ["projets-analytics-events"],
    queryFn: async () => {
      const { data } = await db.from("agenda_events").select("*").eq("department", "projets");
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projets-analytics-projects"],
    queryFn: async () => {
      const { data } = await db.from("projects").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const total = events.length;
  const termine = events.filter((e: any) => e.status === "termine").length;
  const enCours = events.filter((e: any) => e.status === "en_cours").length;
  const today = new Date().toISOString().split("T")[0];
  const enRetard = events.filter((e: any) => e.status === "planifie" && e.start_date < today).length;

  const completionRate = total > 0 ? Math.round((termine / total) * 100) : 0;

  const byPriority = events.reduce((acc: Record<string, number>, e: any) => {
    acc[e.priority ?? "normal"] = (acc[e.priority ?? "normal"] ?? 0) + 1;
    return acc;
  }, {});

  const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    low:    { label: "Faible", color: "bg-green-100 text-green-700" },
    normal: { label: "Normal", color: "bg-blue-100 text-blue-700" },
    high:   { label: "Haute",  color: "bg-amber-100 text-amber-700" },
    urgent: { label: "Urgent", color: "bg-red-100 text-red-700" },
  };

  const projectsByStatus = projects.reduce((acc: Record<string, number>, p: any) => {
    acc[p.status ?? "en_cours"] = (acc[p.status ?? "en_cours"] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        eyebrow="Management de Projet"
        title="Analytiques"
        description="Indicateurs de performance et suivi de l'avancement des projets et tâches."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tâches total"     value={String(total)}     icon={BarChart3} />
        <StatCard label="Terminées"        value={String(termine)}   icon={CheckCircle2} />
        <StatCard label="En cours"         value={String(enCours)}   icon={Clock} />
        <StatCard label="En retard"        value={String(enRetard)}  icon={AlertTriangle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Taux de complétion */}
        <Panel title="Taux de complétion global">
          <div className="flex flex-col items-center py-6">
            <div className="relative flex size-32 items-center justify-center">
              <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12"
                  className="text-muted/30" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12"
                  className="text-primary transition-all"
                  strokeDasharray={`${completionRate * 3.14} 314`}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute text-2xl font-bold">{completionRate}%</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {termine} tâche{termine !== 1 ? "s" : ""} terminée{termine !== 1 ? "s" : ""} sur {total}
            </p>
          </div>
        </Panel>

        {/* Par priorité */}
        <Panel title="Tâches par priorité">
          {Object.keys(byPriority).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <div className="space-y-3 py-2">
              {Object.entries(byPriority).map(([priority, count]) => {
                const p = PRIORITY_LABELS[priority] ?? { label: priority, color: "bg-muted" };
                return (
                  <div key={priority} className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.color} w-16 text-center`}>
                      {p.label}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: total > 0 ? `${((count as number) / total) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                    <span className="w-6 text-right text-xs text-muted-foreground">{count as number}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Projets par statut */}
        <Panel title="Projets par statut">
          {Object.keys(projectsByStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun projet enregistré.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(projectsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm capitalize">{status.replace(/_/g, " ")}</span>
                  <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-bold text-primary">
                    {count as number}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Tâches en retard */}
        <Panel title="Tâches en retard">
          {enRetard === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="size-4" /> Aucune tâche en retard.
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="size-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{enRetard} tâche{enRetard > 1 ? "s" : ""} en retard</p>
                  <p className="text-xs text-amber-700">Planifiées mais non démarrées passé la date prévue.</p>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
