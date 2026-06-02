import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];
type RoleOrNull = Role | null;

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, created_at")
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

  const pending = rows.filter((r) => !r.role).length;

  return (
    <>
      <PageHeader
        eyebrow="Utilisateurs"
        title="Gestion des comptes"
        description="Attribuez les rôles étudiant, conseiller ou administrateur."
      />
      <Panel
        title={`${rows.length} compte${rows.length > 1 ? "s" : ""}`}
        description={pending > 0 ? `${pending} en attente d'attribution` : undefined}
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
                <TableHead>Rôle actuel</TableHead>
                <TableHead className="text-right">Attribuer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    {u.role ? (
                      <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        En attente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={u.role ?? ""}
                      onValueChange={(v) => v && changeRole.mutate({ userId: u.id, role: v as Role })}
                    >
                      <SelectTrigger className="ml-auto w-[170px]">
                        <SelectValue placeholder="Attribuer un rôle…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="etudiant">Étudiant</SelectItem>
                        <SelectItem value="conseiller">Conseiller</SelectItem>
                        <SelectItem value="admin">Administrateur</SelectItem>
                      </SelectContent>
                    </Select>
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
