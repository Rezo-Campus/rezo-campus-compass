import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, ArrowLeftRight, ClipboardList, Calendar, CalendarDays, MessageSquare, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/aadf",              icon: LayoutDashboard },
  { label: "Transmissions",   to: "/aadf/transmissions", icon: ArrowLeftRight },
  { label: "Tâches",          to: "/aadf/taches",        icon: ClipboardList },
  { label: "Agenda",          to: "/aadf/agenda",        icon: Calendar },
  { label: "Réunions",        to: "/aadf/reunions",      icon: CalendarDays },
  { label: "Protocoles",      to: "/aadf/protocoles",    icon: FileText },
  { label: "Messagerie",      to: "/aadf/messages",      icon: MessageSquare },
];

export const Route = createFileRoute("/_authenticated/aadf")({
  component: () => (
    <RoleGuard allow={["admin", "aadf"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
