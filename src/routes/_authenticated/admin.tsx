import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, FolderOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/admin", icon: LayoutDashboard },
  { label: "Utilisateurs", to: "/admin/utilisateurs", icon: Users },
  { label: "Tous les dossiers", to: "/conseiller/etudiants", icon: FolderOpen },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
