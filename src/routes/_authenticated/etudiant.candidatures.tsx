import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Send, Trash2, AlertCircle, CheckCircle2, School } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

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
      result.forEach((a) => {
        initialLetters[a.id] = a.motivation_letter ?? "";
      });
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

  const totalApps = applications.length;
  const missingLetters = applications.filter((a) => !a.motivation_letter).length;

  return (
    <>
      <PageHeader
        eyebrow="Mes candidatures"
        title="Panier de formations"
        description="Gérez vos candidatures et rédigez vos lettres de motivation."
      />

      {/* Counter banner */}
      {totalApps > 0 && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${
          missingLetters > 0
            ? "border-amber-300 bg-amber-50"
            : "border-green-300 bg-green-50"
        }`}>
          {missingLetters > 0 ? (
            <AlertCircle className="size-5 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="size-5 shrink-0 text-green-600" />
          )}
          <div>
            {missingLetters > 0 ? (
              <p className="text-sm font-medium text-amber-800">
                Il vous reste <strong>{missingLetters} lettre{missingLetters > 1 ? "s" : ""} de motivation</strong> à rédiger sur {totalApps} candidature{totalApps > 1 ? "s" : ""}.
              </p>
            ) : (
              <p className="text-sm font-medium text-green-800">
                Toutes vos lettres de motivation sont rédigées ! Votre dossier est complet.
              </p>
            )}
          </div>
          {missingLetters > 0 && (
            <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
              {missingLetters} restante{missingLetters > 1 ? "s" : ""}
            </span>
          )}
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
            return (
              <Panel key={app.id}>
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
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {app.school?.name}
                      {app.program?.level && ` · ${app.program.level}`}
                      {app.program?.domain && ` · ${app.program.domain}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => removeApplication.mutate(app.id)}
                    disabled={removeApplication.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Motivation letter */}
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Lettre de motivation
                      {!hasLetter && (
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
                    placeholder="Rédigez votre lettre de motivation pour cette formation. Expliquez pourquoi vous souhaitez intégrer ce programme, vos motivations et vos objectifs professionnels..."
                    className={!hasLetter && !letterDraft ? "border-amber-300 focus-visible:ring-amber-400" : ""}
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
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
