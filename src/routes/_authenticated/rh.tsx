import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, CalendarClock, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/rh", icon: LayoutDashboard },
  { label: "Personnel", to: "/rh/personnel", icon: Users },
  { label: "Réunions", to: "/rh/reunions", icon: CalendarDays },
  { label: "RDV Clients", to: "/rh/rendez-vous-clients", icon: CalendarClock },
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
