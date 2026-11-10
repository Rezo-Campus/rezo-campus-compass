import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users2,
  Receipt,
  TrendingUp,
  ArrowLeftRight,
  UserCircle,
  Megaphone,
  CalendarRange,
  Mail,
  Banknote,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";

const NAV = [
  { label: "Tableau de bord", to: "/commercial", icon: LayoutDashboard },
  { label: "Contacts & Leads", to: "/commercial/activites", icon: Users2 },
  { label: "Campagnes", to: "/commercial/marketing", icon: Megaphone },
  { label: "Calendrier éditorial", to: "/commercial/calendrier-editorial", icon: CalendarRange },
  { label: "Analyses", to: "/commercial/analyses", icon: TrendingUp },
  { label: "Réunions", to: "/commercial/reunions", icon: CalendarDays },
  { label: "Transmissions internes", to: "/commercial/courriers", icon: Mail },
  { label: "Mes bulletins de paie", to: "/commercial/bulletins-paie", icon: Banknote },
  { label: "Transmettre AADF", to: "/commercial/transmission", icon: ArrowLeftRight },
  { label: "Facturation", to: "/commercial/facturation", icon: Receipt },
  { label: "Mon Profil", to: "/commercial/profil", icon: UserCircle },
];

export const Route = createFileRoute("/_authenticated/commercial")({
  component: () => (
    <RoleGuard allow={["admin", "commercial"]}>
      <AppShell nav={NAV}>
        <Outlet />
      </AppShell>
    </RoleGuard>
  ),
});
