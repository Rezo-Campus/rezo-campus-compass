import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap, Users, FolderOpen, FileCheck2,
  MessageSquare, CalendarDays, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [students, advisors, pendingDocs, upcomingRdv, unreadMsgs, openFiles] =
        await Promise.all([
          supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "etudiant"),
          supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "conseiller"),
          supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "en_attente"),
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("status", "programme")
            .gte("scheduled_at", new Date().toISOString()),
          supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null),
          supabase.from("student_files").select("id", { count: "exact", head: true }).neq("status", "archive"),
        ]);
      return {
        students: students.count ?? 0,
        advisors: advisors.count ?? 0,
        pendingDocs: pendingDocs.count ?? 0,
        upcomingRdv: upcomingRdv.count ?? 0,
        unreadMsgs: unreadMsgs.count ?? 0,
        openFiles: openFiles.count ?? 0,
      };
    },
  });

  const { data: recentFiles = [] } = useQuery({
    queryKey: ["admin-recent-files"],
    queryFn: async () => {
      const { data: files } = await supabase
        .from("student_files")
        .select("student_id, status, progress, advisor_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(6);
      if (!files?.length) return [];
      const ids = files.map((f) => f.student_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return files.map((f) => ({ ...f, profile: profs?.find((p) => p.id === f.student_id) }));
    },
  });

  const { data: recentDocs = [] } = useQuery({
    queryKey: ["admin-recent-docs"],
    queryFn: async () => {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, name, status, student_id, uploaded_at")
        .eq("status", "en_attente")
        .order("uploaded_at", { ascending: false })
        .limit(5);
      if (!docs?.length) return [];
      const ids = [...new Set(docs.map((d) => d.student_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return docs.map((d) => ({ ...d, profile: profs?.find((p) => p.id === d.student_id) }));
    },
  });

  const { data: recentRdv = [] } = useQuery({
    queryKey: ["admin-recent-rdv"],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("status", "programme")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(5);
      if (!data?.length) return [];
      const ids = [...new Set([...data.map((r) => r.student_id), ...data.map((r) => r.advisor_id)])];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return data.map((r) => ({
        ...r,
        student: profs?.find((p) => p.id === r.student_id),
        advisor: profs?.find((p) => p.id === r.advisor_id),
      }));
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Vue d'ensemble"
        description="Supervision complète de la plateforme en temps réel."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Étudiants" value={String(stats?.students ?? 0)} icon={GraduationCap} />
        <StatCard label="Conseillers" value={String(stats?.advisors ?? 0)} icon={Users} />
        <StatCard label="Dossiers ouverts" value={String(stats?.openFiles ?? 0)} icon={FolderOpen} />
        <StatCard label="Docs en attente" value={String(stats?.pendingDocs ?? 0)} icon={FileCheck2} />
        <StatCard label="RDV à venir" value={String(stats?.upcomingRdv ?? 0)} icon={CalendarDays} />
        <StatCard label="Msgs non lus" value={String(stats?.unreadMsgs ?? 0)} icon={MessageSquare} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Dossiers récents */}
        <Panel title="Dossiers récents" description="Dernières activités sur les dossiers étudiants.">
          {recentFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun dossier.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentFiles.map((f) => (
                <li key={f.student_id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium">{f.profile?.full_name || f.profile?.email || "—"}</div>
                    <div className="text-xs text-muted-foreground">{f.profile?.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${f.progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{f.progress}%</span>
                    <StatusFileBadge status={f.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/dossiers" className="mt-3 block text-center text-xs text-primary hover:underline">
            Voir tous les dossiers →
          </Link>
        </Panel>

        {/* Documents en attente */}
        <Panel title="Documents à valider" description="Documents récents nécessitant une révision.">
          {recentDocs.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-green-500" /> Tous les documents sont traités.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.profile?.full_name || d.profile?.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.uploaded_at).toLocaleDateString("fr-FR")}
                    </span>
                    <AlertCircle className="size-4 text-amber-500" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/validations" className="mt-3 block text-center text-xs text-primary hover:underline">
            Accéder aux validations →
          </Link>
        </Panel>

        {/* Prochains rendez-vous */}
        <Panel title="Prochains rendez-vous" description="RDV programmés sur toute la plateforme.">
          {recentRdv.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous à venir.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentRdv.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium">{r.student?.full_name || r.student?.email || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      Conseiller : {r.advisor?.full_name || r.advisor?.email || "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <Clock className="size-3 text-muted-foreground" />
                      {new Date(r.scheduled_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                    {r.location && <div className="text-xs text-muted-foreground">{r.location}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/rendez-vous" className="mt-3 block text-center text-xs text-primary hover:underline">
            Gérer les rendez-vous →
          </Link>
        </Panel>

        {/* Accès rapides */}
        <Panel title="Accès rapides">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Gérer les accès", to: "/admin/utilisateurs", icon: Users, desc: "Attribuer les rôles" },
              { label: "Tous les dossiers", to: "/admin/dossiers", icon: FolderOpen, desc: "Assigner conseillers" },
              { label: "Validations", to: "/admin/validations", icon: FileCheck2, desc: "Réviser documents" },
              { label: "Messages", to: "/admin/messages", icon: MessageSquare, desc: "Toutes conversations" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col gap-1 rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/40"
              >
                <item.icon className="size-5 text-primary" />
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function StatusFileBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    nouveau: "bg-blue-100 text-blue-700",
    en_cours: "bg-yellow-100 text-yellow-700",
    soumis: "bg-purple-100 text-purple-700",
    accepte: "bg-green-100 text-green-700",
    refuse: "bg-red-100 text-red-700",
    archive: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
