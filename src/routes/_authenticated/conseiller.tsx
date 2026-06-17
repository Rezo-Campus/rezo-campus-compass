import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  MessageSquare,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/conseiller", icon: LayoutDashboard },
  { label: "Mes étudiants", to: "/conseiller/etudiants", icon: Users },
  { label: "Validations", to: "/conseiller/validations", icon: FileCheck2 },
  { label: "Messagerie", to: "/conseiller/messages", icon: MessageSquare },
  { label: "Rendez-vous", to: "/conseiller/rendez-vous", icon: CalendarDays },
  { label: "RDV Clients", to: "/conseiller/rendez-vous-clients", icon: CalendarClock },
];

export const Route = createFileRoute("/_authenticated/conseiller")({
  component: () => (
    <RoleGuard allow={["conseiller", "admin"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
