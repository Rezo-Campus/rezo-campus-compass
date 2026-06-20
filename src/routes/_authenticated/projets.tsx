import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, FolderOpen, CalendarClock, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/projets", icon: LayoutDashboard },
  { label: "Projets", to: "/projets/liste", icon: FolderOpen },
  { label: "Réunions", to: "/projets/reunions", icon: CalendarDays },
  { label: "RDV Clients", to: "/projets/rendez-vous-clients", icon: CalendarClock },
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
