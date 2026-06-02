import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function MesEtudiants() {
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

  // Liste des conseillers pour le dropdown d'assignation (admin uniquement)
  const { data: conseillers = [] } = useQuery({
    enabled: !!uid && isAdmin,
    queryKey: ["conseillers-list"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "conseiller");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      return data ?? [];
    },
  });

  const assign = useMutation({
    mutationFn: async ({ studentId, advisorId }: { studentId: string; advisorId: string | null }) => {
      const { error } = await supabase
        .from("student_files")
        .update({ advisor_id: advisorId })
        .eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conseiller assigné");
      qc.invalidateQueries({ queryKey: ["my-students"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Étudiants"
        title={isAdmin ? "Tous les dossiers" : "Mes étudiants"}
        description={
          isAdmin
            ? "Assignez chaque étudiant à un conseiller."
            : "Les étudiants qui vous sont assignés."
        }
      />

      <Panel title={`${rows.length} dossier${rows.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {isAdmin ? "Aucun étudiant inscrit pour l'instant." : "Aucun étudiant ne vous est assigné."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Projet</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead className="text-right">
                  {isAdmin ? "Conseiller assigné" : "Statut"}
                </TableHead>
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
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{r.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${r.progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{r.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <Select
                        value={r.advisor_id ?? "none"}
                        onValueChange={(v) =>
                          assign.mutate({ studentId: r.student_id, advisorId: v === "none" ? null : v })
                        }
                        disabled={assign.isPending}
                      >
                        <SelectTrigger className="ml-auto w-[180px]">
                          <SelectValue placeholder="Non assigné" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Non assigné</SelectItem>
                          {conseillers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.full_name || c.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">Vous</span>
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
