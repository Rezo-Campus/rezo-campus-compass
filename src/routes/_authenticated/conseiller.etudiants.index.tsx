import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, GraduationCap, AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/conseiller/etudiants/")({
  component: MesEtudiants,
});

function getMissingFields(row: { profile?: { full_name?: string | null; phone?: string | null } | null; bio?: string | null; target_country?: string | null; target_level?: string | null; target_program?: string | null }) {
  const missing: string[] = [];
  if (!row.profile?.full_name) missing.push("Nom complet");
  if (!row.profile?.phone) missing.push("Téléphone");
  if (!row.target_country) missing.push("Pays cible");
  if (!row.target_level) missing.push("Niveau cible");
  if (!row.target_program) missing.push("Formation cible");
  if (!row.bio) missing.push("Biographie / motivation");
  return missing;
}

export function MesEtudiants() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const isAdmin = auth?.role === "admin";
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["my-students", uid],
    queryFn: async () => {
      const { data: files, error } = await supabase
        .from("student_files")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const ids = files.map((f) => f.student_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, photo_url")
        .in("id", ids);
      // Ignore les dossiers orphelins (profil supprimé sans cascade en base)
      return files
        .map((f) => ({
          ...f,
          profile: profs?.find((p) => p.id === f.student_id),
        }))
        .filter((f) => !!f.profile);
    },
  });

  const { data: conseillers = [] } = useQuery({
    enabled: !!uid,
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
    <TooltipProvider>
      <>
        <PageHeader
          eyebrow="Étudiants"
          title="Tous les dossiers"
          description="Tous les conseillers ont accès à l'ensemble des dossiers étudiants."
        />

        <Panel title={`${rows.length} dossier${rows.length > 1 ? "s" : ""}`}>
          {isLoading ? (
            <Loader2 className="mx-auto size-5 animate-spin text-primary" />
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Aucun étudiant inscrit pour l'instant.
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => {
                const missing = getMissingFields(r);
                const hasMissing = missing.length > 0;
                return (
                  <li
                    key={r.id}
                    className={`rounded-xl border p-4 ${hasMissing ? "border-red-200 bg-red-50/40" : "border-border"}`}
                  >
                    <Link
                      to="/conseiller/etudiants/$studentId"
                      params={{ studentId: r.student_id }}
                      className="flex items-start gap-3 hover:underline"
                    >
                      {r.profile?.photo_url ? (
                        <img
                          src={r.profile.photo_url}
                          alt={r.profile.full_name ?? ""}
                          className="size-10 shrink-0 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className={`grid size-10 shrink-0 place-items-center rounded-full ${hasMissing ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"}`}>
                          <GraduationCap className="size-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`font-medium ${hasMissing ? "text-red-700" : ""}`}>
                            {r.profile?.full_name || r.profile?.email}
                          </span>
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {r.status.replace("_", " ")}
                          </Badge>
                          {hasMissing && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  <AlertTriangle className="size-4 text-red-500" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[220px]">
                                <p className="font-semibold mb-1">Champs manquants :</p>
                                <ul className="list-disc list-inside space-y-0.5 text-xs">
                                  {missing.map((m) => (
                                    <li key={m} className="text-red-200">{m}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{r.profile?.email}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {r.target_program ? (
                            <span className="text-muted-foreground">{r.target_program}</span>
                          ) : (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-600">Projet non renseigné</span>
                          )}
                          {r.target_country && (
                            <span className="text-muted-foreground">{r.target_country} · {r.target_level}</span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${r.progress}%` }} />
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{r.progress}%</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <Link to="/conseiller/messages">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                          <MessageSquare className="size-3" />
                          Message
                        </Button>
                      </Link>
                      {isAdmin ? (
                        <Select
                          value={r.advisor_id ?? "none"}
                          onValueChange={(v) =>
                            assign.mutate({ studentId: r.student_id, advisorId: v === "none" ? null : v })
                          }
                          disabled={assign.isPending}
                        >
                          <SelectTrigger className="w-[180px]">
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
                        <span className="text-xs text-muted-foreground">
                          Conseiller :{" "}
                          {r.advisor_id === uid
                            ? "Vous"
                            : conseillers.find((c) => c.id === r.advisor_id)?.full_name
                              ?? conseillers.find((c) => c.id === r.advisor_id)?.email
                              ?? "Non assigné"}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </>
    </TooltipProvider>
  );
}
