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
        role: (roles?.find((r) => r.user_id === p.id)?.role ?? "etudiant") as Role,
      }));
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error: del } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (del) throw del;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Utilisateurs"
        title="Gestion des comptes"
        description="Attribuez les rôles étudiant, conseiller ou administrateur."
      />
      <Panel title={`${rows.length} compte${rows.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Rôle actuel</TableHead>
                <TableHead className="text-right">Changer</TableHead>
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
                  <TableCell><Badge variant="secondary" className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={u.role}
                      onValueChange={(v) => changeRole.mutate({ userId: u.id, role: v as Role })}
                    >
                      <SelectTrigger className="ml-auto w-[160px]"><SelectValue /></SelectTrigger>
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
