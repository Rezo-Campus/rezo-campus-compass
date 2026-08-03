import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, UserPlus, Search, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/secretaire/attribution")({
  component: SecretaireAttribution,
});

const db = supabase as any;

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function SecretaireAttribution() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["secretaire-users-attribution"],
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });

  const { data: existingRoles = [], refetch: refetchRoles } = useQuery({
    queryKey: ["secretaire-all-roles"],
    queryFn: async () => {
      const { data, error } = await db.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data ?? []) as { user_id: string; role: string }[];
    },
  });

  const grantStudent = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db.from("user_roles").upsert(
        { user_id: userId, role: "etudiant" },
        { onConflict: "user_id,role" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle étudiant attribué");
      qc.invalidateQueries({ queryKey: ["secretaire-all-roles"] });
    },
    onError: (e: Error) => toast.error("Erreur d'attribution", { description: e.message }),
  });

  const revokeStudent = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "etudiant");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle étudiant retiré");
      qc.invalidateQueries({ queryKey: ["secretaire-all-roles"] });
    },
    onError: (e: Error) => toast.error("Erreur de suppression", { description: e.message }),
  });

  const STAFF_ROLES = ["admin", "conseiller", "secretaire", "rh", "commercial", "chef_projet", "comptable", "ecole", "aadf"];

  const q = search.toLowerCase();
  const filtered = users.filter((u) => {
    if (q && !u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
    const roles = existingRoles.filter((r) => r.user_id === u.id).map((r) => r.role);
    return !roles.some((r) => STAFF_ROLES.includes(r));
  });

  const pendingCount = filtered.filter((u) => {
    const roles = existingRoles.filter((r) => r.user_id === u.id);
    return roles.length === 0;
  }).length;

  const isPending = grantStudent.isPending || revokeStudent.isPending;

  return (
    <>
      <PageHeader
        eyebrow="Secrétariat"
        title="Attribution des utilisateurs"
        description="Attribuez ou retirez le rôle étudiant aux utilisateurs inscrits."
      />

      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">{pendingCount}</span>
          {" "}utilisateur{pendingCount > 1 ? "s" : ""} en attente d'attribution.
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="max-w-sm"
        />
      </div>

      <Panel title={`${filtered.length} utilisateur${filtered.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((u) => {
              const roles = existingRoles
                .filter((r) => r.user_id === u.id)
                .map((r) => r.role);
              const isStudent = roles.includes("etudiant");
              const initials = (u.full_name || u.email || "?")
                .split(/\s+/)
                .map((s: string) => s[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <li key={u.id} className="flex items-center gap-4 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {u.full_name || (
                        <span className="italic text-muted-foreground">Nom non renseigné</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{u.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {roles.length === 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          En attente d'attribution
                        </span>
                      ) : (
                        roles.map((r) => (
                          <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            r === "etudiant" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                          }`}>
                            {r === "etudiant" ? "Étudiant" :
                             r === "conseiller" ? "Conseiller" :
                             r === "admin" ? "Admin" :
                             r === "aadf" ? "AADF" :
                             r}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isStudent ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                        <CheckCircle2 className="size-4" /> Étudiant
                      </div>
                      <button
                        disabled={isPending}
                        onClick={() => revokeStudent.mutate(u.id)}
                        className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Retirer le rôle étudiant"
                      >
                        {revokeStudent.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <X className="size-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 px-3 text-xs"
                      disabled={isPending}
                      onClick={() => grantStudent.mutate(u.id)}
                    >
                      {grantStudent.isPending ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <UserPlus className="size-3" />
                      )}
                      Attribuer étudiant
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
