import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, CalendarClock, Receipt, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

// Agenda, Contrats, Entretiens, Réunions → accessibles via menu 3-points
const NAV = [
  { label: "Tableau de bord", to: "/rh",                        icon: LayoutDashboard },
  { label: "Personnel",       to: "/rh/personnel",              icon: Users },
  { label: "Protocoles",      to: "/rh/protocoles",             icon: ClipboardList },
  { label: "RDV Clients",     to: "/rh/rendez-vous-clients",    icon: CalendarClock },
  { label: "Facturation",     to: "/rh/facturation",            icon: Receipt },
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
