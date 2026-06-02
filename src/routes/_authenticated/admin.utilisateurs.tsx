import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Ban, ShieldCheck } from "lucide-react";
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
type RoleOrNull = Role | null;

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
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      return profs.map((p) => ({
        ...p,
        role: (roles?.find((r) => r.user_id === p.id)?.role ?? null) as RoleOrNull,
      }));
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
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

  const pending = rows.filter((r) => !r.role && !r.blocked_at).length;
  const blocked = rows.filter((r) => r.blocked_at).length;

  return (
    <>
      <PageHeader
        eyebrow="Utilisateurs"
        title="Gestion des comptes"
        description="Attribuez les rôles et gérez l'accès des utilisateurs."
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
                <TableHead>Statut / Rôle</TableHead>
                <TableHead className="text-center">Attribuer un rôle</TableHead>
                <TableHead className="text-right">Accès</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
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
                    {u.blocked_at ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="size-3" /> Bloqué
                      </Badge>
                    ) : u.role ? (
                      <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        En attente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Select
                      value={u.role ?? ""}
                      disabled={!!u.blocked_at || u.id === currentUserId}
                      onValueChange={(v) => v && changeRole.mutate({ userId: u.id, role: v as Role })}
                    >
                      <SelectTrigger className="mx-auto w-[160px]">
                        <SelectValue placeholder="Attribuer…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="etudiant">Étudiant</SelectItem>
                        <SelectItem value="conseiller">Conseiller</SelectItem>
                        <SelectItem value="admin">Administrateur</SelectItem>
                      </SelectContent>
                    </Select>
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
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
