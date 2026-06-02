import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, FileText, Download, CheckCircle2, XCircle } from "lucide-react";
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

function Validations() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const isAdmin = auth?.role === "admin";
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: docs = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["pending-docs", uid, isAdmin],
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
        .eq("status", "en_attente")
        .order("uploaded_at");
      if (studentIds) q = q.in("student_id", studentIds);
      const { data, error } = await q;
      if (error) throw error;
      const sids = [...new Set(data.map((d) => d.student_id))];
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
      qc.invalidateQueries({ queryKey: ["pending-docs"] });
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
        title="Documents en attente"
        description="Validez ou rejetez les documents téléversés par les étudiants."
      />

      <Panel title={`${docs.length} document${docs.length > 1 ? "s" : ""} à examiner`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun document en attente.
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
                  </div>
                  <StatusBadge status={d.status} />
                  <Button size="sm" variant="ghost" onClick={() => download(d.storage_path, d.name)}>
                    <Download className="size-4" />
                  </Button>
                </div>
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
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
