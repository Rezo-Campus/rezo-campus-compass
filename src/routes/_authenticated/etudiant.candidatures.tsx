import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Send, Trash2, AlertCircle, CheckCircle2, School, Clock,
  ShieldCheck, Award, Lock, LockOpen, FileText, GraduationCap, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const CHECKLIST = [
  "Je certifie sur l'honneur que toutes les informations saisies dans mon profil et mon parcours sont exactes et sincères.",
  "J'ai téléversé ma pièce d'identité en cours de validité dans mon profil.",
  "J'ai ajouté l'ensemble de mes diplômes obtenus ou en cours d'obtention dans Parcours & Documents.",
  "J'ai joint les justificatifs pour mes diplômes (relevés de notes, attestations, etc.).",
  "Je comprends que mon dossier sera verrouillé après transmission et que toute modification devra être autorisée par mon conseiller Rézo Campus.",
];

export const Route = createFileRoute("/_authenticated/etudiant/candidatures")({
  component: EtudiantCandidatures,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const STATUS_COLORS: Record<string, string> = {
  selection: "bg-yellow-100 text-yellow-700",
  soumis:    "bg-blue-100 text-blue-700",
  valide:    "bg-green-100 text-green-700",
  accepte:   "bg-emerald-100 text-emerald-700",
  refuse:    "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  selection: "En sélection",
  soumis:    "Soumis",
  valide:    "Validé",
  accepte:   "Accepté",
  refuse:    "Refusé",
};

type Application = {
  id: string;
  student_id: string;
  program_id: string;
  school_id: string;
  status: string;
  motivation_letter: string | null;
  ecole_validated_at: string | null;
  created_at: string;
  program?: { id: string; name: string; level: string | null; domain: string | null } | null;
  school?: { id: string; name: string; logo_url: string | null } | null;
};

function EtudiantCandidatures() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [letters, setLetters]             = useState<Record<string, string>>({});
  const [saving, setSaving]               = useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checks, setChecks]               = useState<boolean[]>(Array(CHECKLIST.length).fill(false));

  /* ── Statut dossier (retry:false = pas de retentatives si colonnes absentes) ── */
  const { data: profile } = useQuery({
    enabled: !!uid,
    queryKey: ["profile-dossier", uid],
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await db
          .from("profiles")
          .select("dossier_submitted_at, dossier_can_edit")
          .eq("id", uid)
          .single();
        if (error) return null;
        return data as { dossier_submitted_at: string | null; dossier_can_edit: boolean } | null;
      } catch {
        return null;
      }
    },
  });

  /* ── Mutation : soumettre le dossier académique ── */
  const transmettreMonDossier = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("profiles")
        .update({ dossier_submitted_at: new Date().toISOString(), dossier_can_edit: false })
        .eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dossier transmis avec succès !");
      qc.invalidateQueries({ queryKey: ["profile-dossier", uid] });
      qc.invalidateQueries({ queryKey: ["etudiant-overview", uid] });
      setShowChecklist(false);
      setChecks(Array(CHECKLIST.length).fill(false));
    },
    onError: (e: Error) => toast.error("Erreur lors de la transmission", { description: e.message }),
  });

  const { data: applications = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["my-candidatures", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_applications")
        .select("*")
        .eq("student_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const programIds = [...new Set(data.map((a) => a.program_id))];
      const schoolIds  = [...new Set(data.map((a) => a.school_id))];

      const [programs, schools] = await Promise.all([
        programIds.length
          ? supabase.from("school_programs").select("id, name, level, domain").in("id", programIds)
          : { data: [] },
        schoolIds.length
          ? supabase.from("schools").select("id, name, logo_url").in("id", schoolIds)
          : { data: [] },
      ]);

      const result: Application[] = data.map((a) => ({
        ...a,
        program: (programs.data ?? []).find((p) => p.id === a.program_id) ?? null,
        school:  (schools.data  ?? []).find((s) => s.id === a.school_id)  ?? null,
      }));

      const initialLetters: Record<string, string> = {};
      result.forEach((a) => { initialLetters[a.id] = a.motivation_letter ?? ""; });
      setLetters((prev) => ({ ...initialLetters, ...prev }));

      return result;
    },
  });

  const removeApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidature retirée");
      qc.invalidateQueries({ queryKey: ["my-candidatures", uid] });
      qc.invalidateQueries({ queryKey: ["my-applications", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const submitDossier = useMutation({
    mutationFn: async () => {
      const ids = draftApps.map((a) => a.id);
      const { error } = await supabase
        .from("student_applications")
        .update({ status: "soumis" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidatures soumises au conseiller !");
      qc.invalidateQueries({ queryKey: ["my-candidatures", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function saveLetter(appId: string) {
    setSaving((s) => ({ ...s, [appId]: true }));
    try {
      const { error } = await supabase
        .from("student_applications")
        .update({ motivation_letter: letters[appId] || null })
        .eq("id", appId);
      if (error) throw error;
      toast.success("Lettre de motivation enregistrée");
      qc.invalidateQueries({ queryKey: ["my-candidatures", uid] });
    } catch (e: unknown) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally {
      setSaving((s) => ({ ...s, [appId]: false }));
    }
  }

  const draftApps      = applications.filter((a) => a.status === "selection");
  const submittedApps  = applications.filter((a) => a.status !== "selection");
  const missingLetters = draftApps.filter((a) => !a.motivation_letter).length;

  const isDossierSubmitted = !!profile?.dossier_submitted_at;
  const isDossierLocked    = isDossierSubmitted && profile?.dossier_can_edit === false;
  const submittedAt        = profile?.dossier_submitted_at
    ? new Date(profile.dossier_submitted_at).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Mes candidatures"
        title="Panier de formations"
        description="Gérez vos candidatures et suivez l'état de votre dossier."
      />

      {/* ══ Bloc suivi dossier ══ */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suivi de votre dossier
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 px-5 py-4">
          <DossierStep
            icon={isDossierSubmitted ? CheckCircle2 : FileText}
            done={isDossierSubmitted}
            label="Dossier transmis"
            detail={isDossierSubmitted ? `Transmis le ${submittedAt}` : "Non encore transmis"}
            neutral={!isDossierSubmitted}
          />
          <DossierStep
            icon={isDossierLocked ? Lock : LockOpen}
            done={isDossierSubmitted}
            label={isDossierLocked ? "Accès verrouillé" : isDossierSubmitted ? "Modification autorisée" : "En attente"}
            detail={
              isDossierLocked
                ? "Aucune modification sans accord du conseiller"
                : isDossierSubmitted
                ? "Votre conseiller vous a rouvert l'accès"
                : "Transmettez d'abord votre dossier"
            }
            neutral={!isDossierSubmitted}
          />
          <DossierStep
            icon={GraduationCap}
            done={submittedApps.length > 0}
            label="Candidatures soumises"
            detail={
              submittedApps.length > 0
                ? `${submittedApps.length} candidature${submittedApps.length > 1 ? "s" : ""} en examen`
                : "Aucune candidature soumise"
            }
            neutral={submittedApps.length === 0}
          />
          {submittedApps.some((a) => a.ecole_validated_at) && (
            <DossierStep
              icon={Award}
              done={true}
              label="Admission confirmée"
              detail={`${submittedApps.filter((a) => a.ecole_validated_at).length} établissement(s) ont confirmé votre admission`}
            />
          )}
        </div>
        {/* Bouton de transmission ou bannière locked */}
        <div className="border-t border-border px-5 py-4">
          {isDossierLocked ? (
            <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Lock className="size-4 shrink-0" />
              Dossier verrouillé. Contactez votre conseiller pour apporter des corrections.
            </p>
          ) : isDossierSubmitted ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <LockOpen className="size-4 shrink-0" />
                Votre conseiller vous a rouvert l'accès. Retransmettez votre dossier après corrections.
              </p>
              <Button
                size="sm"
                onClick={() => { setChecks(Array(CHECKLIST.length).fill(false)); setShowChecklist(true); }}
              >
                <Send className="mr-2 size-4" /> Retransmettre mon dossier
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Complétez votre{" "}
                <Link to="/etudiant/parcours" className="font-medium text-primary underline underline-offset-2">
                  parcours &amp; documents
                </Link>
                , puis transmettez votre dossier.
              </p>
              <Button
                size="sm"
                onClick={() => { setChecks(Array(CHECKLIST.length).fill(false)); setShowChecklist(true); }}
              >
                <Send className="mr-2 size-4" /> Transmettre mon dossier
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ══ Banner soumission candidatures ══ */}
      {draftApps.length > 0 && (
        <div className={`mb-6 rounded-xl border p-4 ${
          missingLetters > 0 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            {missingLetters > 0 ? (
              <AlertCircle className="size-5 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="size-5 shrink-0 text-green-600" />
            )}
            <div className="flex-1">
              {missingLetters > 0 ? (
                <p className="text-sm font-medium text-amber-800">
                  Il vous reste <strong>{missingLetters} lettre{missingLetters > 1 ? "s" : ""}</strong> à rédiger avant de soumettre.
                </p>
              ) : (
                <p className="text-sm font-medium text-green-800">
                  Toutes vos lettres sont rédigées. Votre dossier est prêt à être soumis.
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {draftApps.length} candidature{draftApps.length > 1 ? "s" : ""} en brouillon
              </p>
            </div>
            <Button
              size="sm"
              disabled={missingLetters > 0 || submitDossier.isPending}
              onClick={() => submitDossier.mutate()}
              className="shrink-0"
            >
              {submitDossier.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Soumettre mes candidatures
            </Button>
          </div>
        </div>
      )}

      {submittedApps.length > 0 && draftApps.length === 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4">
          <Clock className="size-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Vos candidatures sont en cours d'examen par votre conseiller.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Le conseiller validera vos candidatures avant de les transmettre aux établissements.
            </p>
          </div>
        </div>
      )}

      {/* ══ Liste candidatures ══ */}
      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <School className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Votre panier est vide.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Parcourez les établissements et ajoutez des formations à vos candidatures.
          </p>
          <Link to="/etudiant/ecoles">
            <Button className="mt-4" size="sm">Explorer les écoles</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const letterDraft = letters[app.id] ?? "";
            const hasLetter   = !!app.motivation_letter;
            const isDirty     = letterDraft !== (app.motivation_letter ?? "");
            const isSubmitted = app.status !== "selection";

            return (
              <div key={app.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  {app.school?.logo_url ? (
                    <img
                      src={app.school.logo_url}
                      alt={app.school.name}
                      className="size-12 rounded-lg object-contain border border-border bg-white p-1 shrink-0"
                    />
                  ) : (
                    <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary border border-border shrink-0">
                      <School className="size-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{app.program?.name ?? "Formation"}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[app.status] ?? "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABELS[app.status] ?? app.status}
                      </span>
                      {app.status === "valide" && (
                        <span className="flex items-center gap-1 text-[10px] text-green-700">
                          <ShieldCheck className="size-3" /> Transmis à l'école
                        </span>
                      )}
                      {app.ecole_validated_at && (
                        <a
                          href={`/etudiant/attestation/${app.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-700 transition"
                        >
                          <Award className="size-3" /> Attestation disponible
                        </a>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                      {app.school?.name    && <span>{app.school.name}</span>}
                      {app.program?.level  && <span>{app.program.level}</span>}
                      {app.program?.domain && <span>{app.program.domain}</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      Ajoutée le {new Date(app.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  {/* Suppression possible sauf si l'école a déjà validé (attestation émise) */}
                  {!app.ecole_validated_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setPendingDeleteId(app.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                {/* Lettre de motivation */}
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Lettre de motivation
                      {!hasLetter && !isSubmitted && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                          À rédiger
                        </span>
                      )}
                    </p>
                    {hasLetter && !isDirty && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="size-3" /> Rédigée
                      </span>
                    )}
                  </div>
                  <Textarea
                    rows={isSubmitted ? 4 : 6}
                    value={letterDraft}
                    onChange={(e) =>
                      !isSubmitted && setLetters((prev) => ({ ...prev, [app.id]: e.target.value }))
                    }
                    readOnly={isSubmitted}
                    placeholder={isSubmitted ? "—" : "Rédigez votre lettre de motivation pour cette formation..."}
                    className={
                      isSubmitted
                        ? "resize-none bg-muted/30 text-muted-foreground"
                        : !hasLetter && !letterDraft
                        ? "border-amber-300 focus-visible:ring-amber-400"
                        : ""
                    }
                  />
                  {!isSubmitted && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        disabled={!isDirty || saving[app.id]}
                        onClick={() => saveLetter(app.id)}
                      >
                        {saving[app.id] ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 size-4" />
                        )}
                        Enregistrer la lettre
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Retirer cette candidature ?"
        description={
          applications.find((a) => a.id === pendingDeleteId)?.status !== "selection"
            ? "Cette candidature a déjà été soumise. La supprimer retirera votre dossier de cet établissement."
            : "La candidature sera définitivement supprimée de votre dossier."
        }
        confirmLabel="Retirer"
        onConfirm={() => {
          if (pendingDeleteId) removeApplication.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={removeApplication.isPending}
      />

      {/* ══ Modal checklist de transmission ══ */}
      <Dialog open={showChecklist} onOpenChange={(o) => { if (!o) setShowChecklist(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-primary" /> Transmission du dossier
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="mb-4 text-sm text-muted-foreground">
              Avant de transmettre votre dossier, confirmez chacun des points suivants :
            </p>
            <div className="space-y-3">
              {CHECKLIST.map((item, idx) => (
                <label
                  key={idx}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    checked={checks[idx]}
                    onChange={(e) => {
                      const next = [...checks];
                      next[idx] = e.target.checked;
                      setChecks(next);
                    }}
                    className="mt-0.5 size-4 cursor-pointer accent-primary"
                  />
                  <span className="text-sm leading-snug">{item}</span>
                </label>
              ))}
            </div>
            {!checks.every(Boolean) && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
                <AlertCircle className="size-3.5" />
                Cochez toutes les cases pour pouvoir transmettre votre dossier.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChecklist(false)}>Annuler</Button>
            <Button
              disabled={!checks.every(Boolean) || transmettreMonDossier.isPending}
              onClick={() => transmettreMonDossier.mutate()}
            >
              {transmettreMonDossier.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmer la transmission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Étape du suivi de dossier ── */
function DossierStep({
  icon: Icon, done, label, detail, neutral = false,
}: {
  icon: React.ElementType;
  done: boolean;
  label: string;
  detail: string;
  neutral?: boolean;
}) {
  const color = neutral ? "bg-muted text-muted-foreground"
    : done ? "bg-green-100 text-green-600"
    : "bg-muted text-muted-foreground";

  return (
    <div className="flex items-start gap-3 min-w-[180px]">
      <div className={`grid size-9 shrink-0 place-items-center rounded-full ${color}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className={`text-sm font-semibold leading-tight ${done && !neutral ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{detail}</p>
      </div>
    </div>
  );
}
