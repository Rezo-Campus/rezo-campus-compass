import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "etudiant" | "conseiller" | "admin";

export interface AuthSession {
  user: { id: string; email: string | null } | null;
  role: AppRole | null;
  profile: { full_name: string | null; email: string } | null;
}

/** Récupère la session courante, le rôle et le profil de l'utilisateur. */
export function useAuth() {
  return useQuery<AuthSession>({
    queryKey: ["auth-session"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { user: null, role: null, profile: null };

      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .order("role", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      return {
        user: { id: user.id, email: user.email ?? null },
        role: (roleRow?.role as AppRole | undefined) ?? null,
        profile: profile ?? null,
      };
    },
  });
}
