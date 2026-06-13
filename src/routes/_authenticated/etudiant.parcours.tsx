import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Loader2, Upload, Download, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/parcours")({
  component: EtudiantParcours,
});

const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB strict

const DOC_TYPES = [
  { value: "diplome", label: "Diplôme" },
  { value: "releve_notes", label: "Relevé de notes" },
];

const STATUS_COLORS: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-700",
  valide: "bg-green-100 text-green-700",
  rejete: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  rejete: "Rejeté",
};

function EtudiantParcours() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<"diplome" | "releve_notes">("diplome");
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["parcours-docs", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("student_id", uid!)
        .in("type", ["diplome", "releve_notes"])
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function handleUpload(file: File) {
    if (!uid) return;
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Fichier trop volumineux", { description: "La taille maximum est de 1 Mo par fichier pour le parcours scolaire." });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file);
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("documents").insert({
        student_id: uid,
        name: file.name,
        type: selectedType,
        storage_path: path,
        size_bytes: file.size,
        mime_type: file.type,
        status: "en_attente",
      });
      if (dbErr) throw dbErr;

      toast.success("Document téléversé");
      qc.invalidateQueries({ queryKey: ["parcours-docs", uid] });
    } catch (e: unknown) {
      toast.error("Erreur lors du téléversement", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  const deleteDoc = useMutation({
    mutationFn: async ({ docId, storagePath }: { docId: string; storagePath: string }) => {
      await supabase.storage.from("student-documents").remove([storagePath]);
      const { error } = await supabase.from("documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document supprimé");
      qc.invalidateQueries({ queryKey: ["parcours-docs", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function downloadDoc(path: string, name: string) {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 60);
    if (error) { toast.error("Erreur de téléchargement"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  }

  return (
    <>
      <PageHeader
        eyebrow="Parcours scolaire"
        title="Mes diplômes & relevés de notes"
        description="Téléversez vos diplômes et relevés de notes. Taille maximale : 1 Mo par fichier."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload panel */}
        <Panel title="Ajouter un document">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Type de document</p>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as "diplome" | "releve_notes")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition"
              onClick={() => fileRef.current?.click()}
            >
              <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Upload className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium">Cliquer pour sélectionner</p>
                <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG · max. <strong>1 Mo</strong></p>
              </div>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="size-4 animate-spin" /> Téléversement en cours...
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </div>
        </Panel>

        {/* Documents list */}
        <div className="lg:col-span-2">
          <Panel title={`Documents (${docs.length})`}>
            {isLoading ? (
              <Loader2 className="mx-auto size-5 animate-spin text-primary" />
            ) : docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <GraduationCap className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucun document de parcours scolaire.</p>
                <p className="mt-1 text-xs text-muted-foreground">Ajoutez vos diplômes et relevés de notes.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {DOC_TYPES.find((t) => t.value === d.type)?.label}
                        </span>
                        {d.size_bytes && (
                          <span className="text-xs text-muted-foreground">
                            · {(d.size_bytes / 1024).toFixed(0)} Ko
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[d.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => downloadDoc(d.storage_path, d.name)}
                        title="Télécharger"
                      >
                        <Download className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteDoc.mutate({ docId: d.id, storagePath: d.storage_path })}
                        disabled={deleteDoc.isPending}
                        title="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
