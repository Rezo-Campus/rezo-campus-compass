import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight, ClipboardList, Clock, CheckCircle2, AlertTriangle,
  CalendarDays, ArrowRight,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aadf/")({
  component: AadfDashboard,
});

const db = supabase as any;

const DEPT_LABELS: Record<string, string> = {
  commercial:   "Marketing & Commerce",
  marketing:    "Marketing",
  rh:           "Ressources Humaines",
  projets:      "Management de Projet",
  comptabilite: "Finance & Comptabilité",
  secretaire:   "Secrétariat",
  admin:        "Administration",
};

function AadfDashboard() {
  const { data: transmissions = [] } = useQuery({
    queryKey: ["aadf-transmissions-all"],
    queryFn: async () => {
      const { data, error } = await db
        .from("dept_transmissions")
        .select("*, sender:sender_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["agenda-all-departments"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await db
        .from("agenda_events")
        .select("*")
        .lte("start_date", today)
        .eq("status", "planifie")
        .order("start_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const pending = transmissions.filter((t: any) => t.status === "soumis").length;
  const registered = transmissions.filter((t: any) => t.status === "enregistre").length;
  const transmitted = transmissions.filter((t: any) => t.status === "transmis").length;
  const processed = transmissions.filter((t: any) => t.status === "traite").length;

  const recentTransmissions = transmissions.slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="AADF"
        title="Tableau de bord"
        description="Pont administratif entre les départements — suivi des transmissions et des tâches."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="En attente"   value={String(pending)}     icon={Clock}         />
        <StatCard label="Enregistrés"  value={String(registered)}  icon={ClipboardList} />
        <StatCard label="Transmis"     value={String(transmitted)} icon={ArrowLeftRight}/>
        <StatCard label="Traités"      value={String(processed)}   icon={CheckCircle2}  />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Transmissions récentes */}
        <Panel
          title="Transmissions récentes"
          action={
            <Link to="/aadf/transmissions" className="text-xs text-primary hover:underline">
              Voir tout →
            </Link>
          }
        >
          {recentTransmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune transmission.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentTransmissions.map((t: any) => (
                <li key={t.id} className="flex items-start gap-3 py-3">
                  <div className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                    t.status === "soumis"     ? "bg-amber-100 text-amber-700" :
                    t.status === "enregistre" ? "bg-blue-100 text-blue-700" :
                    t.status === "transmis"   ? "bg-indigo-100 text-indigo-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    <ArrowLeftRight className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {DEPT_LABELS[t.source_department] ?? t.source_department}
                      {" → "}
                      {DEPT_LABELS[t.target_department] ?? t.target_department}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    t.status === "soumis" ? "bg-amber-100 text-amber-700" :
                    t.status === "traite" ? "bg-green-100 text-green-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {t.status === "soumis" ? "En attente" : t.status === "enregistre" ? "Enregistré" : t.status === "transmis" ? "Transmis" : "Traité"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/aadf/transmissions"
            className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Gérer toutes les transmissions <ArrowRight className="size-3" />
          </Link>
        </Panel>

        {/* Tâches en retard */}
        <Panel title="Tâches en retard dans les départements">
          {tasks.length === 0 ? (
            <p className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Aucune tâche en retard.
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t: any) => (
                <li key={t.id} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {DEPT_LABELS[t.department] ?? t.department} · Prévu le {new Date(t.start_date + "T12:00:00").toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/aadf/taches" className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
            Voir les tâches de tous les départements <ArrowRight className="size-3" />
          </Link>
        </Panel>
      </div>

      {/* Agenda du jour */}
      <div className="mt-6">
        <Panel
          title="Agenda du jour"
          action={
            <Link to="/aadf/agenda" className="text-xs text-primary hover:underline">
              Tout l'agenda →
            </Link>
          }
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </Panel>
      </div>
    </>
  );
}
