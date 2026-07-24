import { createFileRoute, Link, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Loader2, ArrowLeft, GraduationCap, Mail, Phone, FileText, Download,
  CheckCircle2, Circle, School, Send, MessageSquare, User, StickyNote,
  Upload, Trash2, Lock, LockOpen, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_DOC_TYPES: { value: string; label: string }[] = [
  { value: "prise_en_charge", label: "Prise en charge" },
  { value: "aevm", label: "AEVM" },
  { value: "attestation_hebergement", label: "Attestation d'hébergement" },
  { value: "bulletin_salaire", label: "Bulletin de salaire" },
  { value: "carte_sejour", label: "Carte de séjour" },
  { value: "autre", label: "Autre document" },
];

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function ConseillerStudentDetail() {
  const { studentId } = useParams({ strict: false }) as { studentId: string };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = pathname.startsWith("/secretaire") ? "secretaire" : "conseiller";
  const { data: authData } = useAuth();
  const uid = authData?.user?.id ?? "";
  const qc = useQueryClient();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [fraisState, setFraisState] = useState<Record<string, boolean>>({});
  const [selectedAdminDocType, setSelectedAdminDocType] = useState("prise_en_charge");
  const [uploadingAdminDoc, setUploadingAdminDoc] = useState(false);
  const adminDocInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["conseiller-student-detail", studentId],
    queryFn: async () => {
      const [profileRes, fileRes, docsRes, appsRes, recordsRes] = await Promise.all([
        db
          .from("profiles")
          .select("id, full_name, email, phone, photo_url, dossier_submitted_at, dossier_can_edit")
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
        db
          .from("academic_records")
          .select("id")
          .eq("student_id", studentId),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (docsRes.error) throw docsRes.error;
      if (appsRes.error) throw appsRes.error;

      return {
        profile: profileRes.data,
        file: fileRes.data,
        docs: docsRes.data ?? [],
        apps: appsRes.data ?? [],
        records: recordsRes.data ?? [],
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

  const saveFrais = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("student_applications")
        .update({ frais_inscription_recus: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut des frais mis à jour");
      qc.invalidateQueries({ queryKey: ["conseiller-student-detail", studentId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const saveNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from("student_applications")
        .update({ notes_to_school: note || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note enregistrée");
      qc.invalidateQueries({ queryKey: ["conseiller-student-detail", studentId] });
      setEditingNoteId(null);
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const unlockDossier = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("profiles")
        .update({ dossier_can_edit: true, dossier_unlocked_by: uid })
        .eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("L'étudiant peut de nouveau modifier son dossier");
      qc.invalidateQueries({ queryKey: ["conseiller-student-detail", studentId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const lockDossier = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("profiles")
        .update({ dossier_can_edit: false })
        .eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dossier verrouillé");
      qc.invalidateQueries({ queryKey: ["conseiller-student-detail", studentId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const { data: adminDocs = [] } = useQuery({
    enabled: !!studentId,
    queryKey: ["admin-docs", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("official_documents")
        .select("*")
        .eq("student_id", studentId)
        .eq("source", "admin")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const deleteAdminDoc = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from("student-documents").remove([path]);
      const { error } = await supabase.from("official_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document supprimé");
      qc.invalidateQueries({ queryKey: ["admin-docs", studentId] });
    },
  });

  async function uploadAdminDoc(file: File, uid: string) {
    setUploadingAdminDoc(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `admin-docs/${studentId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("student-documents").upload(path, file);
      if (upErr) throw upErr;

      const typeLabel = ADMIN_DOC_TYPES.find((t) => t.value === selectedAdminDocType)?.label ?? selectedAdminDocType;
      const { error } = await supabase.from("official_documents").insert({
        student_id: studentId,
        uploaded_by: uid,
        source: "admin",
        type: selectedAdminDocType,
        name: `${typeLabel} — ${file.name}`,
        storage_path: path,
      });
      if (error) throw error;

      // Notifier l'étudiant
      await supabase.from("notifications").insert({
        user_id: studentId,
        title: "Nouveau document disponible",
        body: `${typeLabel} a été ajouté à votre dossier par Rézo Campus. Vous pouvez le télécharger depuis votre espace.`,
        data: { type: "admin_doc" },
      });

      toast.success("Document ajouté et étudiant notifié");
      qc.invalidateQueries({ queryKey: ["admin-docs", studentId] });
    } catch (e: unknown) {
      toast.error("Erreur lors de l'upload", { description: (e as Error).message });
    } finally {
      setUploadingAdminDoc(false);
    }
  }

  async function downloadAdminDoc(path: string) {
    const { data: urlData, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 3600);
    if (error || !urlData) { toast.error("Lien indisponible"); return; }
    window.open(urlData.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const { profile, file, docs, apps, records } = data ?? { profile: null, file: null, docs: [], apps: [], records: [] };

  const hasSchoolDiploma = (records ?? []).length > 0 || docs.some((d) => ["diplome", "releve_notes"].includes(d.type));
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
      detail: hasSchoolDiploma ? null : "Aucun diplôme dans le parcours scolaire",
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
      <Link to={`/${section}/etudiants` as "/conseiller/etudiants"} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
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
        <Link to={`/${section}/messages` as "/conseiller/messages"}>
          <Button size="sm" variant="outline" className="gap-1.5">
            <MessageSquare className="size-3.5" /> Message
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checklist d'avancement */}
        <div className="lg:col-span-1 space-y-6">
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

          {/* ── Contrôle dossier ── */}
          {(profile as any)?.dossier_submitted_at ? (
            <Panel
              title="Dossier académique"
              description="Gérez l'accès de l'étudiant à son dossier."
            >
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    Transmis le{" "}
                    {new Date((profile as any).dossier_submitted_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {(profile as any).dossier_can_edit === false ? (
                      <>
                        <Lock className="size-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700">Verrouillé</span>
                      </>
                    ) : (
                      <>
                        <LockOpen className="size-4 text-blue-500" />
                        <span className="text-xs font-medium text-blue-700">Modification autorisée</span>
                      </>
                    )}
                  </div>
                </div>

                {(profile as any).dossier_can_edit === false ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    disabled={unlockDossier.isPending}
                    onClick={() => unlockDossier.mutate()}
                  >
                    {unlockDossier.isPending
                      ? <Loader2 className="size-4 animate-spin" />
                      : <LockOpen className="size-4" />}
                    Permettre la modification
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    disabled={lockDossier.isPending}
                    onClick={() => lockDossier.mutate()}
                  >
                    {lockDossier.isPending
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Lock className="size-4" />}
                    Reverrouiller le dossier
                  </Button>
                )}
              </div>
            </Panel>
          ) : (
            <Panel title="Dossier académique" description="L'étudiant n'a pas encore transmis son dossier.">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4 text-muted-foreground/50" />
                Aucune soumission
              </div>
            </Panel>
          )}
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

                    {/* Checkbox frais d'inscription */}
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <input
                        type="checkbox"
                        id={`frais-${a.id}`}
                        checked={
                          fraisState[a.id] !== undefined
                            ? fraisState[a.id]
                            : !!(a as { frais_inscription_recus?: boolean }).frais_inscription_recus
                        }
                        onChange={(e) => {
                          const val = e.target.checked;
                          setFraisState((prev) => ({ ...prev, [a.id]: val }));
                          saveFrais.mutate({ id: a.id, value: val });
                        }}
                        className="size-4 cursor-pointer rounded border-border accent-primary"
                      />
                      <label htmlFor={`frais-${a.id}`} className="cursor-pointer select-none text-sm text-muted-foreground">
                        Frais d'inscription reçus par Rézo Campus
                      </label>
                      {!!(a as { frais_inscription_recus?: boolean }).frais_inscription_recus && (
                        <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Confirmé
                        </span>
                      )}
                    </div>

                    {/* Note à transmettre à l'établissement */}
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                        <StickyNote className="size-3.5" /> Note pour l'établissement
                      </div>
                      {editingNoteId === a.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Ex. : Veuillez ne pas considérer le document X — le passeport est en cours de renouvellement — les frais ont été réglés..."
                            className="text-xs min-h-[80px]"
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)}>
                              Annuler
                            </Button>
                            <Button
                              size="sm"
                              disabled={saveNote.isPending}
                              onClick={() => saveNote.mutate({ id: a.id, note: noteText })}
                            >
                              {saveNote.isPending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
                              Enregistrer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {(a as { notes_to_school?: string | null }).notes_to_school ? (
                            <p className="mb-2 text-xs text-amber-900 whitespace-pre-wrap">
                              {(a as { notes_to_school?: string | null }).notes_to_school}
                            </p>
                          ) : (
                            <p className="mb-2 text-xs text-amber-600/60 italic">
                              Aucune note — visible par l'établissement dans son espace.
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                            onClick={() => {
                              setNoteText((a as { notes_to_school?: string | null }).notes_to_school ?? "");
                              setEditingNoteId(a.id);
                            }}
                          >
                            <StickyNote className="mr-1 size-3" />
                            {(a as { notes_to_school?: string | null }).notes_to_school ? "Modifier la note" : "Ajouter une note"}
                          </Button>
                        </div>
                      )}
                    </div>
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

          {/* Documents officiels admin → étudiant */}
          <Panel title="Documents officiels à transmettre" description="Prise en charge, AEVM, hébergement, salaire, carte de séjour…">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Select value={selectedAdminDocType} onValueChange={setSelectedAdminDocType}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={adminDocInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAdminDoc(file, uid);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => adminDocInputRef.current?.click()}
                disabled={uploadingAdminDoc}
              >
                {uploadingAdminDoc ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                Téléverser
              </Button>
            </div>
            {adminDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun document transmis pour l'instant.</p>
            ) : (
              <ul className="space-y-1.5">
                {adminDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => downloadAdminDoc(d.storage_path)}>
                      <Download className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteAdminDoc.mutate({ id: d.id, path: d.storage_path })}
                    >
                      <Trash2 className="size-3.5" />
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
