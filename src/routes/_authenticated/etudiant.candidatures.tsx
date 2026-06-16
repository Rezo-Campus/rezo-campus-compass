import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Send, Trash2, AlertCircle, CheckCircle2, School, Clock, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/etudiant/candidatures")({
  component: EtudiantCandidatures,
});

const STATUS_COLORS: Record<string, string> = {
  selection: "bg-yellow-100 text-yellow-700",
  soumis: "bg-blue-100 text-blue-700",
  valide: "bg-green-100 text-green-700",
  accepte: "bg-emerald-100 text-emerald-700",
  refuse: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  selection: "En sélection",
  soumis: "Soumis",
  valide: "Validé",
  accepte: "Accepté",
  refuse: "Refusé",
};

type Application = {
  id: string;
  student_id: string;
  program_id: string;
  school_id: string;
  status: string;
  motivation_letter: string | null;
  created_at: string;
  program?: { id: string; name: string; level: string | null; domain: string | null } | null;
  school?: { id: string; name: string; logo_url: string | null } | null;
};

function EtudiantCandidatures() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [letters, setLetters] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
      const schoolIds = [...new Set(data.map((a) => a.school_id))];

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
        school: (schools.data ?? []).find((s) => s.id === a.school_id) ?? null,
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
      toast.success("Dossier soumis au conseiller !");
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

  const draftApps = applications.filter((a) => a.status === "selection");
  const submittedApps = applications.filter((a) => a.status !== "selection");
  const missingLetters = draftApps.filter((a) => !a.motivation_letter).length;
  const canSubmit = draftApps.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Mes candidatures"
        title="Panier de formations"
        description="Gérez vos candidatures et soumettez votre dossier au conseiller."
      />

      {/* Banner de soumission */}
      {draftApps.length > 0 && (
        <div className={`mb-6 rounded-xl border p-4 ${
          missingLetters > 0
            ? "border-amber-300 bg-amber-50"
            : "border-green-300 bg-green-50"
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
              <p className="text-xs text-muted-foreground mt-0.5">
                {draftApps.length} candidature{draftApps.length > 1 ? "s" : ""} en brouillon
              </p>
            </div>
            <Button
              size="sm"
              disabled={!canSubmit || missingLetters > 0 || submitDossier.isPending}
              onClick={() => submitDossier.mutate()}
              className="shrink-0"
            >
              {submitDossier.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Soumettre mon dossier
            </Button>
          </div>
        </div>
      )}

      {/* Banner dossier soumis */}
      {submittedApps.length > 0 && draftApps.length === 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4">
          <Clock className="size-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Votre dossier a été soumis et est en cours d'examen.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Le conseiller validera vos candidatures avant de les transmettre aux établissements.
            </p>
          </div>
        </div>
      )}

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
            const hasLetter = !!app.motivation_letter;
            const isDirty = letterDraft !== (app.motivation_letter ?? "");
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
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {app.school?.name}
                      {app.program?.level && ` · ${app.program.level}`}
                      {app.program?.domain && ` · ${app.program.domain}`}
                    </div>
                  </div>
                  {!isSubmitted && (
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
                    rows={6}
                    value={letterDraft}
                    onChange={(e) =>
                      setLetters((prev) => ({ ...prev, [app.id]: e.target.value }))
                    }
                    placeholder="Rédigez votre lettre de motivation pour cette formation..."
                    className={!hasLetter && !letterDraft && !isSubmitted ? "border-amber-300 focus-visible:ring-amber-400" : ""}
                  />
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
        description="La candidature sera définitivement supprimée de votre dossier."
        confirmLabel="Retirer"
        onConfirm={() => {
          if (pendingDeleteId) removeApplication.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={removeApplication.isPending}
      />
    </>
  );
}
