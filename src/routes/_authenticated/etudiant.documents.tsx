import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Loader2, Upload, Trash2, FileText, Download, CheckCircle2, XCircle, Clock } from "lucide-react";
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
import type { Database } from "@/integrations/supabase/types";

type DocType = Database["public"]["Enums"]["document_type"];
type DocStatus = Database["public"]["Enums"]["document_status"];

const TYPE_LABEL: Record<DocType, string> = {
  identite: "Pièce d'identité",
  diplome: "Diplôme",
  releve_notes: "Relevé de notes",
  lettre_motivation: "Lettre de motivation",
  cv: "CV",
  autre: "Autre",
};

export const Route = createFileRoute("/_authenticated/etudiant/documents")({
  component: DocumentsEtudiant,
});

function DocumentsEtudiant() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocType>("identite");
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["documents", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("student_id", uid!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const onUpload = async (file: File) => {
    if (!uid) return;
    setUploading(true);
    try {
      const path = `${uid}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("documents").insert({
        student_id: uid,
        name: file.name,
        type,
        storage_path: path,
        size_bytes: file.size,
        mime_type: file.type,
      });
      if (insErr) throw insErr;
      toast.success("Document téléversé");
      qc.invalidateQueries({ queryKey: ["documents", uid] });
      qc.invalidateQueries({ queryKey: ["etudiant-overview", uid] });
    } catch (e) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const del = useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from("student-documents").remove([doc.storage_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimé");
      qc.invalidateQueries({ queryKey: ["documents", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const download = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 60);
    if (error || !data) return toast.error("Impossible de générer le lien");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  };

  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Mes pièces administratives"
        description="Téléversez et suivez la validation de vos documents."
      />

      <Panel title="Téléverser un document">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-sm font-medium">Type de document</label>
            <Select value={type} onValueChange={(v) => setType(v as DocType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
            Choisir un fichier
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">PDF, image ou document (max 10 Mo recommandé).</p>
      </Panel>

      <Panel title={`Mes documents (${docs.length})`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun document pour l'instant.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3">
                <div className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {TYPE_LABEL[d.type]} · {new Date(d.uploaded_at).toLocaleDateString("fr-FR")}
                  </div>
                  {d.notes && <div className="mt-1 text-xs italic text-muted-foreground">« {d.notes} »</div>}
                </div>
                <StatusBadge status={d.status} />
                <Button size="sm" variant="ghost" onClick={() => download(d.storage_path, d.name)}>
                  <Download className="size-4" />
                </Button>
                {d.status === "en_attente" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => del.mutate({ id: d.id, storage_path: d.storage_path })}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

export function StatusBadge({ status }: { status: DocStatus }) {
  const cfg = {
    en_attente: { label: "En attente", icon: Clock, cls: "bg-amber-100 text-amber-900" },
    valide: { label: "Validé", icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-900" },
    rejete: { label: "Rejeté", icon: XCircle, cls: "bg-red-100 text-red-900" },
  }[status];
  const Icon = cfg.icon;
  return (
    <Badge className={`gap-1 ${cfg.cls} hover:${cfg.cls}`} variant="secondary">
      <Icon className="size-3" /> {cfg.label}
    </Badge>
  );
}
