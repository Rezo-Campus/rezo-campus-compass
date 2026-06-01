import { Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

/** Garde de rôle: redirige si le rôle ne correspond pas. */
export function RoleGuard({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) {
  const { data, isLoading } = useAuth();

  if (isLoading || !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!data.role || !allow.includes(data.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}
