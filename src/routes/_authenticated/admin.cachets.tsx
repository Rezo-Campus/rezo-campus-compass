import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Stamp, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin/cachets")({
  component: AdminCachets,
});

type CachetKey = "cachet_carre" | "cachet_rond";

const CACHETS: { key: CachetKey; label: string; desc: string }[] = [
  {
    key: "cachet_carre",
    label: "Cachet carré",
    desc: "Appliqué automatiquement sur les documents générés (bulletins, factures…). Sauf documents école.",
  },
  {
    key: "cachet_rond",
    label: "Cachet rond",
    desc: "Disponible pour apposer manuellement sur les transmissions inter-départements.",
  },
];

function AdminCachets() {
  const qc = useQueryClient();
  const fileRefs = useRef<Record<CachetKey, HTMLInputElement | null>>({
    cachet_carre: null,
    cachet_rond: null,
  });
  const [uploading, setUploading] = useState<CachetKey | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CachetKey | null>(null);

  const { data: urls = {}, isLoading } = useQuery<Partial<Record<CachetKey, string>>>({
    queryKey: ["cachet-urls"],
    queryFn: async () => {
      const result: Partial<Record<CachetKey, string>> = {};
      await Promise.all(
        CACHETS.map(async ({ key }) => {
          const path = `${key}.png`;
          const { data } = await supabase.storage.from("cachets").createSignedUrl(path, 3600);
          if (data?.signedUrl) result[key] = data.signedUrl;
        }),
      );
      return result;
    },
  });

  async function handleUpload(key: CachetKey, file: File) {
    setUploading(key);
    try {
      const path = `${key}.png`;
      const { error } = await supabase.storage
        .from("cachets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      toast.success("Cachet enregistré");
      qc.invalidateQueries({ queryKey: ["cachet-urls"] });
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setUploading(null);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (key: CachetKey) => {
      const { error } = await supabase.storage.from("cachets").remove([`${key}.png`]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cachet supprimé");
      qc.invalidateQueries({ queryKey: ["cachet-urls"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Administration générale"
        title="Gestion des cachets officiels"
        description="Uploadez les deux cachets de Rézo Campus. Ils seront appliqués automatiquement ou manuellement sur les documents."
      />

      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-primary" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {CACHETS.map(({ key, label, desc }) => {
            const url = urls[key];
            const isUploading = uploading === key;
            return (
              <Panel key={key} title={label}>
                <p className="mb-4 text-sm text-muted-foreground">{desc}</p>

                {url ? (
                  <div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
                    <img src={url} alt={label} className="max-h-32 max-w-32 object-contain" />
                    <div className="flex items-center gap-1.5 text-xs text-green-700">
                      <CheckCircle2 className="size-3.5" /> Cachet enregistré
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    <Stamp className="size-10 opacity-20" />
                    Aucun cachet enregistré
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant={url ? "outline" : "default"}
                    disabled={isUploading}
                    onClick={() => fileRefs.current[key]?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 size-4" />
                    )}
                    {url ? "Remplacer" : "Uploader le cachet"}
                  </Button>
                  {url && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDelete(key)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <input
                  ref={(el) => {
                    fileRefs.current[key] = el;
                  }}
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(key, f);
                    e.target.value = "";
                  }}
                />
              </Panel>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Note :</strong> Uploadez des images PNG avec fond transparent pour un meilleur
        rendu. Les fichiers acceptés : PNG, JPG/JPEG.
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title="Supprimer ce cachet ?"
        description="Le cachet sera définitivement supprimé et ne pourra plus être appliqué aux documents."
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete);
          setPendingDelete(null);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
