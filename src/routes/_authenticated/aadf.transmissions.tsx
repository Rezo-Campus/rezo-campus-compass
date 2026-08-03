import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Loader2, Plus, ArrowLeftRight, Download, Upload, CheckCircle2,
  Clock, Send, FileText, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aadf/transmissions")({
  component: AadfTransmissions,
});

const db = supabase as any;

const DEPARTMENTS = [
  { value: "commercial",   label: "Marketing & Commerce" },
  { value: "marketing",    label: "Marketing" },
  { value: "rh",           label: "Ressources Humaines" },
  { value: "projets",      label: "Management de Projet" },
  { value: "comptabilite", label: "Finance & Comptabilité" },
  { value: "secretaire",   label: "Secrétariat" },
  { value: "admin",        label: "Administration" },
  { value: "aadf",         label: "AADF" },
];

const STATUS_STEPS = [
  { value: "soumis",     label: "Soumis",     color: "bg-amber-100 text-amber-700" },
  { value: "enregistre", label: "Enregistré", color: "bg-blue-100 text-blue-700" },
  { value: "transmis",   label: "Transmis",   color: "bg-indigo-100 text-indigo-700" },
  { value: "traite",     label: "Traité",     color: "bg-green-100 text-green-700" },
];

type Transmission = {
  id: string;
  reference: string | null;
  sender_id: string;
  sender_department: string;
  target_department: string;
  title: string;
  description: string | null;
  document_path: string | null;
  document_name: string | null;
  status: string;
  aadf_notes: string | null;
  transmitted_at: string | null;
  created_at: string;
  sender?: { full_name: string | null };
};

