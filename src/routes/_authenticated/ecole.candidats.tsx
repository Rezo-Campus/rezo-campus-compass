import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, GraduationCap, School, ChevronDown, ChevronRight,
  FileText, Download, User, Phone, Mail, CheckCircle2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ecole/candidats")({
  component: EcoleCandidats,
});

const STATUS_OPTIONS = [
  { value: "valide", label: "Validé (reçu)" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
];

const STATUS_COLORS: Record<string, string> = {
  valide: "bg-green-100 text-green-700",
  accepte: "bg-emerald-100 text-emerald-700",
  refuse: "bg-red-100 text-red-700",
};

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

function EcoleCandidats() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const schoolId = auth?.profile?.school_id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Candidatures validées pour cette école ── */
  const { data: apps = [], isLoading } = useQuery({
    enabled: !!schoolId,
    queryKey: ["ecole-all-applications", schoolId],
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
          ? supabase
              .from("profiles")
              .select("id, full_name, email, phone, photo_url")
              .in("id", studentIds)
          : { data: [] },
        programIds.length
          ? supabase
              .from("school_programs")
              .select("id, name, level, domain")
              .in("id", programIds)
          : { data: [] },
      ]);

      return data.map((a) => ({
        ...a,
        profile: (profiles.data ?? []).find((p) => p.id === a.student_id),
        program: (programs.data ?? []).find((p) => p.id === a.program_id),
      }));
    },
  });

  /* ── Dossier complet de l'étudiant sélectionné ── */
  const expandedApp = apps.find((a) => a.id === expandedId);
  const expandedStudentId = expandedApp?.student_id ?? null;

  const { data: studentDossier, isLoading: dossierLoading } = useQuery({
    enabled: !!expandedStudentId,
    queryKey: ["ecole-dossier", expandedStudentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("student_id", expandedStudentId!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: updated, error } = await supabase
        .from("student_applications")
        .update({ status })
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error("Mise à jour bloquée. Exécutez le SQL des politiques UPDATE dans Supabase.");
      }
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["ecole-all-applications", schoolId] });
      qc.invalidateQueries({ queryKey: ["ecole-applications", schoolId] });
      qc.invalidateQueries({ queryKey: ["ecole-pending-count", schoolId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function downloadDoc(storagePath: string, name: string) {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(storagePath, 3600);
    if (error || !data) {
      toast.error("Accès refusé", { description: "Contactez l'administrateur pour activer l'accès aux documents." });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!schoolId) {
    return (
      <>
        <PageHeader eyebrow="Espace École" title="Candidatures reçues" description="" />
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <School className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun établissement affecté à votre compte.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Espace École"
        title="Candidatures reçues"
        description="Examinez les dossiers complets et gérez vos décisions d'admission."
      />

      <Panel title={`${apps.length} dossier${apps.length > 1 ? "s" : ""} reçu${apps.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : apps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun dossier validé reçu pour l'instant. Les dossiers apparaissent ici après validation par le conseiller.
          </div>
        ) : (
          <ul className="space-y-3">
            {apps.map((a) => {
              const isExpanded = expandedId === a.id;
              const docs = isExpanded ? (studentDossier ?? []) : [];
              return (
                <li key={a.id} className="rounded-xl border border-border overflow-hidden">
                  {/* ── En-tête de la candidature ── */}
                  <div className="flex flex-wrap items-center gap-4 p-4">
                    {/* Avatar */}
                    {a.profile?.photo_url ? (
                      <img
                        src={a.profile.photo_url}
                        alt={a.profile.full_name ?? ""}
                        className="size-12 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary border border-border">
                        <GraduationCap className="size-5" />
                      </div>
                    )}

                    {/* Identité + formation */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{a.profile?.full_name || "—"}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {a.profile?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3" />{a.profile.email}
                          </span>
                        )}
                        {a.profile?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" />{a.profile.phone}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{a.program?.name ?? "—"}</span>
                        {a.program?.level && <span>{a.program.level}</span>}
                        {a.program?.domain && <span>{a.program.domain}</span>}
                      </div>
                    </div>

                    {/* Statut + action */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[a.status] ?? "bg-muted text-muted-foreground"}`}>
                        {STATUS_OPTIONS.find((s) => s.value === a.status)?.label ?? a.status}
                      </span>
                      <Select
                        value={a.status}
                        onValueChange={(v) => updateStatus.mutate({ id: a.id, status: v })}
                        disabled={updateStatus.isPending}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition"
                        onClick={() => setExpandedId(isExpanded ? null : a.id)}
                      >
                        {isExpanded ? (
                          <><ChevronDown className="size-3.5" /> Masquer</>
                        ) : (
                          <><ChevronRight className="size-3.5" /> Voir le dossier</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Dossier complet ── */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 p-4 space-y-5">
                      {dossierLoading ? (
                        <Loader2 className="mx-auto size-4 animate-spin text-primary" />
                      ) : (
                        <>
                          {/* Documents uploadés */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Documents du dossier
                            </h4>
                            {docs.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucun document uploadé.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {docs.map((d) => (
                                  <li key={d.id} className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2">
                                    <FileText className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{d.name}</div>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DOC_STATUS_COLORS[d.status] ?? "bg-muted"}`}>
                                          {DOC_STATUS_LABELS[d.status] ?? d.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {DOC_TYPE_LABELS[d.type] ?? d.type}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(d.uploaded_at).toLocaleDateString("fr-FR")}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="shrink-0"
                                      onClick={() => downloadDoc(d.storage_path, d.name)}
                                    >
                                      <Download className="size-3.5" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Lettre de motivation */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Lettre de motivation
                            </h4>
                            {a.motivation_letter ? (
                              <div className="rounded-lg border border-border bg-background p-3">
                                <div className="flex items-center gap-1 mb-2 text-xs text-green-600">
                                  <CheckCircle2 className="size-3" /> Rédigée
                                </div>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                                  {a.motivation_letter}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                                <Clock className="size-3.5" /> Non rédigée
                              </div>
                            )}
                          </div>

                          {/* Infos personnelles complémentaires */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Informations personnelles
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                <User className="size-4 shrink-0 text-muted-foreground" />
                                <span>{a.profile?.full_name || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                <Mail className="size-4 shrink-0 text-muted-foreground" />
                                <span>{a.profile?.email || "—"}</span>
                              </div>
                              {a.profile?.phone && (
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                                  <span>{a.profile.phone}</span>
                                </div>
                              )}
                              {a.profile?.photo_url && (
                                <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                                  <img
                                    src={a.profile.photo_url}
                                    alt="Photo"
                                    className="size-10 rounded-full object-cover border border-border"
                                  />
                                  <span className="text-xs text-muted-foreground">Photo de profil</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
