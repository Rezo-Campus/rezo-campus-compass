import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Receipt,
  ClipboardList,
  UserCircle,
  Banknote,
  Mail,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/rh", icon: LayoutDashboard },
  { label: "Personnel", to: "/rh/personnel", icon: Users },
  { label: "Réunions", to: "/rh/reunions", icon: CalendarDays },
  { label: "Bulletins de paie", to: "/rh/bulletins-paie", icon: Banknote },
  { label: "Transmissions internes", to: "/rh/courriers", icon: Mail },
  { label: "Protocoles", to: "/rh/protocoles", icon: ClipboardList },
  { label: "RDV Clients", to: "/rh/rendez-vous-clients", icon: CalendarClock },
  { label: "Facturation", to: "/rh/facturation", icon: Receipt },
  { label: "Mon Profil", to: "/rh/profil", icon: UserCircle },
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
