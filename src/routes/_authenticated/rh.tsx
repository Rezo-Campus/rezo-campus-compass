import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, CalendarClock, CalendarDays, Receipt, UserCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/rh", icon: LayoutDashboard },
  { label: "Personnel", to: "/rh/personnel", icon: Users },
  { label: "Entretiens", to: "/rh/entretiens", icon: UserCheck },
  { label: "Réunions", to: "/rh/reunions", icon: CalendarDays },
  { label: "RDV Clients", to: "/rh/rendez-vous-clients", icon: CalendarClock },
  { label: "Facturation", to: "/rh/facturation", icon: Receipt },
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
