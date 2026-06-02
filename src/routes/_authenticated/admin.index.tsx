import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Users, FolderOpen, FileCheck2 } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [students, advisors, files, pending] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "etudiant"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "conseiller"),
        supabase.from("student_files").select("id", { count: "exact", head: true }).neq("status", "archive"),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "en_attente"),
      ]);
      return {
        students: students.count ?? 0,
        advisors: advisors.count ?? 0,
        files: files.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Pilotage de la plateforme"
        description="Vue consolidée des dossiers, utilisateurs et validations."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Étudiants" value={String(data?.students ?? 0)} icon={GraduationCap} />
        <StatCard label="Conseillers" value={String(data?.advisors ?? 0)} icon={Users} />
        <StatCard label="Dossiers ouverts" value={String(data?.files ?? 0)} icon={FolderOpen} />
        <StatCard label="Documents en attente" value={String(data?.pending ?? 0)} icon={FileCheck2} />
      </div>
      <div className="mt-8">
        <Panel title="Bienvenue" description="Gérez les utilisateurs et les rôles depuis le menu Utilisateurs.">
          <p className="text-sm text-muted-foreground">
            Les conseillers peuvent prendre en charge les étudiants depuis leur espace, valider les documents et planifier les rendez-vous.
          </p>
        </Panel>
      </div>
    </>
  );
}
