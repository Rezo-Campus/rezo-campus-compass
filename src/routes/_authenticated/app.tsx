import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/** Hub: redirige vers le dashboard selon le rôle. */
export const Route = createFileRoute("/_authenticated/app")({
  component: AppHub,
});

function AppHub() {
  const { data, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !data) return;
    if (!data.role) {
      navigate({ to: "/unauthorized", replace: true });
      return;
    }
    const target =
      data.role === "admin"
        ? "/admin"
        : data.role === "conseiller"
          ? "/conseiller"
          : "/etudiant";
    navigate({ to: target, replace: true });
  }, [data, isLoading, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}
