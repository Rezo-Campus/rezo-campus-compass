import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  MessageSquare,
  CalendarDays,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGuard } from "@/components/RoleGuard";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { useAuth } from "@/hooks/use-auth";

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
        <EtudiantDashboard />
      </AppShell>
    </RoleGuard>
  ),
});

function EtudiantDashboard() {
  const { data } = useAuth();
  const firstName = data?.profile?.full_name?.split(" ")[0] ?? "";

  return (
    <>
      <PageHeader
        eyebrow="Espace étudiant"
        title={`Bonjour ${firstName} 👋`}
        description="Voici un aperçu de l'avancement de votre dossier d'admission."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Progression" value="0%" hint="Dossier non démarré" icon={Sparkles} />
        <StatCard label="Documents" value="0/12" hint="à téléverser" icon={FileText} />
        <StatCard label="Messages" value="0" hint="non lus" icon={MessageSquare} />
        <StatCard label="Prochain RDV" value="—" hint="aucun planifié" icon={CalendarDays} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Prochaines étapes"
            description="Votre conseiller activera vos étapes au fur et à mesure."
          >
            <ol className="space-y-3">
              {[
                "Compléter votre profil personnel",
                "Téléverser vos pièces d'identité",
                "Choisir vos formations cibles",
                "Recevoir votre lettre d'orientation",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <div className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                    {i === 0 ? <Clock className="size-4" /> : <CheckCircle2 className="size-4 opacity-30" />}
                  </div>
                  <div className="flex-1 text-sm">{step}</div>
                  <span className="text-xs text-muted-foreground">
                    {i === 0 ? "En cours" : "À venir"}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <Panel title="Votre conseiller">
          <div className="flex items-center gap-3">
            <div
              className="grid size-12 place-items-center rounded-full text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              RC
            </div>
            <div>
              <div className="font-medium">À assigner</div>
              <div className="text-xs text-muted-foreground">
                Vous recevrez une notification dès qu'un conseiller vous sera attribué.
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
