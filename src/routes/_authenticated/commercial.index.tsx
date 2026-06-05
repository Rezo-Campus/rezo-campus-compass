import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/commercial/")({
  component: CommercialDashboard,
});

const STATUS_LABELS: Record<string, string> = {
  prospection: "Prospection",
  en_negociation: "En négociation",
  gagne: "Gagné",
  perdu: "Perdu",
  en_attente: "En attente",
  annule: "Annulé",
};

const TYPE_LABELS: Record<string, string> = {
  partenariat: "Partenariat",
  forum: "Forum / Événement",
  visite: "Visite terrain",
  suivi_livraison: "Suivi livraison",
  solution_numerique: "Solution numérique",
  prospection: "Prospection",
  autre: "Autre",
};

const STATUS_COLORS: Record<string, string> = {
  prospection: "bg-blue-100 text-blue-700",
  en_negociation: "bg-yellow-100 text-yellow-700",
  gagne: "bg-green-100 text-green-700",
  perdu: "bg-red-100 text-red-500",
  en_attente: "bg-gray-100 text-gray-600",
  annule: "bg-gray-100 text-gray-400",
};

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
}

function CommercialDashboard() {
  const { data: leads = [] } = useQuery({
    queryKey: ["commercial-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commercial_leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = leads.length;
  const prospection = leads.filter((l) => l.status === "prospection").length;
  const enNegociation = leads.filter((l) => l.status === "en_negociation").length;
  const gagnes = leads.filter((l) => l.status === "gagne").length;
  const perdus = leads.filter((l) => l.status === "perdu").length;

  const valeurPipeline = leads
    .filter((l) => !["perdu", "annule"].includes(l.status) && l.value)
    .reduce((s, l) => s + (l.value ?? 0), 0);
  const valeurGagnes = leads
    .filter((l) => l.status === "gagne" && l.value)
    .reduce((s, l) => s + (l.value ?? 0), 0);

  const recent = leads.slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Marketing & Commercial"
        title="Tableau de bord"
        description="Suivi des opportunités, partenariats et activités commerciales."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total activités" value={String(total)} icon={Target} />
        <StatCard label="En cours" value={String(prospection + enNegociation)} icon={Clock} hint="Prospection + négociation" />
        <StatCard label="Gagnés" value={String(gagnes)} icon={CheckCircle2} hint={valeurGagnes > 0 ? fmt(valeurGagnes) : undefined} />
        <StatCard label="Valeur pipeline" value={fmt(valeurPipeline)} icon={TrendingUp} hint="Hors perdus/annulés" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Pipeline */}
        <Panel title="Vue pipeline">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité.</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const count = leads.filter((l) => l.status === status).length;
                if (count === 0) return null;
                const val = leads.filter((l) => l.status === status).reduce((s, l) => s + (l.value ?? 0), 0);
                return (
                  <li key={status} className="flex items-center gap-3">
                    <span className={`w-32 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-medium ${STATUS_COLORS[status]}`}>{label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{count}</span>
                    {val > 0 && <span className="text-xs text-muted-foreground">{fmt(val)}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Activités récentes */}
        <Panel title="Activités récentes" action={
          <Link to="/commercial/activites" className="text-xs text-primary hover:underline">Voir tout →</Link>
        }>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{l.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{TYPE_LABELS[l.type] ?? l.type}</span>
                      {l.contact_name && <span>· {l.contact_name}</span>}
                      {l.scheduled_at && <span>· {new Date(l.scheduled_at).toLocaleDateString("fr-FR")}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[l.status]}`}>
                      {STATUS_LABELS[l.status]}
                    </span>
                    {l.value && <span className="text-xs font-semibold text-primary">{fmt(l.value)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/commercial/activites" className="mt-3 block text-center text-xs text-primary hover:underline">
            Gérer les activités →
          </Link>
        </Panel>

        {/* Stats par type */}
        <Panel title="Répartition par type d'activité">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(TYPE_LABELS).map(([type, label]) => {
                const count = leads.filter((l) => l.type === type).length;
                if (count === 0) return null;
                return (
                  <li key={type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 overflow-hidden rounded-full bg-muted h-1.5">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Accès rapides */}
        <Panel title="Actions rapides">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Nouveau partenariat", type: "partenariat", desc: "Contacter une organisation" },
              { label: "Organiser un forum", type: "forum", desc: "Événement ou salon" },
              { label: "Visite terrain", type: "visite", desc: "Présenter nos services" },
              { label: "Solution numérique", type: "solution_numerique", desc: "Proposer à une entreprise" },
            ].map((item) => (
              <Link
                key={item.type}
                to="/commercial/activites"
                className="flex flex-col gap-1 rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/40"
              >
                <Target className="size-5 text-primary" />
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
