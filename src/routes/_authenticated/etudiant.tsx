import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  MessageSquare,
  CalendarDays,
  User,
  GraduationCap,
  School,
  Send,
  Award,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/etudiant", icon: LayoutDashboard },
  { label: "Mon profil", to: "/etudiant/profil", icon: User },
  { label: "Mon dossier", to: "/etudiant/dossier", icon: FolderOpen },
  { label: "Parcours scolaire", to: "/etudiant/parcours", icon: GraduationCap },
  { label: "Documents", to: "/etudiant/documents", icon: FileText },
  { label: "Docs officiels", to: "/etudiant/documents-officiels", icon: Award },
  { label: "Écoles & formations", to: "/etudiant/ecoles", icon: School },
  { label: "Mes candidatures", to: "/etudiant/candidatures", icon: Send },
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
