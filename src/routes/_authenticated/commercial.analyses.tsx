import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users2, Megaphone, Target, BarChart3 } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/commercial/analyses")({
  component: CommercialAnalyses,
});

const db = supabase as any;

function CommercialAnalyses() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ["commercial-analyses-campaigns"],
    queryFn: async () => {
      const { data } = await db.from("marketing_campaigns").select("*");
      return data ?? [];
    },
  });

  const { data: transmissions = [] } = useQuery({
    queryKey: ["commercial-analyses-transmissions"],
    queryFn: async () => {
      const { data } = await db
        .from("dept_transmissions")
        .select("*")
        .in("sender_department", ["commercial", "marketing"]);
      return data ?? [];
    },
  });

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c: any) => c.status === "en_cours").length;
  const completedCampaigns = campaigns.filter((c: any) => c.status === "termine").length;
  const totalBudget = campaigns.reduce((acc: number, c: any) => acc + (c.budget ?? 0), 0);

  const byType = campaigns.reduce((acc: Record<string, number>, c: any) => {
    acc[c.type ?? "autre"] = (acc[c.type ?? "autre"] ?? 0) + 1;
    return acc;
  }, {});

  const TYPE_LABELS: Record<string, string> = {
    digital: "Digital / Réseaux sociaux",
    email: "Emailing",
    evenement: "Événement / Salon",
    print: "Print / Affichage",
    partenariat: "Partenariat",
    autre: "Autre",
  };

  return (
    <>
      <PageHeader
        eyebrow="Commerce & Marketing"
        title="Analyses"
        description="Vue d'ensemble des performances commerciales et marketing."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Campagnes totales"   value={String(totalCampaigns)}     icon={Megaphone} />
        <StatCard label="En cours"            value={String(activeCampaigns)}    icon={TrendingUp} />
        <StatCard label="Terminées"           value={String(completedCampaigns)} icon={Target} />
        <StatCard label="Transmissions AADF"  value={String(transmissions.length)} icon={BarChart3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Campagnes par type">
          {Object.keys(byType).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium">{TYPE_LABELS[type] ?? type}</span>
                      <span className="text-muted-foreground">{count as number}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: totalCampaigns > 0 ? `${((count as number) / totalCampaigns) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Budget total engagé">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-4xl font-bold text-primary">
              {totalBudget.toLocaleString("fr-FR")}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">FCFA</div>
            <div className="mt-6 w-full space-y-2">
              {campaigns.filter((c: any) => c.budget).slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[60%] text-muted-foreground">{c.title}</span>
                  <span className="font-medium">{(c.budget as number).toLocaleString("fr-FR")} FCFA</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
