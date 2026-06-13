import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Users, Send } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ecole/")({
  component: EcoleDashboard,
});

const STATUS_COLORS: Record<string, string> = {
  soumis: "bg-blue-100 text-blue-700",
  valide: "bg-green-100 text-green-700",
  accepte: "bg-emerald-100 text-emerald-700",
  refuse: "bg-red-100 text-red-700",
  selection: "bg-yellow-100 text-yellow-700",
};

const STATUS_LABELS: Record<string, string> = {
  selection: "En sélection",
  soumis: "Soumis",
  valide: "Validé",
  accepte: "Accepté",
  refuse: "Refusé",
};

function EcoleDashboard() {
  const { data: apps = [] } = useQuery({
    queryKey: ["ecole-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_applications")
        .select("*")
        .in("status", ["soumis", "valide", "accepte", "refuse"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set(data.map((a) => a.student_id))];
      const programIds = [...new Set(data.map((a) => a.program_id))];
      const schoolIds = [...new Set(data.map((a) => a.school_id))];

      const [profiles, programs, schools] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", studentIds),
        supabase.from("school_programs").select("id, name, level").in("id", programIds),
        supabase.from("schools").select("id, name").in("id", schoolIds),
      ]);

      return data.map((a) => ({
        ...a,
        profile: profiles.data?.find((p) => p.id === a.student_id),
        program: programs.data?.find((p) => p.id === a.program_id),
        school: schools.data?.find((s) => s.id === a.school_id),
      }));
    },
  });

  const total = apps.length;
  const soumis = apps.filter((a) => a.status === "soumis").length;
  const valides = apps.filter((a) => a.status === "valide").length;
  const acceptes = apps.filter((a) => a.status === "accepte").length;
  const recent = apps.slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Espace École"
        title="Tableau de bord"
        description="Candidatures reçues par votre établissement."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Candidatures totales" value={String(total)} icon={Send} />
        <StatCard label="Soumises" value={String(soumis)} icon={GraduationCap} hint="En attente d'examen" />
        <StatCard label="Validées" value={String(valides)} icon={Users} hint="Par le conseiller" />
        <StatCard label="Acceptées" value={String(acceptes)} icon={GraduationCap} hint="Par l'école" />
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
            <p className="text-sm text-muted-foreground">Aucune candidature reçue pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <GraduationCap className="size-4" />
                    </div>
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
