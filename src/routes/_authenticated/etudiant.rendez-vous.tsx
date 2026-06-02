import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/rendez-vous")({
  component: RdvEtudiant,
});

function RdvEtudiant() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  const { data: rdvs = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["rdv-etudiant", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("student_id", uid!)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upcoming = rdvs.filter((r) => new Date(r.scheduled_at) >= new Date() && r.status === "programme");
  const past = rdvs.filter((r) => !upcoming.includes(r));

  return (
    <>
      <PageHeader
        eyebrow="Rendez-vous"
        title="Mes rendez-vous d'orientation"
        description="Vos créneaux planifiés avec votre conseiller."
      />

      <Panel title={`À venir (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3">{upcoming.map((r) => <RdvRow key={r.id} r={r} />)}</ul>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title={`Historique (${past.length})`}>
          {past.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-3">{past.map((r) => <RdvRow key={r.id} r={r} />)}</ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      Aucun rendez-vous.
    </div>
  );
}

type Rdv = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  location: string | null;
  status: string;
  notes: string | null;
};

export function RdvRow({ r }: { r: Rdv }) {
  const d = new Date(r.scheduled_at);
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border p-3">
      <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
        <CalendarDays className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="size-3" />
            {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ({r.duration_min} min)
          </span>
          {r.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{r.location}</span>}
        </div>
        {r.notes && <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>}
      </div>
      <Badge variant={r.status === "programme" ? "default" : r.status === "annule" ? "destructive" : "secondary"}>
        {r.status === "programme" ? "Programmé" : r.status === "termine" ? "Terminé" : "Annulé"}
      </Badge>
    </li>
  );
}
