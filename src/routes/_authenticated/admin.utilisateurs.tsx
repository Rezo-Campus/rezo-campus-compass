import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Ban, ShieldCheck, X, Plus } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];

const ALL_ROLES: Role[] = ["etudiant", "conseiller", "admin", "comptable", "chef_projet", "commercial"];

const ROLE_LABELS: Record<Role, string> = {
  etudiant: "Étudiant",
  conseiller: "Conseiller",
  admin: "Admin",
  comptable: "Comptable",
  chef_projet: "Chef de projet",
  commercial: "Commercial",
};

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const currentUserId = auth?.user?.id;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, created_at, blocked_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roleRows } = await supabase.from("user_roles").select("user_id, role");
      return profs.map((p) => ({
        ...p,
        roles: (roleRows ?? [])
          .filter((r) => r.user_id === p.id)
          .map((r) => r.role as Role),
      }));
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle ajouté");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["auth-session"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle retiré");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["auth-session"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ blocked_at: block ? new Date().toISOString() : null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { block }) => {
      toast.success(block ? "Compte bloqué" : "Compte débloqué");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const pending = rows.filter((r) => !r.roles.length && !r.blocked_at).length;
  const blocked = rows.filter((r) => r.blocked_at).length;

  return (
    <>
      <PageHeader
        eyebrow="Utilisateurs"
        title="Gestion des comptes"
        description="Attribuez un ou plusieurs rôles et gérez l'accès des utilisateurs."
      />
      <Panel
        title={`${rows.length} compte${rows.length > 1 ? "s" : ""}`}
        description={[
          pending > 0 ? `${pending} en attente` : "",
          blocked > 0 ? `${blocked} bloqué${blocked > 1 ? "s" : ""}` : "",
        ].filter(Boolean).join(" · ") || undefined}
      >
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun utilisateur inscrit.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Rôles actuels</TableHead>
                <TableHead>Ajouter un rôle</TableHead>
                <TableHead className="text-right">Accès</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const available = ALL_ROLES.filter((r) => !u.roles.includes(r));
                return (
                  <TableRow
                    key={u.id}
                    className={u.blocked_at ? "opacity-60 bg-destructive/5" : ""}
                  >
                    <TableCell>
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.blocked_at && (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="size-3" /> Bloqué
                          </Badge>
                        )}
                        {u.roles.length === 0 && !u.blocked_at && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            En attente
                          </Badge>
                        )}
                        {u.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="gap-1 capitalize">
                            {ROLE_LABELS[r]}
                            {u.id !== currentUserId && (
                              <button
                                onClick={() => removeRole.mutate({ userId: u.id, role: r })}
                                disabled={removeRole.isPending}
                                className="ml-0.5 rounded-sm opacity-70 transition hover:opacity-100 hover:text-destructive"
                                title={`Retirer ${ROLE_LABELS[r]}`}
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!u.blocked_at && u.id !== currentUserId && available.length > 0 && (
                        <Select
                          value=""
                          onValueChange={(v) => v && addRole.mutate({ userId: u.id, role: v as Role })}
                        >
                          <SelectTrigger className="w-[160px]">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Plus className="size-3" /> Ajouter…
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {available.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== currentUserId ? (
                        <Button
                          size="sm"
                          variant={u.blocked_at ? "outline" : "ghost"}
                          className={
                            u.blocked_at
                              ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                              : "text-destructive hover:text-destructive hover:bg-destructive/10"
                          }
                          onClick={() =>
                            toggleBlock.mutate({ userId: u.id, block: !u.blocked_at })
                          }
                          disabled={toggleBlock.isPending}
                        >
                          {u.blocked_at ? (
                            <><ShieldCheck className="mr-1 size-4" /> Débloquer</>
                          ) : (
                            <><Ban className="mr-1 size-4" /> Bloquer</>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Vous</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
