import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  MessageSquare,
  CalendarDays,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";

const NAV = [
  { label: "Tableau de bord", to: "/conseiller", icon: LayoutDashboard },
  { label: "Mes étudiants", to: "/conseiller/etudiants", icon: Users },
  { label: "Validations", to: "/conseiller/validations", icon: FileCheck2 },
  { label: "Messagerie", to: "/conseiller/messages", icon: MessageSquare },
  { label: "Rendez-vous", to: "/conseiller/rendez-vous", icon: CalendarDays },
  { label: "Ressources", to: "/conseiller/ressources", icon: BookOpen },
];

export const Route = createFileRoute("/_authenticated/conseiller")({
  component: () => (
    <RoleGuard allow={["conseiller"]}>
      <AppShell nav={NAV}>
        <ConseillerDashboard />
      </AppShell>
    </RoleGuard>
  ),
});

function ConseillerDashboard() {
  return (
    <>
      <PageHeader
        eyebrow="Espace conseiller"
        title="Vue d'ensemble"
        description="Suivez vos étudiants, vos validations et vos rendez-vous à venir."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Étudiants assignés" value="0" icon={Users} hint="actifs" />
        <StatCard label="Documents en attente" value="0" icon={FileCheck2} hint="à valider" />
        <StatCard label="Messages non lus" value="0" icon={MessageSquare} hint="aujourd'hui" />
        <StatCard label="RDV cette semaine" value="0" icon={CalendarDays} trend="—" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Activité récente"
            description="Les dernières actions de vos étudiants apparaîtront ici."
          >
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Aucune activité pour le moment.
            </div>
          </Panel>
        </div>

        <Panel title="Performances" description="Cette semaine">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Documents validés</span>
              <span className="font-semibold">0</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Dossiers complétés</span>
              <span className="font-semibold">0</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Taux de réponse</span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <TrendingUp className="size-3" /> —
              </span>
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
