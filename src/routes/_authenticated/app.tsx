import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppHub,
});

function AppHub() {
  const { data, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !data) return;
    const roles = data.roles;
    if (!roles.length) {
      navigate({ to: "/unauthorized", replace: true });
      return;
    }
    let target = "/unauthorized";
    if (roles.includes("admin")) target = "/admin";
    else if (roles.includes("conseiller")) target = "/conseiller";
    else if (roles.includes("chef_projet")) target = "/projets";
    else if (roles.includes("comptable")) target = "/comptabilite";
    else if (roles.includes("commercial")) target = "/commercial";
    else if (roles.includes("rh")) target = "/rh";
    else if (roles.includes("etudiant")) target = "/etudiant";
    navigate({ to: target, replace: true });
  }, [data, isLoading, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}
