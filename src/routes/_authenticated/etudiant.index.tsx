import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  MessageSquare,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  User,
  GraduationCap,
  School,
  Send,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/")({
  component: EtudiantDashboard,
});

function EtudiantDashboard() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const firstName = auth?.profile?.full_name?.split(" ")[0] ?? "";

  const { data } = useQuery({
    enabled: !!uid,
    queryKey: ["etudiant-overview", uid],
    queryFn: async () => {
      const [file, docs, unread, nextRdv] = await Promise.all([
        supabase.from("student_files").select("*").eq("student_id", uid!).maybeSingle(),
        supabase.from("documents").select("id,status", { count: "exact" }).eq("student_id", uid!),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", uid!)
          .is("read_at", null),
        supabase
          .from("appointments")
          .select("scheduled_at,location,status")
          .eq("student_id", uid!)
          .eq("status", "programme")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        file: file.data,
        docs: docs.data ?? [],
        unread: unread.count ?? 0,
        nextRdv: nextRdv.data,
      };
    },
  });

  const validated = data?.docs.filter((d) => d.status === "valide").length ?? 0;
  const totalDocs = data?.docs.length ?? 0;
  const progress = data?.file?.progress ?? 0;
  const nextRdvLabel = data?.nextRdv
    ? new Date(data.nextRdv.scheduled_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <>
      <PageHeader
        eyebrow="Espace étudiant"
        title={`Bonjour ${firstName} 👋`}
        description="Voici un aperçu de l'avancement de votre dossier d'admission."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Progression" value={`${progress}%`} hint={data?.file?.status ?? "—"} icon={Sparkles} />
        <StatCard label="Documents" value={`${validated}/${totalDocs}`} hint="validés" icon={FileText} />
        <StatCard label="Messages" value={String(data?.unread ?? 0)} hint="non lus" icon={MessageSquare} />
        <StatCard label="Prochain RDV" value={nextRdvLabel} hint={data?.nextRdv?.location ?? "aucun"} icon={CalendarDays} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Prochaines étapes" description="Complétez votre dossier dans cet ordre.">
            <ol className="space-y-3">
              {[
                { label: "Compléter votre profil personnel", done: !!data?.file?.bio, to: "/etudiant/profil", icon: User },
                { label: "Remplir votre dossier", done: !!(data?.file?.target_country && data?.file?.target_level && data?.file?.target_program), to: "/etudiant/dossier", icon: FileText },
                { label: "Ajouter votre parcours scolaire", done: totalDocs > 0, to: "/etudiant/parcours", icon: GraduationCap },
                { label: "Téléverser vos documents", done: totalDocs > 0, to: "/etudiant/documents", icon: FileText },
                { label: "Choisir des formations", done: false, to: "/etudiant/ecoles", icon: School },
                { label: "Rédiger vos lettres de motivation", done: false, to: "/etudiant/candidatures", icon: Send },
                { label: "Échanger avec votre conseiller", done: false, to: "/etudiant/messages", icon: MessageSquare },
                { label: "Confirmer un rendez-vous", done: !!data?.nextRdv, to: "/etudiant/rendez-vous", icon: CalendarDays },
              ].map((step) => (
                <li key={step.label}>
                  <Link
                    to={step.to}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div
                      className={`grid size-8 place-items-center rounded-lg ${
                        step.done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div className="flex-1 text-sm">{step.label}</div>
                    <span className="text-xs text-muted-foreground">
                      {step.done ? "Fait" : "À faire"}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <Panel title="Votre conseiller">
          <div className="flex items-center gap-3">
            <div
              className="grid size-12 place-items-center rounded-full text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              RC
            </div>
            <div>
              <div className="font-medium">{data?.file?.advisor_id ? "Assigné" : "À assigner"}</div>
              <div className="text-xs text-muted-foreground">
                {data?.file?.advisor_id
                  ? "Votre conseiller suit votre dossier."
                  : "Un conseiller vous sera attribué bientôt."}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
