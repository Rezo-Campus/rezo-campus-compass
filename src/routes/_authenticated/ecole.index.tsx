import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Users, Send, School, Clock, XCircle } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ecole/")({
  component: EcoleDashboard,
});

const STATUS_COLORS: Record<string, string> = {
  valide: "bg-green-100 text-green-700",
  accepte: "bg-emerald-100 text-emerald-700",
  refuse: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  valide: "Validé",
  accepte: "Accepté",
  refuse: "Refusé",
};

function EcoleDashboard() {
  const { data: auth } = useAuth();
  const schoolId = auth?.profile?.school_id ?? null;

  const { data: schoolInfo } = useQuery({
    enabled: !!schoolId,
    queryKey: ["ecole-info", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, logo_url")
        .eq("id", schoolId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    enabled: !!schoolId,
    queryKey: ["ecole-pending-count", schoolId],
    queryFn: async () => {
      const { count } = await supabase
        .from("student_applications")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId!)
        .eq("status", "soumis");
      return count ?? 0;
    },
  });

  const { data: apps = [] } = useQuery({
    enabled: !!schoolId,
    queryKey: ["ecole-applications", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_applications")
        .select("*")
        .eq("school_id", schoolId!)
        .in("status", ["valide", "accepte", "refuse"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set(data.map((a) => a.student_id))];
      const programIds = [...new Set(data.map((a) => a.program_id))];

      const [profiles, programs] = await Promise.all([
        studentIds.length
          ? supabase.from("profiles").select("id, full_name, email, photo_url").in("id", studentIds)
          : { data: [] },
        programIds.length
          ? supabase.from("school_programs").select("id, name, level").in("id", programIds)
          : { data: [] },
      ]);

      return data.map((a) => ({
        ...a,
        profile: (profiles.data ?? []).find((p) => p.id === a.student_id),
        program: (programs.data ?? []).find((p) => p.id === a.program_id),
      }));
    },
  });

  if (!schoolId) {
    return (
      <>
        <PageHeader eyebrow="Espace École" title="Tableau de bord" description="" />
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <School className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Aucun établissement affecté.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contactez l'administrateur pour qu'il vous associe à votre établissement.
          </p>
        </div>
      </>
    );
  }

  const total = apps.length;
  const valides = apps.filter((a) => a.status === "valide").length;
  const acceptes = apps.filter((a) => a.status === "accepte").length;
  const refuses = apps.filter((a) => a.status === "refuse").length;
  const recent = apps.slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Espace École"
        title={schoolInfo?.name ?? "Tableau de bord"}
        description="Candidatures reçues et validées par votre établissement."
      />

      {/* Banner dossiers en attente de validation conseiller */}
      {pendingCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4">
          <Clock className="size-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              <strong>{pendingCount} dossier{pendingCount > 1 ? "s" : ""}</strong> en attente de validation par le conseiller du Rézo Campus Brazzaville.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ces candidatures vous seront transmises dès qu'un conseiller aura examiné et validé les dossiers.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dossiers reçus" value={String(total)} icon={Send} />
        <StatCard label="À examiner" value={String(valides)} icon={GraduationCap} hint="Validés par le conseiller" />
        <StatCard label="Acceptés" value={String(acceptes)} icon={Users} hint="Par votre école" />
        <StatCard label="Refusés" value={String(refuses)} icon={XCircle} hint="Par votre école" />
      </div>

      <div className="mt-8">
        <Panel
          title="Candidatures récentes"
          action={
            <Link to="/ecole/candidats" className="text-xs text-primary hover:underline">
              Voir tout →
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0
                ? "Les dossiers en attente de validation apparaîtront ici une fois traités par le conseiller."
                : "Aucune candidature reçue pour l'instant."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    {a.profile?.photo_url ? (
                      <img
                        src={a.profile.photo_url}
                        alt={a.profile.full_name ?? ""}
                        className="size-9 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <GraduationCap className="size-4" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {a.profile?.full_name || a.profile?.email || "Étudiant"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.program?.name} {a.program?.level ? `· ${a.program.level}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.motivation_letter ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">Lettre rédigée</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">Sans lettre</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[a.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
