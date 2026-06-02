import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, FileText, Download, CheckCircle2, XCircle, Archive, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "./etudiant.documents";

export const Route = createFileRoute("/_authenticated/conseiller/validations")({
  component: Validations,
});

export function Validations() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const isAdmin = auth?.role === "admin";
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showArchive, setShowArchive] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["docs", uid, isAdmin, showArchive],
    queryFn: async () => {
      let studentIds: string[] | null = null;
      if (!isAdmin) {
        const { data: files } = await supabase
          .from("student_files")
          .select("student_id")
          .eq("advisor_id", uid!);
        studentIds = (files ?? []).map((f) => f.student_id);
        if (!studentIds.length) return [];
      }
      let q = supabase
        .from("documents")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (showArchive) {
        q = q.in("status", ["valide", "rejete"] as const);
      } else {
        q = q.eq("status", "en_attente");
      }
      if (studentIds) q = q.in("student_id", studentIds);
      const { data, error } = await q;
      if (error) throw error;
      const sids = [...new Set(data.map((d) => d.student_id))];
      if (!sids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", sids);
      return data.map((d) => ({ ...d, profile: profs?.find((p) => p.id === d.student_id) }));
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "valide" | "rejete" }) => {
      const { error } = await supabase
        .from("documents")
        .update({
          status,
          notes: notes[id] || null,
          reviewed_by: uid!,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document traité");
      qc.invalidateQueries({ queryKey: ["docs"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const download = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 60);
    if (error || !data) return toast.error("Lien indisponible");
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  };

  return (
    <>
      <PageHeader
        eyebrow="Validations"
        title={showArchive ? "Archives des documents" : "Documents en attente"}
        description={
          showArchive
            ? "Historique des documents validés et rejetés."
            : "Validez ou rejetez les documents téléversés par les étudiants."
        }
      />

      {/* Bascule En attente / Archives */}
      <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/40 p-1 text-sm">
        <button
          type="button"
          onClick={() => setShowArchive(false)}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${
            !showArchive ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Clock className="size-3.5" /> En attente
        </button>
        <button
          type="button"
          onClick={() => setShowArchive(true)}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${
            showArchive ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Archive className="size-3.5" /> Archives
        </button>
      </div>

      <Panel
        title={`${docs.length} document${docs.length > 1 ? "s" : ""} ${showArchive ? "archivé" + (docs.length > 1 ? "s" : "") : "à examiner"}`}
      >
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {showArchive ? "Aucun document archivé." : "Aucun document en attente."}
          </div>
        ) : (
          <ul className="space-y-4">
            {docs.map((d) => (
              <li key={d.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.profile?.full_name || d.profile?.email} · {new Date(d.uploaded_at).toLocaleDateString("fr-FR")}
                    </div>
                    {showArchive && d.notes && (
                      <div className="mt-1 text-xs text-muted-foreground italic">Note : {d.notes}</div>
                    )}
                  </div>
                  <StatusBadge status={d.status} />
                  <Button size="sm" variant="ghost" onClick={() => download(d.storage_path, d.name)}>
                    <Download className="size-4" />
                  </Button>
                </div>
                {!showArchive && (
                  <>
                    <Textarea
                      rows={2}
                      className="mt-3"
                      placeholder="Note (facultatif, visible par l'étudiant)"
                      value={notes[d.id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review.mutate({ id: d.id, status: "rejete" })}
                        disabled={review.isPending}
                      >
                        <XCircle className="mr-1 size-4 text-destructive" /> Rejeter
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => review.mutate({ id: d.id, status: "valide" })}
                        disabled={review.isPending}
                      >
                        <CheckCircle2 className="mr-1 size-4" /> Valider
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
