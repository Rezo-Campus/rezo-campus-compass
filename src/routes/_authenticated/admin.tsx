import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  FileBarChart,
  Settings,
  GraduationCap,
  Globe,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";

const NAV = [
  { label: "Tableau de bord", to: "/admin", icon: LayoutDashboard },
  { label: "Dossiers", to: "/admin/dossiers", icon: FolderOpen },
  { label: "Utilisateurs", to: "/admin/utilisateurs", icon: Users },
  { label: "Rapports", to: "/admin/rapports", icon: FileBarChart },
  { label: "Paramètres", to: "/admin/parametres", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AppShell nav={NAV}>
        <AdminDashboard />
      </AppShell>
    </RoleGuard>
  ),
});

const data = [
  { m: "Jan", v: 12 },
  { m: "Fév", v: 18 },
  { m: "Mar", v: 24 },
  { m: "Avr", v: 31 },
  { m: "Mai", v: 28 },
  { m: "Juin", v: 42 },
  { m: "Juil", v: 55 },
];

function AdminDashboard() {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Pilotage de la plateforme"
        description="Vue consolidée des dossiers, des utilisateurs et de l'activité."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Étudiants" value="0" icon={GraduationCap} trend="+0%" hint="ce mois" />
        <StatCard label="Conseillers actifs" value="0" icon={Users} hint="comptes" />
        <StatCard label="Dossiers ouverts" value="0" icon={FolderOpen} hint="en cours" />
        <StatCard label="Pays représentés" value="0" icon={Globe} hint="audience" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Nouveaux étudiants"
            description="Évolution sur les 7 derniers mois (données de démonstration)."
            action={
              <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-xs font-medium text-accent-foreground">
                <TrendingUp className="size-3" /> +24%
              </span>
            }
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.11 195)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.55 0.11 195)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 200)" />
                  <XAxis dataKey="m" stroke="oklch(0.5 0.02 220)" fontSize={12} />
                  <YAxis stroke="oklch(0.5 0.02 220)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.91 0.01 200)",
                      background: "white",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="oklch(0.42 0.085 200)"
                    strokeWidth={2.5}
                    fill="url(#g)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Répartition par étape">
          <ul className="space-y-3 text-sm">
            {[
              { label: "Inscription", val: 0, color: "oklch(0.78 0.14 75)" },
              { label: "Dossier en cours", val: 0, color: "oklch(0.55 0.11 195)" },
              { label: "Soumis", val: 0, color: "oklch(0.42 0.085 200)" },
              { label: "Admis", val: 0, color: "oklch(0.62 0.16 145)" },
            ].map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.val}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.val}%`, background: row.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
