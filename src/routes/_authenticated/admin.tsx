import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, FolderOpen, FileCheck2, MessageSquare, CalendarDays, School, CalendarClock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/admin", icon: LayoutDashboard },
  { label: "Utilisateurs", to: "/admin/utilisateurs", icon: Users },
  { label: "Dossiers", to: "/admin/dossiers", icon: FolderOpen },
  { label: "Validations", to: "/admin/validations", icon: FileCheck2 },
  { label: "Écoles", to: "/admin/ecoles", icon: School },
  { label: "Messages", to: "/admin/messages", icon: MessageSquare },
  { label: "Rendez-vous", to: "/admin/rendez-vous", icon: CalendarDays },
  { label: "RDV Clients", to: "/admin/rendez-vous-clients", icon: CalendarClock },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
