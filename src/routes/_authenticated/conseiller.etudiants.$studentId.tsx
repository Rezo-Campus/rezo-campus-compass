import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, ArrowLeft, GraduationCap, Mail, Phone, FileText, Download,
  CheckCircle2, Circle, School, Send, MessageSquare, User,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conseiller/etudiants/$studentId")({
  component: ConseillerStudentDetail,
});

const DOC_TYPE_LABELS: Record<string, string> = {
  identite: "Pièce d'identité",
  diplome: "Diplôme",
  releve_notes: "Relevé de notes",
  lettre_motivation: "Lettre de motivation",
  cv: "Curriculum Vitae",
  autre: "Autre document",
};

const DOC_STATUS_COLORS: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-700",
  valide: "bg-green-100 text-green-700",
  rejete: "bg-red-100 text-red-700",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  rejete: "Rejeté",
};

const APP_STATUS_COLORS: Record<string, string> = {
  selection: "bg-gray-100 text-gray-700",
  soumis: "bg-blue-100 text-blue-700",
  valide: "bg-green-100 text-green-700",
  accepte: "bg-emerald-100 text-emerald-700",
  refuse: "bg-red-100 text-red-700",
};

const APP_STATUS_LABELS: Record<string, string> = {
  selection: "En sélection",
  soumis: "Soumis",
  valide: "Validé",
  accepte: "Accepté",
  refuse: "Refusé",
};

