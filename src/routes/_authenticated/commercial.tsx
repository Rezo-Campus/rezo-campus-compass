import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/commercial", icon: LayoutDashboard },
  { label: "Activités", to: "/commercial/activites", icon: Users2 },
];

export const Route = createFileRoute("/_authenticated/commercial")({
  component: () => (
    <RoleGuard allow={["admin", "commercial"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
