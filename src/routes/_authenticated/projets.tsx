import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, CalendarClock, Receipt, ArrowLeftRight, FolderOpen, CalendarDays, Calendar, BarChart2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord",  to: "/projets",                     icon: LayoutDashboard },
  { label: "Projets",          to: "/projets/liste",               icon: FolderOpen },
  { label: "Agenda",           to: "/projets/agenda",              icon: Calendar },
  { label: "Réunions",         to: "/projets/reunions",            icon: CalendarDays },
  { label: "RDV Clients",      to: "/projets/rendez-vous-clients", icon: CalendarClock },
  { label: "Analytiques",      to: "/projets/analytiques",         icon: BarChart2 },
  { label: "Transmettre AADF", to: "/projets/transmission",        icon: ArrowLeftRight },
  { label: "Facturation",      to: "/projets/facturation",         icon: Receipt },
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
