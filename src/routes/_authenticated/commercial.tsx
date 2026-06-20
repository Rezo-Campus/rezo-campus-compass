import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users2, CalendarClock, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/commercial", icon: LayoutDashboard },
  { label: "Activités", to: "/commercial/activites", icon: Users2 },
  { label: "Réunions", to: "/commercial/reunions", icon: CalendarDays },
  { label: "RDV Clients", to: "/commercial/rendez-vous-clients", icon: CalendarClock },
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
