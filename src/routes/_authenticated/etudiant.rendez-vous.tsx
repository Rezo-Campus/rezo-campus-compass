import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/rendez-vous")({
  component: RdvEtudiant,
});

function RdvEtudiant() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();

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

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "annule" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rendez-vous annulé");
      qc.invalidateQueries({ queryKey: ["rdv-etudiant"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
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
        {upcoming.length === 0 ? <Empty /> : (
          <ul className="space-y-3">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                <RdvRow r={r} />
                <Button
                  size="sm" variant="ghost"
                  className="ml-auto shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => cancel.mutate(r.id)}
                  disabled={cancel.isPending}
                  title="Annuler ce rendez-vous"
                >
                  <XCircle className="mr-1 size-4" /> Annuler
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title={`Historique (${past.length})`}>
          {past.length === 0 ? <Empty /> : (
            <ul className="space-y-3">
              {past.map((r) => (
                <li key={r.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <RdvRow r={r} />
                </li>
              ))}
            </ul>
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
    <>
      <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
        <CalendarDays className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ({r.duration_min} min)
          </span>
          {r.location && (
            <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{r.location}</span>
          )}
        </div>
        {r.notes && <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>}
      </div>
      <Badge variant={r.status === "programme" ? "default" : r.status === "annule" ? "destructive" : "secondary"}>
        {r.status === "programme" ? "Programmé" : r.status === "termine" ? "Terminé" : "Annulé"}
      </Badge>
    </>
  );
}
