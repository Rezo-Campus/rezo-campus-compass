import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ComponentType } from "react";
import {
  GraduationCap, Users, FolderOpen, FileCheck2,
  MessageSquare, CalendarDays, AlertCircle, CheckCircle2, Clock,
  DollarSign, TrendingUp, TrendingDown, BarChart3, Kanban, UserCheck,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
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

  /* Aperçu des 3 départements */
  const { data: deptStats } = useQuery({
    queryKey: ["admin-dept-overview"],
    queryFn: async () => {
      const firstOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      )
        .toISOString()
        .slice(0, 10);

      const [txResult, projResult, leadResult, rhResult] = await Promise.allSettled([
        supabase
          .from("transactions")
          .select("type, amount")
          .gte("date", firstOfMonth),
        supabase.from("projects").select("status"),
        supabase.from("commercial_leads").select("status, value"),
        supabase.from("personnel").select("status"),
      ]);

      const txData =
        txResult.status === "fulfilled" ? (txResult.value.data ?? []) : [];
      const recettes = txData
        .filter((t) => t.type === "recette")
        .reduce((s, t) => s + (t.amount ?? 0), 0);
      const depenses = txData
        .filter((t) => t.type === "depense")
        .reduce((s, t) => s + (t.amount ?? 0), 0);

      const projData =
        projResult.status === "fulfilled" ? (projResult.value.data ?? []) : [];
      const projEnCours = projData.filter((p) => p.status === "en_cours").length;
      const projPlanifie = projData.filter((p) => p.status === "planifie").length;
      const projLivre = projData.filter((p) => p.status === "livre").length;

      const leadData =
        leadResult.status === "fulfilled" ? (leadResult.value.data ?? []) : [];
      const pipeline = leadData.filter((l) =>
        ["prospection", "en_negociation"].includes(l.status),
      );
      const gagnes = leadData.filter((l) => l.status === "gagne").length;
      const valeurPipeline = pipeline.reduce(
        (s, l) => s + (l.value ?? 0),
        0,
      );

      const rhData =
        rhResult.status === "fulfilled" ? (rhResult.value.data ?? []) : [];
      const rhTotal = rhData.length;
      const rhActifs = rhData.filter((p) => p.status === "actif").length;
      const rhConge = rhData.filter((p) => p.status === "conge").length;

      return {
        recettes,
        depenses,
        solde: recettes - depenses,
        projEnCours,
        projPlanifie,
        projLivre,
        pipeline: pipeline.length,
        gagnes,
        valeurPipeline,
        rhTotal,
        rhActifs,
        rhConge,
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

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Vue d'ensemble"
        description="Supervision complète de la plateforme en temps réel."
      />

      {/* Stats orientation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Étudiants" value={String(stats?.students ?? 0)} icon={GraduationCap} />
        <StatCard label="Conseillers" value={String(stats?.advisors ?? 0)} icon={Users} />
        <StatCard label="Dossiers ouverts" value={String(stats?.openFiles ?? 0)} icon={FolderOpen} />
        <StatCard label="Docs en attente" value={String(stats?.pendingDocs ?? 0)} icon={FileCheck2} />
        <StatCard label="RDV à venir" value={String(stats?.upcomingRdv ?? 0)} icon={CalendarDays} />
        <StatCard label="Msgs non lus" value={String(stats?.unreadMsgs ?? 0)} icon={MessageSquare} />
      </div>

      {/* ── Aperçu des 4 départements ── */}
      <h2 className="mb-4 mt-10 font-display text-xl font-semibold tracking-tight">
        Aperçu des départements
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Comptabilité */}
        <Panel
          title="Comptabilité"
          description="Finances du mois en cours"
          action={
            <Link
              to="/comptabilite"
              className="text-xs text-primary hover:underline"
            >
              Ouvrir →
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              label="Recettes"
              value={`${fmt(deptStats?.recettes ?? 0)} F`}
              icon={TrendingUp}
              color="text-green-600"
            />
            <MiniStat
              label="Dépenses"
              value={`${fmt(deptStats?.depenses ?? 0)} F`}
              icon={TrendingDown}
              color="text-red-500"
            />
            <MiniStat
              label="Solde"
              value={`${fmt(deptStats?.solde ?? 0)} F`}
              icon={DollarSign}
              color={
                (deptStats?.solde ?? 0) >= 0
                  ? "text-primary"
                  : "text-red-600"
              }
            />
          </div>
        </Panel>

        {/* Projets */}
        <Panel
          title="Projets informatiques"
          description="Suivi global des projets"
          action={
            <Link to="/projets" className="text-xs text-primary hover:underline">
              Ouvrir →
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              label="En cours"
              value={String(deptStats?.projEnCours ?? 0)}
              icon={Kanban}
            />
            <MiniStat
              label="Planifiés"
              value={String(deptStats?.projPlanifie ?? 0)}
              icon={CalendarDays}
            />
            <MiniStat
              label="Livrés"
              value={String(deptStats?.projLivre ?? 0)}
              icon={CheckCircle2}
              color="text-green-600"
            />
          </div>
        </Panel>

        {/* Commercial */}
        <Panel
          title="Marketing & Commercial"
          description="Pipeline et opportunités"
          action={
            <Link
              to="/commercial"
              className="text-xs text-primary hover:underline"
            >
              Ouvrir →
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              label="Pipeline"
              value={String(deptStats?.pipeline ?? 0)}
              icon={BarChart3}
            />
            <MiniStat
              label="Gagnés"
              value={String(deptStats?.gagnes ?? 0)}
              icon={CheckCircle2}
              color="text-green-600"
            />
            <MiniStat
              label="Potentiel"
              value={`${fmt(deptStats?.valeurPipeline ?? 0)} F`}
              icon={TrendingUp}
              color="text-primary"
            />
          </div>
        </Panel>

        {/* Ressources Humaines */}
        <Panel
          title="Ressources Humaines"
          description="Effectif du personnel"
          action={
            <Link to="/rh" className="text-xs text-primary hover:underline">
              Ouvrir →
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              label="Effectif"
              value={String(deptStats?.rhTotal ?? 0)}
              icon={UserCheck}
            />
            <MiniStat
              label="Actifs"
              value={String(deptStats?.rhActifs ?? 0)}
              icon={CheckCircle2}
              color="text-green-600"
            />
            <MiniStat
              label="Congés"
              value={String(deptStats?.rhConge ?? 0)}
              icon={Clock}
              color="text-amber-500"
            />
          </div>
        </Panel>
      </div>

      {/* ── Détails orientation ── */}
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
              { label: "Comptabilité", to: "/comptabilite", icon: DollarSign, desc: "Recettes & dépenses" },
              { label: "Projets", to: "/projets", icon: Kanban, desc: "Suivi des projets" },
              { label: "Commercial", to: "/commercial", icon: BarChart3, desc: "Pipeline & leads" },
              { label: "Ressources Humaines", to: "/rh", icon: UserCheck, desc: "Gestion du personnel" },
              { label: "Validations", to: "/admin/validations", icon: FileCheck2, desc: "Réviser documents" },
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

function MiniStat({
  label,
  value,
  icon: Icon,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
      <Icon className={`size-4 ${color}`} />
      <div className={`text-base font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
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
