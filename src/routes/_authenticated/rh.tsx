import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/rh", icon: LayoutDashboard },
  { label: "Personnel", to: "/rh/personnel", icon: Users },
];

export const Route = createFileRoute("/_authenticated/rh")({
  component: () => (
    <RoleGuard allow={["admin", "rh"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
