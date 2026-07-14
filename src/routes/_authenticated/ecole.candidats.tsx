import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, GraduationCap, School, ChevronDown, ChevronRight,
  FileText, Download, User, Phone, Mail, CheckCircle2, Clock,
  ShieldCheck, AlertTriangle, ExternalLink, StickyNote,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  identite: "Pièce d'identité / Passeport",
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

// Required doc types for validation
const REQUIRED_TYPES = ["diplome", "identite"];

const DIPLOMA_LABELS: Record<string, string> = {
  bac: "Baccalauréat (BAC)", bts: "BTS", dts: "DTS",
  licence_gen: "Licence Générale", licence_pro: "Licence Professionnelle",
  master_pro: "Master Professionnel", master_rec: "Master Recherche",
  master_sp: "Master Spécialisé", deug: "DEUG / DEUST",
  doctorat: "Doctorat", autre: "Autre diplôme",
};

function EcoleCandidats() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const db = supabase as any;
  const schoolId = auth?.profile?.school_id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

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
      const [docsRes, recordsRes] = await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .eq("student_id", expandedStudentId!)
          .order("uploaded_at", { ascending: false }),
        db
          .from("academic_records")
          .select("*")
          .eq("student_id", expandedStudentId!)
          .order("year", { ascending: false }),
      ]);
      return {
        docs: docsRes.data ?? [],
        records: recordsRes.data ?? [],
      };
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

  const validateCandidature = useMutation({
    mutationFn: async ({ applicationId, studentName, programName }: {
      applicationId: string;
      studentName: string;
      programName: string;
    }) => {
      // 1. Valider la candidature
      const { data: updated, error } = await supabase
        .from("student_applications")
        .update({ ecole_validated_at: new Date().toISOString() })
        .eq("id", applicationId)
        .select("student_id");
      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error("Validation bloquée. Vérifiez les politiques RLS dans Supabase.");
      }
      const studentId = updated[0].student_id;

      // 2. Récupérer le nom de l'école
      const { data: schoolData } = await supabase
        .from("schools")
        .select("name")
        .eq("id", schoolId!)
        .single();
      const schoolName = schoolData?.name ?? "l'établissement";

      // 3. Récupérer tous les admin + conseiller
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "conseiller"]);
      const staffIds = [...new Set((staffRoles ?? []).map((r) => r.user_id))];

      // 4. Créer les notifications
      const staffNotifs = staffIds.map((uid) => ({
        user_id: uid,
        title: `Dossier validé par ${schoolName}`,
        body: `${schoolName} a validé la candidature de ${studentName} pour « ${programName} ». Veuillez faire signer le document de validation chez Rézo Campus.`,
        data: { applicationId, type: "ecole_validation" } as { [k: string]: string },
      }));

      const studentNotif = {
        user_id: studentId,
        title: `🎉 Félicitations ! Votre candidature à ${schoolName} a été validée`,
        body: `Votre dossier pour « ${programName} » a été accepté par ${schoolName}. Votre attestation de validation est disponible. Rendez-vous chez Rézo Campus pour signer votre document de validation.`,
        data: { applicationId, type: "ecole_validation_student" } as { [k: string]: string },
      };

      const allNotifs = [...staffNotifs, studentNotif];
      if (allNotifs.length) {
        await supabase.from("notifications").insert(allNotifs);
      }
    },
    onSuccess: () => {
      toast.success("Candidature validée — l'attestation est maintenant disponible.");
      qc.invalidateQueries({ queryKey: ["ecole-all-applications", schoolId] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setValidatingId(null);
    },
    onError: (e: Error) => toast.error("Erreur de validation", { description: e.message }),
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

  // Check required docs for a student (diplôme = document table OU academic_records)
  function getDocCheck(docs: { type: string }[], records: unknown[]) {
    const hasDiplome = records.length > 0 || docs.some((d) => ["diplome", "releve_notes"].includes(d.type));
    const hasIdentite = docs.some((d) => d.type === "identite");
    return { hasDiplome, hasIdentite, ok: hasDiplome && hasIdentite };
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

  const validatingApp = validatingId ? apps.find((a) => a.id === validatingId) : null;
  const validatingDocs = validatingApp && expandedId === validatingId ? (studentDossier?.docs ?? []) : [];
  const validatingRecords = validatingApp && expandedId === validatingId ? (studentDossier?.records ?? []) : [];
  const docCheck = (validatingDocs.length > 0 || validatingRecords.length > 0)
    ? getDocCheck(validatingDocs, validatingRecords)
    : null;

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
              const docs = isExpanded ? (studentDossier?.docs ?? []) : [];
              const records = isExpanded ? (studentDossier?.records ?? []) : [];
              const isValidated = !!(a as { ecole_validated_at?: string | null }).ecole_validated_at;
              const noteToSchool = (a as { notes_to_school?: string | null }).notes_to_school;

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
                      {/* Note du conseiller */}
                      {noteToSchool && (
                        <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                          <StickyNote className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                          <p className="text-xs text-amber-800">{noteToSchool}</p>
                        </div>
                      )}
                    </div>

                    {/* Statut + actions */}
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

                      {/* Voir l'attestation (si validée) */}
                      {isValidated && (
                        <Link
                          to={"/ecole/attestation/$applicationId" as "/ecole/attestation/$applicationId"}
                          params={{ applicationId: a.id }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
                        >
                          <ExternalLink className="size-3.5" /> Attestation
                        </Link>
                      )}

                      {/* Valider la candidature (si pas encore validée) */}
                      {!isValidated && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => {
                            setExpandedId(a.id);
                            setValidatingId(a.id);
                          }}
                        >
                          <ShieldCheck className="size-3.5" /> Valider la candidature
                        </Button>
                      )}

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
                                {docs.map((d) => {
                                  const isRequired = REQUIRED_TYPES.includes(d.type);
                                  return (
                                    <li key={d.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${isRequired ? "border-primary/30 bg-primary/5" : "border-border bg-background"}`}>
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
                                          {isRequired && (
                                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Requis</span>
                                          )}
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
                                  );
                                })}
                              </ul>
                            )}
                          </div>

                          {/* Parcours scolaire (academic_records) */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Parcours scolaire
                            </h4>
                            {records.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucun diplôme renseigné.</p>
                            ) : (
                              <ul className="space-y-2">
                                {records.map((r: any) => (
                                  <li key={r.id} className="rounded-lg border border-border bg-background p-3">
                                    <div className="flex items-start gap-3">
                                      <GraduationCap className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        {/* Type + intitulé */}
                                        <div className="text-sm font-semibold">
                                          {DIPLOMA_LABELS[r.diploma_type] ?? r.diploma_type}
                                          {r.is_in_progress && (
                                            <span className="ml-1.5 text-[10px] font-medium text-amber-600">(En cours)</span>
                                          )}
                                        </div>
                                        {r.diploma_name && (
                                          <div className="text-sm text-muted-foreground">{r.diploma_name}</div>
                                        )}
                                        {r.speciality && (
                                          <div className="text-xs text-muted-foreground italic">{r.speciality}</div>
                                        )}
                                        {r.domain && (
                                          <div className="text-xs text-muted-foreground">{r.domain}</div>
                                        )}
                                        {/* Établissement */}
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                          <span className="font-medium text-foreground uppercase">{r.school_name}</span>
                                          {r.school_city && <span>{r.school_city}</span>}
                                          {r.school_country && <span>{r.school_country}</span>}
                                          {r.year && <span>· {r.year}</span>}
                                          {r.mention && <span>· {r.mention}</span>}
                                          {r.average && <span>· Moy. {r.average}/20</span>}
                                        </div>
                                      </div>
                                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                          r.status === "valide" ? "bg-green-100 text-green-700"
                                          : r.status === "rejete" ? "bg-red-100 text-red-700"
                                          : "bg-amber-100 text-amber-700"
                                        }`}>
                                          {r.status === "valide" ? "Validé" : r.status === "rejete" ? "Rejeté" : "En attente"}
                                        </span>
                                        {r.justificatif_path && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 gap-1 px-2 text-xs"
                                            onClick={() => downloadDoc(r.justificatif_path, r.justificatif_name ?? "Relevé")}
                                          >
                                            <Download className="size-3" /> Relevé
                                          </Button>
                                        )}
                                      </div>
                                    </div>
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

                          {/* Infos personnelles */}
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

      {/* ── Dialog de confirmation de validation ── */}
      <Dialog open={!!validatingId} onOpenChange={(o) => { if (!o) setValidatingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider la candidature</DialogTitle>
          </DialogHeader>

          {validatingApp && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vous allez valider la candidature de{" "}
                <strong>{validatingApp.profile?.full_name || "cet étudiant"}</strong>{" "}
                pour la formation <strong>{validatingApp.program?.name || "sélectionnée"}</strong>.
                L'attestation de validation sera générée automatiquement.
              </p>

              {/* Vérification des documents requis */}
              {expandedId === validatingId && !dossierLoading && studentDossier && (
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Documents requis
                  </p>
                  <DocRequirement
                    label="Diplôme ou relevé de notes"
                    ok={
                      (studentDossier.records ?? []).length > 0 ||
                      (studentDossier.docs ?? []).some((d: { type: string }) => ["diplome", "releve_notes"].includes(d.type))
                    }
                  />
                  <DocRequirement
                    label="Pièce d'identité / Passeport"
                    ok={(studentDossier.docs ?? []).some((d: { type: string }) => d.type === "identite")}
                  />
                  {docCheck && !docCheck.ok && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                      <span>Les documents requis sont manquants. Vous pouvez quand même valider, mais assurez-vous d'avoir reçu ces pièces par d'autres moyens.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setValidatingId(null)}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={validateCandidature.isPending}
              onClick={() => {
                if (validatingId && validatingApp) {
                  validateCandidature.mutate({
                    applicationId: validatingId,
                    studentName: validatingApp.profile?.full_name ?? "l'étudiant",
                    programName: validatingApp.program?.name ?? "la formation",
                  });
                }
              }}
            >
              {validateCandidature.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              Confirmer la validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocRequirement({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${ok ? "text-green-700" : "text-muted-foreground"}`}>
      {ok ? (
        <CheckCircle2 className="size-4 shrink-0 text-green-500" />
      ) : (
        <Clock className="size-4 shrink-0 text-amber-400" />
      )}
      {label}
    </div>
  );
}
