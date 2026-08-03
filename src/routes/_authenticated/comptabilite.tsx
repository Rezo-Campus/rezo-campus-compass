import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, ArrowUpDown, CalendarClock, Calendar, BarChart2, ClipboardList, Receipt } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord",     to: "/comptabilite",                         icon: LayoutDashboard },
  { label: "Transactions",        to: "/comptabilite/transactions",             icon: ArrowUpDown },
  { label: "Budget Prévisionnel", to: "/comptabilite/budget-previsionnel",      icon: BarChart2 },
  { label: "Rapport de Suivi",    to: "/comptabilite/rapport-suivi",            icon: ClipboardList },
  { label: "Factures",            to: "/comptabilite/factures",                 icon: Receipt },
  { label: "Agenda",              to: "/comptabilite/agenda",                   icon: Calendar },
  { label: "RDV Clients",         to: "/comptabilite/rendez-vous-clients",      icon: CalendarClock },
];

export const Route = createFileRoute("/_authenticated/comptabilite")({
  component: () => (
    <RoleGuard allow={["admin", "comptable"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