function AadfTransmissions() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    source_department: "commercial",
    target_department: "projets",
    title: "",
    description: "",
  });
  const [aadfNotes, setAadfNotes] = useState("");
  const [aadfTarget, setAadfTarget] = useState("projets");

  const { data: transmissions = [], isLoading } = useQuery({
    queryKey: ["aadf-transmissions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("dept_transmissions")
        .select("*, sender:sender_id(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Transmission[];
    },
  });

  const createTransmission = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Non authentifié");
      const ref = `TR-${Date.now().toString().slice(-6)}`;
      const { error } = await db.from("dept_transmissions").insert({
        reference: ref,
        sender_id: uid,
        sender_department: form.source_department,
        target_department: form.target_department,
        title: form.title,
        description: form.description || null,
        status: "soumis",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transmission créée");
      qc.invalidateQueries({ queryKey: ["aadf-transmissions"] });
      setShowNew(false);
      setForm({ source_department: "commercial", target_department: "projets", title: "", description: "" });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const registerAndTransmit = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!uid) throw new Error("Non authentifié");
      const { error } = await db.from("dept_transmissions").update({
        status: "transmis",
        aadf_notes: aadfNotes || null,
        target_department: aadfTarget,
        received_by: uid,
        transmitted_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;

      // Notify target department users
      const { data: targetUsers } = await db
        .from("user_roles")
        .select("user_id")
        .eq("role", aadfTarget === "projets" ? "chef_projet" : aadfTarget === "rh" ? "rh" : aadfTarget === "comptabilite" ? "comptable" : aadfTarget);

      const tx = transmissions.find((t) => t.id === id);
      if (targetUsers && tx) {
        await supabase.from("notifications").insert(
          (targetUsers ?? []).map((u: any) => ({
            user_id: u.user_id,
            title: `Nouvelle transmission AADF : ${tx.title}`,
            body: `Un document a été transmis par l'AADF depuis ${DEPARTMENTS.find((d) => d.value === tx.sender_department)?.label}. Référence : ${tx.reference ?? "—"}.`,
            data: { type: "aadf_transmission", transmissionId: id },
          }))
        );
      }
    },
    onSuccess: () => {
      toast.success("Transmission enregistrée et transmise au département cible");
      qc.invalidateQueries({ queryKey: ["aadf-transmissions"] });
      setSelectedId(null);
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const markTraite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("dept_transmissions").update({ status: "traite" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transmission marquée comme traitée");
      qc.invalidateQueries({ queryKey: ["aadf-transmissions"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function uploadDoc(file: File, txId: string) {
    if (!uid) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `aadf-transmissions/${txId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("student-documents").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await db.from("dept_transmissions").update({
        document_path: path,
        document_name: file.name,
      }).eq("id", txId);
      if (error) throw error;
      toast.success("Document joint à la transmission");
      qc.invalidateQueries({ queryKey: ["aadf-transmissions"] });
    } catch (e: unknown) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally { setUploading(false); }
  }

  async function downloadDoc(path: string, name: string) {
    const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(path, 3600);
    if (error || !data) { toast.error("Fichier inaccessible"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.click();
  }

  const displayed = filterStatus === "all"
    ? transmissions
    : transmissions.filter((t) => t.status === filterStatus);

  const selectedTx = selectedId ? transmissions.find((t) => t.id === selectedId) : null;

  return (
    <>
      <PageHeader
        eyebrow="AADF"
        title="Transmissions inter-départements"
        description="Enregistrez, traitez et transmettez les documents et PV entre les départements."
      />

      {/* Résumé */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_STEPS.map((s) => (
          <div key={s.value} className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold">{transmissions.filter((t) => t.status === s.value).length}</div>
            <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}>{s.label}</div>
          </div>
        ))}
      </div>

      <Panel
        title="Toutes les transmissions"
        action={
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUS_STEPS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="mr-2 size-4" /> Nouvelle transmission
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <ArrowLeftRight className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucune transmission.
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((t) => {
              const step = STATUS_STEPS.find((s) => s.value === t.status);
              return (
                <div key={t.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {t.reference && (
                        <span className="text-[10px] font-mono text-muted-foreground">{t.reference}</span>
                      )}
                      <span className="text-sm font-semibold">{t.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${step?.color ?? "bg-muted"}`}>
                        {step?.label ?? t.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {DEPARTMENTS.find((d) => d.value === t.sender_department)?.label ?? t.sender_department}
                      </span>
                      <ArrowLeftRight className="size-3" />
                      <span className="font-medium text-foreground">
                        {DEPARTMENTS.find((d) => d.value === t.target_department)?.label ?? t.target_department}
                      </span>
                      <span>· {new Date(t.created_at).toLocaleDateString("fr-FR")}</span>
                      {t.sender?.full_name && <span>· Par {t.sender.full_name}</span>}
                    </div>
                    {t.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    )}
                    {t.aadf_notes && (
                      <p className="mt-1 text-xs italic text-blue-700">Note AADF : {t.aadf_notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {t.document_path && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs"
                        onClick={() => downloadDoc(t.document_path!, t.document_name ?? "document")}>
                        <Download className="size-3" /> Document
                      </Button>
                    )}
                    {!t.document_path && (
                      <>
                        <input ref={fileRef} type="file" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f, t.id); e.target.value = ""; }} />
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={uploading}
                          onClick={() => fileRef.current?.click()}>
                          <Upload className="size-3" /> Joindre
                        </Button>
                      </>
                    )}
                    {t.status === "soumis" && (
                      <Button size="sm" className="h-7 gap-1 px-2 text-xs"
                        onClick={() => {
                          setAadfNotes("");
                          setAadfTarget(t.target_department);
                          setSelectedId(t.id);
                        }}>
                        <Send className="size-3" /> Traiter
                      </Button>
                    )}
                    {t.status === "transmis" && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs border-green-300 text-green-700"
                        onClick={() => markTraite.mutate(t.id)}>
                        <CheckCircle2 className="size-3" /> Clore
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Dialog nouvelle transmission */}
      <Dialog open={showNew} onOpenChange={(o) => { if (!o) setShowNew(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle transmission inter-département</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Objet de la transmission" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Département source</Label>
                <Select value={form.source_department} onValueChange={(v) => setForm((f) => ({ ...f, source_department: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Département cible</Label>
                <Select value={form.target_department} onValueChange={(v) => setForm((f) => ({ ...f, target_department: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description / Contenu</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez la nature de la transmission, les éléments transmis..." className="mt-1" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button disabled={!form.title.trim() || createTransmission.isPending} onClick={() => createTransmission.mutate()}>
              {createTransmission.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Créer la transmission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog traitement AADF */}
      <Dialog open={!!selectedId} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="size-5 text-primary" /> Traiter la transmission
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-sm font-semibold">{selectedTx.title}</div>
                {selectedTx.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{selectedTx.description}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Transmettre vers</Label>
                <Select value={aadfTarget} onValueChange={setAadfTarget}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes AADF (optionnel)</Label>
                <Textarea value={aadfNotes} onChange={(e) => setAadfNotes(e.target.value)}
                  placeholder="Observations, instructions pour le département destinataire..." className="mt-1" rows={3} />
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>Le département cible sera notifié automatiquement après la transmission.</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>Annuler</Button>
            <Button
              disabled={registerAndTransmit.isPending}
              onClick={() => { if (selectedId) registerAndTransmit.mutate({ id: selectedId }); }}
            >
              {registerAndTransmit.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Send className="mr-2 size-4" /> Enregistrer et transmettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
