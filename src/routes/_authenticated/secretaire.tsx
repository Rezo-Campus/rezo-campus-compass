import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Mail, Users, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/secretaire", icon: LayoutDashboard },
  { label: "Courriers", to: "/secretaire/courriers", icon: Mail },
  { label: "Clients", to: "/secretaire/clients", icon: Users },
  { label: "Étudiants", to: "/secretaire/etudiants", icon: GraduationCap },
];

export const Route = createFileRoute("/_authenticated/secretaire")({
  component: () => (
    <RoleGuard allow={["admin", "secretaire"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
