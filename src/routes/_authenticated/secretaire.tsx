import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Mail, Users, GraduationCap, FileCheck2, MessageSquare, UserPlus, CalendarClock, UserCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord",   to: "/secretaire",                      icon: LayoutDashboard },
  { label: "Courriers",         to: "/secretaire/courriers",            icon: Mail },
  { label: "Clients",           to: "/secretaire/clients",              icon: Users },
  { label: "Étudiants",        to: "/secretaire/etudiants",            icon: GraduationCap },
  { label: "Validations",       to: "/secretaire/validations",          icon: FileCheck2 },
  { label: "Attribution",       to: "/secretaire/attribution",          icon: UserPlus },
  { label: "Messagerie",        to: "/secretaire/messages",             icon: MessageSquare },
  { label: "RDV Étudiants",    to: "/secretaire/rendez-vous-etudiants", icon: CalendarClock },
  { label: "Mon Profil",       to: "/secretaire/profil",                icon: UserCircle },
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
