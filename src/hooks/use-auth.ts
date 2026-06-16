import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "etudiant" | "conseiller" | "admin" | "comptable" | "chef_projet" | "commercial" | "rh" | "ecole" | "secretaire";

const ROLE_PRIORITY: AppRole[] = ["admin", "conseiller", "chef_projet", "comptable", "commercial", "rh", "secretaire", "ecole", "etudiant"];

export interface AuthSession {
  user: { id: string; email: string | null } | null;
  role: AppRole | null;
  roles: AppRole[];
  profile: { full_name: string | null; email: string; blocked_at: string | null; school_id: string | null } | null;
}

export function useAuth() {
  return useQuery<AuthSession>({
    queryKey: ["auth-session"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { user: null, role: null, roles: [], profile: null };

      const [{ data: roleRows }, { data: profile }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("full_name, email, blocked_at, school_id")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      const roles = (roleRows ?? []).map((r) => r.role as AppRole);
      const role = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;

      return {
        user: { id: user.id, email: user.email ?? null },
        role,
        roles,
        profile: profile ?? null,
      };
    },
  });
}
