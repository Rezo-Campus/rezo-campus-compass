import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Mail, Users, GraduationCap, FileCheck2, MessageSquare, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

// Agenda, Rendez-vous, Réunions et Facturation sont accessibles via le menu 3-points (accès rapides)
const NAV = [
  { label: "Tableau de bord", to: "/secretaire",            icon: LayoutDashboard },
  { label: "Courriers",       to: "/secretaire/courriers",  icon: Mail },
  { label: "Clients",         to: "/secretaire/clients",    icon: Users },
  { label: "Étudiants",      to: "/secretaire/etudiants",  icon: GraduationCap },
  { label: "Validations",     to: "/secretaire/validations", icon: FileCheck2 },
  { label: "Attribution",     to: "/secretaire/attribution", icon: UserPlus },
  { label: "Messagerie",      to: "/secretaire/messages",   icon: MessageSquare },
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
