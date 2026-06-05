import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, FolderOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/projets", icon: LayoutDashboard },
  { label: "Projets", to: "/projets/liste", icon: FolderOpen },
];

export const Route = createFileRoute("/_authenticated/projets")({
  component: () => (
    <RoleGuard allow={["admin", "chef_projet"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
