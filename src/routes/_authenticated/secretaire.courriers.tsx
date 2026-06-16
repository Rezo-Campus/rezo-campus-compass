import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Loader2, Plus, Inbox, Send, Download, Trash2, Mail, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/secretaire/courriers")({
  component: SecretaireCourriers,
});

type Tab = "entrant" | "sortant";

interface CourrierForm {
  type: Tab;
  objet: string;
  expediteur: string;
  destinataire: string;
  date_courrier: string;
  reference: string;
  notes: string;
}

const EMPTY_FORM: CourrierForm = {
  type: "entrant",
  objet: "",
  expediteur: "",
  destinataire: "",
  date_courrier: new Date().toISOString().split("T")[0],
  reference: "",
  notes: "",
};

function SecretaireCourriers() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  const [tab, setTab] = useState<Tab>("entrant");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CourrierForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; document_path: string | null } | null>(null);

  const { data: courriers = [], isLoading } = useQuery({
    queryKey: ["courriers", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courriers")
        .select("*")
        .eq("type", tab)
        .order("date_courrier", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  function setField<K extends keyof CourrierForm>(key: K, val: CourrierForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const saveCourrier = useMutation({
    mutationFn: async () => {
      if (!form.objet.trim()) throw new Error("L'objet est obligatoire.");

      let document_path: string | null = null;
      let document_name: string | null = null;

      if (selectedFile) {
        setUploading(true);
        const ext = selectedFile.name.split(".").pop() ?? "pdf";
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("courriers")
          .upload(path, selectedFile);
        setUploading(false);
        if (upErr) throw upErr;
        document_path = path;
        document_name = selectedFile.name;
      }

      const { error } = await supabase.from("courriers").insert({
        type: form.type,
        objet: form.objet.trim(),
        expediteur: form.expediteur.trim() || null,
        destinataire: form.destinataire.trim() || null,
        date_courrier: form.date_courrier,
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
        document_path,
        document_name,
        created_by: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Courrier enregistré");
      qc.invalidateQueries({ queryKey: ["courriers"] });
      qc.invalidateQueries({ queryKey: ["secretaire-stats"] });
      qc.invalidateQueries({ queryKey: ["secretaire-recent-courriers"] });
      setOpen(false);
      setForm({ ...EMPTY_FORM, type: tab });
      setSelectedFile(null);
    },
    onError: (e: Error) => {
      setUploading(false);
      toast.error("Erreur", { description: e.message });
    },
  });

  const deleteCourrier = useMutation({
    mutationFn: async (c: { id: string; document_path: string | null }) => {
      if (c.document_path) {
        await supabase.storage.from("courriers").remove([c.document_path]);
      }
      const { error } = await supabase.from("courriers").delete().eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Courrier supprimé");
      qc.invalidateQueries({ queryKey: ["courriers"] });
      qc.invalidateQueries({ queryKey: ["secretaire-stats"] });
      qc.invalidateQueries({ queryKey: ["secretaire-recent-courriers"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function downloadDoc(path: string) {
    const { data, error } = await supabase.storage.from("courriers").createSignedUrl(path, 3600);
    if (error || !data) { toast.error("Lien indisponible"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, type: tab });
    setSelectedFile(null);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Secrétariat"
        title="Gestion des courriers"
        description="Enregistrez les courriers entrants et sortants avec leurs documents."
      />

      {/* Onglets + bouton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab("entrant")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${
              tab === "entrant" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Inbox className="size-3.5" /> Entrants
          </button>
          <button
            type="button"
            onClick={() => setTab("sortant")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${
              tab === "sortant" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Send className="size-3.5" /> Sortants
          </button>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 size-4" /> Nouveau courrier
        </Button>
      </div>

      {/* Liste */}
      <Panel title={`${courriers.length} courrier${courriers.length !== 1 ? "s" : ""} ${tab === "entrant" ? "entrant" : "sortant"}${courriers.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : courriers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <Mail className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucun courrier {tab === "entrant" ? "entrant" : "sortant"} enregistré.
          </div>
        ) : (
          <ul className="space-y-2">
            {courriers.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
                <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  c.type === "entrant" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {c.type === "entrant" ? <Inbox className="size-5" /> : <Send className="size-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.objet}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {c.type === "entrant" && c.expediteur && <span>De : {c.expediteur}</span>}
                    {c.type === "sortant" && c.destinataire && <span>À : {c.destinataire}</span>}
                    {c.reference && <span>Réf : {c.reference}</span>}
                    <span>{new Date(c.date_courrier).toLocaleDateString("fr-FR")}</span>
                  </div>
                  {c.notes && (
                    <div className="mt-1 text-xs italic text-muted-foreground">« {c.notes} »</div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {c.document_path && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadDoc(c.document_path!)}
                      title="Ouvrir le document"
                    >
                      <FileText className="mr-1.5 size-3.5" /> Document
                      <Download className="ml-1 size-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setPendingDelete({ id: c.id, document_path: c.document_path })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Dialog nouveau courrier */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau courrier</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Type</label>
              <Select value={form.type} onValueChange={(v) => setField("type", v as Tab)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrant">Courrier entrant</SelectItem>
                  <SelectItem value="sortant">Courrier sortant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Objet */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Objet <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Objet du courrier"
                value={form.objet}
                onChange={(e) => setField("objet", e.target.value)}
              />
            </div>

            {/* Expediteur / Destinataire */}
            {form.type === "entrant" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Expéditeur</label>
                <Input
                  placeholder="Nom ou organisation"
                  value={form.expediteur}
                  onChange={(e) => setField("expediteur", e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Destinataire</label>
                <Input
                  placeholder="Nom ou organisation"
                  value={form.destinataire}
                  onChange={(e) => setField("destinataire", e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={form.date_courrier}
                  onChange={(e) => setField("date_courrier", e.target.value)}
                />
              </div>
              {/* Référence */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Référence</label>
                <Input
                  placeholder="N° de référence"
                  value={form.reference}
                  onChange={(e) => setField("reference", e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <Textarea
                rows={2}
                placeholder="Observations, instructions..."
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>

            {/* Document */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Document (optionnel)</label>
              <div
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 hover:border-primary/40 hover:bg-muted/30 transition"
                onClick={() => fileRef.current?.click()}
              >
                <FileText className="size-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : "Cliquer pour joindre un fichier"}
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setSelectedFile(f);
                  e.target.value = "";
                }}
              />
              {selectedFile && (
                <button
                  type="button"
                  className="mt-1 text-xs text-destructive hover:underline"
                  onClick={() => setSelectedFile(null)}
                >
                  Retirer le fichier
                </button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              onClick={() => saveCourrier.mutate()}
              disabled={saveCourrier.isPending || uploading}
            >
              {(saveCourrier.isPending || uploading) && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Supprimer ce courrier ?"
        description="Cette action est irréversible. Le courrier et son document seront définitivement supprimés."
        onConfirm={() => {
          if (pendingDelete) deleteCourrier.mutate(pendingDelete);
          setPendingDelete(null);
        }}
        loading={deleteCourrier.isPending}
      />
    </>
  );
}
