import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conseiller/etudiants")({
  component: MesEtudiants,
});

function MesEtudiants() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const isAdmin = auth?.role === "admin";
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["my-students", uid, isAdmin],
    queryFn: async () => {
      let q = supabase
        .from("student_files")
        .select("*")
        .order("updated_at", { ascending: false });
      if (!isAdmin) q = q.eq("advisor_id", uid!);
      const { data: files, error } = await q;
      if (error) throw error;
      const ids = files.map((f) => f.student_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", ids);
      return files.map((f) => ({
        ...f,
        profile: profs?.find((p) => p.id === f.student_id),
      }));
    },
  });

  const claim = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("student_files")
        .update({ advisor_id: uid! })
        .eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Étudiant assigné");
      qc.invalidateQueries({ queryKey: ["my-students"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Étudiants"
        title={isAdmin ? "Tous les étudiants" : "Mes étudiants"}
        description={
          isAdmin
            ? "Liste complète des dossiers de la plateforme."
            : "Les étudiants qui vous sont assignés."
        }
      />

      <Panel title={`${rows.length} dossier${rows.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun étudiant pour l'instant.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Projet</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                        <GraduationCap className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium">{r.profile?.full_name || r.profile?.email}</div>
                        <div className="text-xs text-muted-foreground">{r.profile?.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.target_program || "—"}
                    {r.target_country && (
                      <div className="text-xs text-muted-foreground">{r.target_country} · {r.target_level}</div>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{r.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${r.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{r.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {!r.advisor_id ? (
                      <Button size="sm" onClick={() => claim.mutate(r.student_id)} disabled={claim.isPending}>
                        Prendre en charge
                      </Button>
                    ) : r.advisor_id === uid ? (
                      <span className="text-xs text-muted-foreground">Vous</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Assigné</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
