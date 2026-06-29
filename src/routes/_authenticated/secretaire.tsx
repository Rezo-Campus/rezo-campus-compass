import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Mail, Users, GraduationCap, CalendarClock, FileCheck2, MessageSquare, CalendarDays, Receipt } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/secretaire", icon: LayoutDashboard },
  { label: "Courriers", to: "/secretaire/courriers", icon: Mail },
  { label: "Clients", to: "/secretaire/clients", icon: Users },
  { label: "Rendez-vous", to: "/secretaire/rendez-vous", icon: CalendarClock },
  { label: "Réunions", to: "/secretaire/reunions", icon: CalendarDays },
  { label: "Étudiants", to: "/secretaire/etudiants", icon: GraduationCap },
  { label: "Validations", to: "/secretaire/validations", icon: FileCheck2 },
  { label: "Messagerie", to: "/secretaire/messages", icon: MessageSquare },
  { label: "Facturation", to: "/secretaire/facturation", icon: Receipt },
];

export const Route = createFileRoute("/_authenticated/secretaire")({
  component: () => (
    <RoleGuard allow={["admin", "secretaire"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
