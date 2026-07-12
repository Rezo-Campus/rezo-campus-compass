import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!data?.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (data.profile?.blocked_at) {
      navigate({ to: "/blocked", replace: true });
    }
  }, [data, isLoading, navigate]);

  // Spinner uniquement pendant le chargement réel — pas si l'utilisateur est absent
  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Auth résolue mais pas connecté → useEffect redirige vers /login, rien à afficher
  if (!data?.user || data.profile?.blocked_at) {
    return null;
  }

  return <Outlet />;
}
