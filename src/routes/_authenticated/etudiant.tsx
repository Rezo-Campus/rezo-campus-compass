import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/etudiant", icon: LayoutDashboard },
  { label: "Mon dossier", to: "/etudiant/dossier", icon: FolderOpen },
  { label: "Documents", to: "/etudiant/documents", icon: FileText },
  { label: "Messagerie", to: "/etudiant/messages", icon: MessageSquare },
  { label: "Rendez-vous", to: "/etudiant/rendez-vous", icon: CalendarDays },
];

export const Route = createFileRoute("/_authenticated/etudiant")({
  component: () => (
    <RoleGuard allow={["etudiant"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
