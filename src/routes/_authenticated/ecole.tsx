import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, GraduationCap, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/ecole", icon: LayoutDashboard },
  { label: "Candidats", to: "/ecole/candidats", icon: Users },
  { label: "Formations", to: "/ecole/formations", icon: GraduationCap },
  { label: "Messagerie", to: "/ecole/messages", icon: MessageSquare },
];

export const Route = createFileRoute("/_authenticated/ecole")({
  component: () => (
    <RoleGuard allow={["admin", "ecole"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
