import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Loader2, Plus, GraduationCap, MapPin, Pencil, Eye,
  Trash2, Upload, FileText, AlertCircle, Download,
  Lock, LockOpen, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/etudiant/parcours")({
  component: EtudiantParcours,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/* ── Constantes diplômes ── */

const DIPLOMA_TYPES = [
  { value: "bac", label: "Baccalauréat (BAC)" },
  { value: "bts", label: "BTS — Brevet de Technicien Supérieur" },
  { value: "dts", label: "DTS — Diplôme de Technicien Spécialisé" },
  { value: "licence_gen", label: "Licence Générale" },
  { value: "licence_pro", label: "Licence Professionnelle" },
  { value: "master_pro", label: "Master Professionnel" },
  { value: "master_rec", label: "Master Recherche" },
  { value: "master_sp", label: "Master Spécialisé" },
  { value: "deug", label: "DEUG / DEUST" },
  { value: "doctorat", label: "Doctorat" },
  { value: "autre", label: "Autre diplôme" },
];

const BAC_SERIES = [
  "Scientifique (S)",
  "Littéraire (L)",
  "Économique et Social (ES)",
  "STG — Sciences et Technologies de Gestion",
  "STI2D — Sciences et Technologies de l'Industrie",
  "Professionnel",
  "Technique",
  "Autre",
];

const MENTIONS = ["Très Bien", "Bien", "Assez Bien", "Passable"];

const COUNTRIES = [
  "Maroc", "France", "Congo (Brazzaville)", "RD Congo", "Sénégal",
  "Côte d'Ivoire", "Cameroun", "Gabon", "Guinée", "Mali", "Tunisie",
  "Algérie", "Belgique", "Canada", "Espagne", "Autres",
];

const RECORD_STATUS: Record<string, { badge: string; label: string }> = {
  en_attente: { badge: "bg-amber-100 text-amber-700", label: "En cours de vérification" },
  valide:     { badge: "bg-green-100 text-green-700", label: "Validé" },
  rejete:     { badge: "bg-red-100 text-red-700",     label: "Rejeté" },
};

/* ── Constantes documents ── */

type DocType   = Database["public"]["Enums"]["document_type"];
type DocStatus = Database["public"]["Enums"]["document_status"];

const DOC_LABELS: Record<string, string> = {
  identite:          "Pièce d'identité",
  diplome:           "Diplôme",
  releve_notes:      "Relevé de notes",
  lettre_motivation: "Lettre de motivation",
  cv:                "CV",
  photo:             "Photo / Image",
  autre:             "Autre document",
};

const UPLOADABLE_TYPES: DocType[] = ["lettre_motivation", "cv", "photo", "autre"];


/* ── Types ── */

type AcademicRecord = {
  id: string;
  student_id: string;
  diploma_type: string;
  diploma_name: string | null;
  speciality: string | null;
  domain: string | null;
  school_name: string;
  school_city: string | null;
  school_country: string | null;
  year: number | null;
  is_in_progress: boolean;
  mention: string | null;
  average: string | null;
  status: string;
  rejection_reason: string | null;
  justificatif_path: string | null;
  justificatif_name: string | null;
  releve_path: string | null;
  releve_name: string | null;
  created_at: string;
};

type RecordForm = {
  diploma_type: string;
  diploma_name: string;
  speciality: string;
  domain: string;
  school_name: string;
  school_city: string;
  school_country: string;
  year: string;
  is_in_progress: boolean;
  mention: string;
  average: string;
};

function emptyForm(): RecordForm {
  return {
    diploma_type: "", diploma_name: "", speciality: "", domain: "",
    school_name: "", school_city: "", school_country: "Maroc",
    year: new Date().getFullYear().toString(), is_in_progress: false,
    mention: "", average: "",
  };
}

function diplomaLabel(type: string) {
  return DIPLOMA_TYPES.find(d => d.value === type)?.label ?? type;
}

/* ── StatusBadge (partagé avec étudiant.documents via son propre export) ── */

