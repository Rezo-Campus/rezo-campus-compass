import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users2, Receipt, Calendar, TrendingUp, ArrowLeftRight, UserCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

// Agenda Commercial, Marketing, RDV Clients, Réunions → accessibles via menu 3-points
const NAV = [
  { label: "Tableau de bord",  to: "/commercial",                   icon: LayoutDashboard },
  { label: "Commercial",       to: "/commercial/activites",          icon: Users2 },
  { label: "Agenda Marketing", to: "/commercial/agenda-marketing",   icon: Calendar },
  { label: "Analyses",         to: "/commercial/analyses",           icon: TrendingUp },
  { label: "Transmettre AADF", to: "/commercial/transmission",       icon: ArrowLeftRight },
  { label: "Facturation",      to: "/commercial/facturation",        icon: Receipt },
  { label: "Mon Profil",     to: "/commercial/profil",             icon: UserCircle },
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
