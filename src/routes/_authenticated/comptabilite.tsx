import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, ArrowUpDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/comptabilite", icon: LayoutDashboard },
  { label: "Transactions", to: "/comptabilite/transactions", icon: ArrowUpDown },
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