function ConseillerStudentDetail() {
  const { studentId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["conseiller-student-detail", studentId],
    queryFn: async () => {
      const [profileRes, fileRes, docsRes, appsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, photo_url")
          .eq("id", studentId)
          .single(),
        supabase
          .from("student_files")
          .select("*")
          .eq("student_id", studentId)
          .maybeSingle(),
        supabase
          .from("documents")
          .select("*")
          .eq("student_id", studentId)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("student_applications")
          .select("*, school:school_id(name), program:program_id(name, level, domain)")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (docsRes.error) throw docsRes.error;
      if (appsRes.error) throw appsRes.error;

      return {
        profile: profileRes.data,
        file: fileRes.data,
        docs: docsRes.data ?? [],
        apps: appsRes.data ?? [],
      };
    },
  });

  async function downloadDoc(path: string) {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 3600);
    if (error || !data) { toast.error("Lien indisponible"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const { profile, file, docs, apps } = data ?? { profile: null, file: null, docs: [], apps: [] };

  const hasSchoolDiploma = docs.some((d) => ["diplome", "releve_notes"].includes(d.type));
  const hasAdminDocs = docs.length > 0;
  const hasApplications = apps.length > 0;
  const hasLetter = apps.some((a) => !!a.motivation_letter);
  const isSubmitted = apps.some((a) => a.status !== "selection");

  const steps = [
    {
      label: "Profil personnel complété",
      done: !!profile?.full_name && !!profile?.phone,
      detail: !profile?.full_name ? "Nom complet manquant" : !profile?.phone ? "Téléphone manquant" : null,
    },
    {
      label: "Projet d'études renseigné",
      done: !!(file?.target_country && file?.target_level && file?.target_program),
      detail: "Pays, niveau et formation cible",
    },
    {
      label: "Parcours scolaire ajouté",
      done: hasSchoolDiploma,
      detail: "Diplôme ou relevé de notes",
    },
    {
      label: "Documents administratifs téléversés",
      done: hasAdminDocs,
      detail: "Pièce d'identité, CV, etc.",
    },
    {
      label: "École et formation choisies",
      done: hasApplications,
      detail: "Au moins une candidature créée",
    },
    {
      label: "Lettre de motivation rédigée",
      done: hasLetter,
      detail: null,
    },
    {
      label: "Dossier soumis pour examen",
      done: isSubmitted,
      detail: null,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <Link to="/conseiller/etudiants" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="size-4" /> Retour à tous les dossiers
      </Link>

      <PageHeader
        eyebrow="Dossier étudiant"
        title={profile?.full_name || profile?.email || "Étudiant"}
        description="Vue complète du profil et de l'avancement du dossier."
      />

      {/* En-tête profil */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
        {profile?.photo_url ? (
          <img
            src={profile.photo_url}
            alt={profile.full_name ?? ""}
            className="size-16 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-primary border border-border">
            <User className="size-7" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold">{profile?.full_name || "—"}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
            {profile?.email && (
              <span className="flex items-center gap-1"><Mail className="size-3.5" /> {profile.email}</span>
            )}
            {profile?.phone && (
              <span className="flex items-center gap-1"><Phone className="size-3.5" /> {profile.phone}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
            {file?.status?.replace("_", " ") ?? "nouveau"}
          </span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${file?.progress ?? 0}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{file?.progress ?? 0}%</span>
          </div>
        </div>
        <Link to="/conseiller/messages">
          <Button size="sm" variant="outline" className="gap-1.5">
            <MessageSquare className="size-3.5" /> Message
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checklist d'avancement */}
        <div className="lg:col-span-1">
          <Panel title={`Avancement (${doneCount}/${steps.length})`} description="Ce qui est fait et ce qu'il reste à faire.">
            <ol className="space-y-2">
              {steps.map((s) => (
                <li
                  key={s.label}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    s.done ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                  }`}
                >
                  <div className={`grid size-7 shrink-0 place-items-center rounded-full ${
                    s.done ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                  }`}>
                    {s.done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${s.done ? "text-green-800" : "text-red-700"}`}>
                      {s.label}
                    </div>
                    {!s.done && s.detail && (
                      <div className="text-xs text-red-500 mt-0.5">{s.detail}</div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Candidatures */}
          <Panel title={`Candidatures (${apps.length})`} description="Écoles et formations choisies par l'étudiant.">
            {apps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                <School className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                Aucune école ni formation choisie pour le moment.
              </div>
            ) : (
              <ul className="space-y-3">
                {apps.map((a) => (
                  <li key={a.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">
                          {(a.program as { name?: string } | null)?.name ?? "—"}
                          {(a.program as { level?: string } | null)?.level && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              · {(a.program as { level?: string }).level}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {(a.school as { name?: string } | null)?.name ?? "—"}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${APP_STATUS_COLORS[a.status] ?? "bg-muted"}`}>
                        {APP_STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      {a.motivation_letter ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="size-3" /> Lettre de motivation rédigée
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Circle className="size-3" /> Lettre de motivation non rédigée
                        </span>
                      )}
                    </div>
                    {a.motivation_letter && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed line-clamp-4">
                        {a.motivation_letter}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Documents */}
          <Panel title={`Documents (${docs.length})`} description="Pièces administratives et parcours scolaire.">
            {docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                Aucun document téléversé pour le moment.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[d.type] ?? d.type}
                        {" · "}{new Date(d.uploaded_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${DOC_STATUS_COLORS[d.status] ?? "bg-muted"}`}>
                      {DOC_STATUS_LABELS[d.status] ?? d.status}
                    </span>
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={() => downloadDoc(d.storage_path)}>
                      <Download className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Projet d'études */}
          <Panel title="Projet d'études">
            {!file?.target_country && !file?.target_level && !file?.target_program && !file?.bio ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                <Send className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                L'étudiant n'a pas encore renseigné son projet d'études.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pays visé" value={file?.target_country} />
                <Field label="Niveau visé" value={file?.target_level} />
                <Field label="Formation visée" value={file?.target_program} className="sm:col-span-2" />
                {file?.bio && (
                  <div className="sm:col-span-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Présentation</div>
                    <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{file.bio}</p>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      {value ? (
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">{value}</div>
      ) : (
        <div className="rounded-lg border border-dashed border-red-200 bg-red-50/50 px-3 py-2 text-sm text-red-500">
          Non renseigné
        </div>
      )}
    </div>
  );
}