export function StatusBadge({ status }: { status: DocStatus }) {
  const cfg = {
    en_attente: { label: "En attente",  icon: Clock,         cls: "bg-amber-100 text-amber-900" },
    valide:     { label: "Validé",      icon: CheckCircle2,  cls: "bg-emerald-100 text-emerald-900" },
    rejete:     { label: "Rejeté",      icon: XCircle,       cls: "bg-red-100 text-red-900" },
  }[status] ?? { label: status, icon: Clock, cls: "bg-muted text-muted-foreground" };
  const Icon = cfg.icon;
  return (
    <Badge className={`gap-1 ${cfg.cls} hover:${cfg.cls}`} variant="secondary">
      <Icon className="size-3" /> {cfg.label}
    </Badge>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
══════════════════════════════════════════════════════════════ */

function EtudiantParcours() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();

  /* ── États : parcours scolaire ── */
  const [showForm, setShowForm]           = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);
  const [form, setForm]                   = useState<RecordForm>(emptyForm());
  const [pendingDelete, setPendingDelete] = useState<AcademicRecord | null>(null);

  /* ── États : documents ── */
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType]         = useState<DocType>("lettre_motivation");
  const [uploading, setUploading]     = useState(false);
  const [pendingDocDel, setPendingDocDel] = useState<{ id: string; storage_path: string } | null>(null);

  /* ── Queries ── */

  // retry: false évite les re-tentatives si les colonnes n'existent pas encore en base
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

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["academic-records", uid],
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const { data, error } = await db
          .from("academic_records")
          .select("*")
          .eq("student_id", uid)
          .order("year", { ascending: false });
        if (error) return [];
        return data as AcademicRecord[];
      } catch {
        return [];
      }
    },
  });

  const { data: docs = [], isLoading: docsLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["documents", uid],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("student_id", uid!)
        .order("uploaded_at", { ascending: false });
      if (error) return [];
      return data;
    },
  });

  /* ── État verrou ── */
  const isSubmitted = !!profile?.dossier_submitted_at;
  const isLocked    = isSubmitted && profile?.dossier_can_edit === false;
  const isUnlocked  = isSubmitted && profile?.dossier_can_edit !== false;

  /* ── Mutations : parcours scolaire ── */

  const saveRecord = useMutation({
    mutationFn: async () => {
      if (!form.diploma_type) throw new Error("Veuillez choisir un type de diplôme.");
      if (!form.school_name.trim()) throw new Error("Le nom de l'établissement est obligatoire.");

      const payload = {
        student_id:    uid,
        diploma_type:  form.diploma_type,
        diploma_name:  form.diploma_name  || null,
        speciality:    form.speciality    || null,
        domain:        form.domain        || null,
        school_name:   form.school_name,
        school_city:   form.school_city   || null,
        school_country: form.school_country || null,
        year:          form.year ? parseInt(form.year) : null,
        is_in_progress: form.is_in_progress,
        mention:       form.mention       || null,
        average:       form.average       || null,
        status:        "en_attente",
      };

      if (editingRecord) {
        const { error } = await db.from("academic_records").update(payload).eq("id", editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("academic_records").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (!editingRecord) {
        toast.success("Informations enregistrées", {
          description: "Téléversez maintenant votre diplôme et votre relevé de notes via les boutons dédiés dans la liste.",
          duration: 8000,
        });
      } else {
        toast.success("Diplôme mis à jour");
      }
      qc.invalidateQueries({ queryKey: ["academic-records", uid] });
      closeForm();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteRecord = useMutation({
    mutationFn: async (rec: AcademicRecord) => {
      if (rec.justificatif_path) {
        await supabase.storage.from("student-documents").remove([rec.justificatif_path]);
      }
      const { error, count } = await db
        .from("academic_records")
        .delete({ count: "exact" })
        .eq("id", rec.id);
      if (error) throw error;
      if (count === 0) throw new Error("Suppression bloquée — exécutez la politique RLS DELETE dans Supabase.");
    },
    onSuccess: () => {
      toast.success("Diplôme supprimé");
      qc.invalidateQueries({ queryKey: ["academic-records", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  /* ── Upload justificatif / relevé sur une ligne de parcours ── */

  const uploadRecordDoc = useMutation({
    mutationFn: async ({ rec, file, field }: { rec: AcademicRecord; file: File; field: "justificatif" | "releve" }) => {
      if (file.size > 5 * 1024 * 1024) throw new Error("Max. 5 Mo");
      const ext  = file.name.split(".").pop() ?? "pdf";
      const path = `${uid}/parcours/${rec.id}_${field}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const patch = field === "justificatif"
        ? { justificatif_path: path, justificatif_name: file.name }
        : { releve_path: path, releve_name: file.name };
      const { error } = await db.from("academic_records").update(patch).eq("id", rec.id);
      if (error) throw error;
    },
    onSuccess: (_, { field }) => {
      toast.success(field === "justificatif" ? "Diplôme téléversé" : "Relevé de notes téléversé");
      qc.invalidateQueries({ queryKey: ["academic-records", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  /* ── Mutations : documents ── */

  const onUploadDoc = async (file: File) => {
    if (!uid) return;
    setUploading(true);
    try {
      const path = `${uid}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("documents").insert({
        student_id: uid, name: file.name, type: docType,
        storage_path: path, size_bytes: file.size, mime_type: file.type,
      });
      if (insErr) throw insErr;
      toast.success("Document téléversé");
      qc.invalidateQueries({ queryKey: ["documents", uid] });
      qc.invalidateQueries({ queryKey: ["etudiant-overview", uid] });

      // Notifier les admins du nouveau document (best-effort)
      void (async () => {
        try {
          const studentName = auth?.profile?.full_name || "Un étudiant";
          const { data: admins } = await supabase
            .from("user_roles").select("user_id").eq("role", "admin");
          const notifs = (admins ?? []).map((a) => ({
            user_id: a.user_id,
            title: "Nouveau document",
            body: `${studentName} a téléversé un nouveau document : ${file.name}`,
            data: { type: "new_document", student_id: uid } as { [k: string]: string },
          }));
          if (notifs.length) await supabase.from("notifications").insert(notifs);
        } catch { /* best-effort */ }
      })();
    } catch (e) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const deleteDoc = useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from("student-documents").remove([doc.storage_path]);
      const { error, count } = await supabase
        .from("documents")
        .delete({ count: "exact" })
        .eq("id", doc.id);
      if (error) throw error;
      if (count === 0) throw new Error("Suppression bloquée — exécutez la politique RLS DELETE dans Supabase.");
    },
    onSuccess: () => {
      toast.success("Document supprimé");
      qc.invalidateQueries({ queryKey: ["documents", uid] });
      qc.invalidateQueries({ queryKey: ["etudiant-overview", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  /* ── Helpers ── */

  function openAdd() {
    setEditingRecord(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(rec: AcademicRecord) {
    setEditingRecord(rec);
    setForm({
      diploma_type:   rec.diploma_type,
      diploma_name:   rec.diploma_name   ?? "",
      speciality:     rec.speciality     ?? "",
      domain:         rec.domain         ?? "",
      school_name:    rec.school_name,
      school_city:    rec.school_city    ?? "",
      school_country: rec.school_country ?? "Maroc",
      year:           rec.year?.toString() ?? "",
      is_in_progress: rec.is_in_progress,
      mention:        rec.mention        ?? "",
      average:        rec.average        ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingRecord(null);
    setForm(emptyForm());
  }

  function sf<K extends keyof RecordForm>(key: K, val: RecordForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function viewJustif(rec: AcademicRecord) {
    if (!rec.justificatif_path) return;
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(rec.justificatif_path, 120);
    if (error) { toast.error("Erreur d'accès"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function viewReleve(rec: AcademicRecord) {
    if (!rec.releve_path) return;
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(rec.releve_path, 120);
    if (error) { toast.error("Erreur d'accès"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function downloadDoc(path: string) {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 60);
    if (error || !data) return toast.error("Impossible de générer le lien");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const isBac         = form.diploma_type === "bac";
  const hasSpeciality = !isBac;
  const hasDomain     = ["bts", "dts", "licence_gen", "licence_pro", "master_pro", "master_rec", "master_sp"].includes(form.diploma_type);
  const hasMention    = form.diploma_type !== "doctorat";

  /* ══════════════════════════════════════════════════════════════
     RENDU
  ══════════════════════════════════════════════════════════════ */

  return (
    <>
      <PageHeader
        eyebrow="Dossier académique"
        title="Parcours & Documents"
        description="Renseignez vos diplômes et téléversez vos pièces. Ces éléments constituent votre dossier de candidature."
      />

      {/* ══ Bannière verrou ══ */}
      {isLocked && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <Lock className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Dossier verrouillé</p>
            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
              Votre dossier a été transmis le{" "}
              <strong>
                {new Date(profile!.dossier_submitted_at!).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </strong>. Aucune modification n'est possible. Contactez votre conseiller pour apporter des corrections.
            </p>
          </div>
        </div>
      )}

      {isUnlocked && isSubmitted && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950/30">
          <LockOpen className="mt-0.5 size-5 shrink-0 text-blue-600" />
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-300">Modification autorisée</p>
            <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-400">
              Votre conseiller vous a rouvert l'accès à la modification de votre dossier. Apportez les corrections nécessaires puis retransmettez votre dossier.
            </p>
          </div>
        </div>
      )}

      <>
          {/* ══ SECTION 1 : Parcours scolaire ══ */}
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-5 text-primary" />
                <h2 className="text-base font-semibold">Parcours scolaire</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {records.length}
                </span>
              </div>
              {!isLocked && (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="mr-1.5 size-3.5" /> Ajouter un diplôme
                </Button>
              )}
            </div>

            {recordsLoading ? (
              <div className="grid place-items-center py-10">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <div className={`rounded-2xl border border-dashed border-border p-14 text-center ${isLocked ? "opacity-60" : ""}`}>
                <GraduationCap className="mx-auto mb-3 size-12 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">Aucun diplôme renseigné.</p>
                {!isLocked && (
                  <Button size="sm" className="mt-4" onClick={openAdd}>
                    <Plus className="mr-1.5 size-3.5" /> Ajouter un diplôme
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {records.map((rec, i) => (
                  <RecordRow
                    key={rec.id}
                    rec={rec}
                    isLast={i === records.length - 1}
                    locked={isLocked}
                    onEdit={() => openEdit(rec)}
                    onDelete={() => setPendingDelete(rec)}
                    onViewJustif={() => viewJustif(rec)}
                    onViewReleve={() => viewReleve(rec)}
                    onUploadDoc={(file, field) => uploadRecordDoc.mutate({ rec, file, field })}
                    uploading={uploadRecordDoc.isPending}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ══ SECTION 2 : Documents administratifs ══ */}
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <h2 className="text-base font-semibold">Documents administratifs</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {docs.length}
              </span>
            </div>

            {/* Zone d'upload — cachée si verrouillé */}
            {!isLocked && (
              <div className="mb-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[200px] flex-1">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Type de document
                    </label>
                    <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UPLOADABLE_TYPES.map((k) => (
                          <SelectItem key={k} value={k}>{DOC_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <input
                    ref={docInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onUploadDoc(e.target.files[0])}
                  />
                  <Button size="sm" onClick={() => docInputRef.current?.click()} disabled={uploading}>
                    {uploading
                      ? <Loader2 className="mr-2 size-4 animate-spin" />
                      : <Upload className="mr-2 size-4" />}
                    Téléverser
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">PDF, image ou document (max 10 Mo).</p>
              </div>
            )}

            {docsLoading ? (
              <div className="grid place-items-center py-10">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : docs.length === 0 ? (
              <div className={`rounded-2xl border border-dashed border-border p-12 text-center ${isLocked ? "opacity-60" : ""}`}>
                <FileText className="mx-auto mb-3 size-12 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                  {isLocked ? "Aucun document téléversé." : "Aucun document. Commencez par téléverser un diplôme ou un relevé de notes."}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{d.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge status={d.status} />
                          <span className="text-xs text-muted-foreground">{DOC_LABELS[d.type] ?? d.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(d.uploaded_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        {d.notes && (
                          <div className="mt-1 text-xs italic text-muted-foreground">« {d.notes} »</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => downloadDoc(d.storage_path)}>
                        <Download className="size-4" />
                      </Button>
                      {!isLocked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingDocDel({ id: d.id, storage_path: d.storage_path })}
                          title="Supprimer ce document"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

      </>

      {/* ══ Dialog ajout / modification diplôme ══ */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Modifier le diplôme" : "Ajouter un diplôme"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <F label="Type de diplôme *">
              <Select
                value={form.diploma_type}
                onValueChange={v => { sf("diploma_type", v); sf("diploma_name", ""); }}
              >
                <SelectTrigger><SelectValue placeholder="Choisir le type..." /></SelectTrigger>
                <SelectContent>
                  {DIPLOMA_TYPES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>

            {form.diploma_type && (
              <>
                {isBac && (
                  <F label="Série du Baccalauréat">
                    <Select value={form.speciality} onValueChange={v => sf("speciality", v)}>
                      <SelectTrigger><SelectValue placeholder="Choisir la série..." /></SelectTrigger>
                      <SelectContent>
                        {BAC_SERIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                )}

                {hasSpeciality && (
                  <F label="Intitulé précis du diplôme">
                    <Input
                      value={form.diploma_name}
                      onChange={e => sf("diploma_name", e.target.value)}
                      placeholder={
                        form.diploma_type === "dts" ? "Diplôme de Technicien Spécialisé" :
                        form.diploma_type === "bts" ? "Brevet de Technicien Supérieur" :
                        form.diploma_type.startsWith("licence") ? "Licence Professionnelle Gestion d'Entreprise" :
                        form.diploma_type.startsWith("master") ? "Master Finance et Comptabilité" :
                        "Intitulé du diplôme"
                      }
                    />
                  </F>
                )}

                {hasSpeciality && (
                  <F label="Spécialité / Filière">
                    <Input
                      value={form.speciality}
                      onChange={e => sf("speciality", e.target.value)}
                      placeholder="Gestion d'Entreprise, Informatique, Droit..."
                    />
                  </F>
                )}

                {hasDomain && (
                  <F label="Domaine">
                    <Input
                      value={form.domain}
                      onChange={e => sf("domain", e.target.value)}
                      placeholder="Management, finances et commerce..."
                    />
                  </F>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <F label="Établissement *" className="sm:col-span-2">
                    <Input
                      value={form.school_name}
                      onChange={e => sf("school_name", e.target.value)}
                      placeholder="Nom de l'établissement"
                      className="uppercase placeholder:normal-case"
                    />
                  </F>
                  <F label="Ville">
                    <Input
                      value={form.school_city}
                      onChange={e => sf("school_city", e.target.value)}
                      placeholder="Ville"
                    />
                  </F>
                  <F label="Pays">
                    <Select value={form.school_country} onValueChange={v => sf("school_country", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 items-end">
                  <F label={form.is_in_progress ? "Année d'obtention prévue" : "Année d'obtention"}>
                    <Input
                      type="number"
                      min="1990"
                      max="2035"
                      value={form.year}
                      onChange={e => sf("year", e.target.value)}
                      placeholder="2025"
                    />
                  </F>
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <input
                      type="checkbox"
                      id="in_progress"
                      checked={form.is_in_progress}
                      onChange={e => sf("is_in_progress", e.target.checked)}
                      className="size-4 cursor-pointer accent-primary"
                    />
                    <label htmlFor="in_progress" className="cursor-pointer select-none text-sm">
                      Diplôme en cours d'obtention
                    </label>
                  </div>
                </div>

                {hasMention && !form.is_in_progress && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <F label="Mention">
                      <Select value={form.mention} onValueChange={v => sf("mention", v)}>
                        <SelectTrigger><SelectValue placeholder="Non renseignée" /></SelectTrigger>
                        <SelectContent>
                          {MENTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="Moyenne générale">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        value={form.average}
                        onChange={e => sf("average", e.target.value)}
                        placeholder="15,14"
                      />
                    </F>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Annuler</Button>
            <Button
              disabled={!form.diploma_type || !form.school_name.trim() || saveRecord.isPending}
              onClick={() => saveRecord.mutate()}
            >
              {saveRecord.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingRecord ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Supprimer ce diplôme ?"
        description="Ce diplôme et son justificatif seront définitivement supprimés."
        onConfirm={() => {
          if (pendingDelete) { deleteRecord.mutate(pendingDelete); setPendingDelete(null); }
        }}
        loading={deleteRecord.isPending}
      />

      <ConfirmDialog
        open={pendingDocDel !== null}
        onOpenChange={(o) => { if (!o) setPendingDocDel(null); }}
        title="Supprimer ce document ?"
        description="Ce document sera définitivement supprimé et ne pourra pas être récupéré."
        onConfirm={() => {
          if (pendingDocDel) deleteDoc.mutate(pendingDocDel);
          setPendingDocDel(null);
        }}
        loading={deleteDoc.isPending}
      />
    </>
  );
}

/* ── RecordRow : ligne d'un diplôme ── */

function RecordRow({
  rec, isLast, locked, onEdit, onDelete, onViewJustif, onViewReleve, onUploadDoc, uploading,
}: {
  rec: AcademicRecord;
  isLast: boolean;
  locked: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewJustif: () => void;
  onViewReleve: () => void;
  onUploadDoc: (file: File, field: "justificatif" | "releve") => void;
  uploading: boolean;
}) {
  const justifRef = useRef<HTMLInputElement>(null);
  const releveRef  = useRef<HTMLInputElement>(null);
  const st = RECORD_STATUS[rec.status] ?? RECORD_STATUS.en_attente;
  const isRejected = rec.status === "rejete";

  return (
    <div className={`${!isLast ? "border-b border-border" : ""} ${isRejected ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
      <div className="flex flex-wrap items-start gap-4 px-5 py-4">

        {/* Année + statut */}
        <div className="w-32 shrink-0">
          <div className="text-lg font-bold leading-tight">
            {rec.year ?? "—"}
            {rec.is_in_progress && (
              <span className="ml-1 text-[10px] font-medium text-muted-foreground">(En cours)</span>
            )}
          </div>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ${st.badge}`}>
            {st.label}
          </span>
        </div>

        {/* Diplôme */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {diplomaLabel(rec.diploma_type)}
          </div>
          {rec.diploma_name && (
            <div className="mt-0.5 text-sm font-semibold">{rec.diploma_name}</div>
          )}
          {rec.speciality && (
            <div className="mt-0.5 text-sm text-muted-foreground">{rec.speciality}</div>
          )}
          {rec.domain && (
            <div className="mt-0.5 text-xs text-muted-foreground">{rec.domain}</div>
          )}
        </div>

        {/* École */}
        <div className="w-56 shrink-0 text-right">
          <div className="text-sm font-semibold uppercase">{rec.school_name}</div>
          {rec.school_city && (
            <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {rec.school_city}
            </div>
          )}
          {rec.school_country && (
            <div className="text-xs text-muted-foreground">{rec.school_country}</div>
          )}
          {!rec.is_in_progress && (
            <>
              <div className="mt-1 text-xs text-muted-foreground">
                Moyenne : <span className="font-medium">{rec.average ?? "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Mention : <span className="font-medium">{rec.mention ?? "—"}</span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {/* Diplôme (justificatif) */}
          {rec.justificatif_path ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-emerald-700" onClick={onViewJustif} title="Voir le diplôme">
                <Eye className="size-3" /> Diplôme
              </Button>
              {!locked && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => justifRef.current?.click()} disabled={uploading} title="Remplacer">
                  <Upload className="size-3" />
                </Button>
              )}
            </div>
          ) : !locked && (
            <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5 border-dashed" onClick={() => justifRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
              Diplôme
            </Button>
          )}

          {/* Relevé de notes */}
          {rec.releve_path ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-emerald-700" onClick={onViewReleve} title="Voir le relevé">
                <Eye className="size-3" /> Relevé
              </Button>
              {!locked && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => releveRef.current?.click()} disabled={uploading} title="Remplacer">
                  <Upload className="size-3" />
                </Button>
              )}
            </div>
          ) : !locked && (
            <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1.5 border-dashed" onClick={() => releveRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
              Relevé
            </Button>
          )}

          {/* Modifier / Supprimer */}
          {!locked && (isRejected || rec.status === "en_attente") && (
            <Button size="sm" variant={isRejected ? "destructive" : "outline"} className="h-7 px-3 text-xs gap-1.5" onClick={onEdit}>
              <Pencil className="size-3" /> Modifier
            </Button>
          )}
          {!locked && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onDelete} title="Supprimer">
              <Trash2 className="size-3" />
            </Button>
          )}

          {/* Inputs fichiers cachés */}
          <input ref={justifRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadDoc(f, "justificatif"); e.target.value = ""; }} />
          <input ref={releveRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadDoc(f, "releve"); e.target.value = ""; }} />
        </div>
      </div>

      {/* Motif de rejet */}
      {isRejected && rec.rejection_reason && (
        <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <span className="font-semibold">Motif du rejet : </span>
            {rec.rejection_reason}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Wrapper champ formulaire ── */
function F({ label, children, className }: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
