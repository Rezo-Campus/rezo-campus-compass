import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, ArrowUpDown, CalendarClock, CalendarDays, Receipt } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/comptabilite", icon: LayoutDashboard },
  { label: "Transactions", to: "/comptabilite/transactions", icon: ArrowUpDown },
  { label: "Réunions", to: "/comptabilite/reunions", icon: CalendarDays },
  { label: "RDV Clients", to: "/comptabilite/rendez-vous-clients", icon: CalendarClock },
  { label: "Facturation", to: "/comptabilite/facturation", icon: Receipt },
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
