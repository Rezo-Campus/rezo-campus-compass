import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FileCheck2, MessageSquare, CalendarDays } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conseiller/")({
  component: ConseillerDashboard,
});

function ConseillerDashboard() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  const { data } = useQuery({
    enabled: !!uid,
    queryKey: ["conseiller-overview", uid],
    queryFn: async () => {
      const [students, pending, unread, rdvWeek] = await Promise.all([
        supabase.from("student_files").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id, student_id", { count: "exact" }).eq("status", "en_attente"),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", uid!).is("read_at", null),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("advisor_id", uid!)
          .gte("scheduled_at", new Date().toISOString())
          .lt("scheduled_at", new Date(Date.now() + 7 * 86400000).toISOString()),
      ]);
      return {
        students: students.count ?? 0,
        pending: pending.count ?? 0,
        unread: unread.count ?? 0,
        rdvWeek: rdvWeek.count ?? 0,
      };
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Espace conseiller"
        title="Vue d'ensemble"
        description="Vos étudiants, validations et rendez-vous en un coup d'œil."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total étudiants" value={String(data?.students ?? 0)} icon={Users} hint="tous dossiers" />
        <StatCard label="Documents en attente" value={String(data?.pending ?? 0)} icon={FileCheck2} hint="à valider" />
        <StatCard label="Messages non lus" value={String(data?.unread ?? 0)} icon={MessageSquare} />
        <StatCard label="RDV cette semaine" value={String(data?.rdvWeek ?? 0)} icon={CalendarDays} />
      </div>

      <div className="mt-8">
        <Panel title="Activité récente" description="Les dernières actions de vos étudiants.">
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Bientôt : flux d'activité en temps réel.
          </div>
        </Panel>
      </div>
    </>
  );
}
