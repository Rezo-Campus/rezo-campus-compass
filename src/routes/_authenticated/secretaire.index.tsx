import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Users, GraduationCap, ArrowRight, Inbox, Send } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard-bits";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/secretaire/")({
  component: SecretaireDashboard,
});

function SecretaireDashboard() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  const { data: stats } = useQuery({
    enabled: !!uid,
    queryKey: ["secretaire-stats"],
    queryFn: async () => {
      const [entrant, sortant, clients, etudiants] = await Promise.all([
        supabase.from("courriers").select("id", { count: "exact", head: true }).eq("type", "entrant"),
        supabase.from("courriers").select("id", { count: "exact", head: true }).eq("type", "sortant"),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        entrant: entrant.count ?? 0,
        sortant: sortant.count ?? 0,
        clients: clients.count ?? 0,
        etudiants: etudiants.count ?? 0,
      };
    },
  });

  const { data: recentCourriers = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["secretaire-recent-courriers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courriers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Secrétariat Particulier"
        title="Tableau de bord"
        description="Gérez les courriers, clients et consultez les dossiers étudiants."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Courriers entrants" value={stats?.entrant ?? 0} icon={Inbox} />
        <StatCard label="Courriers sortants" value={stats?.sortant ?? 0} icon={Send} />
        <StatCard label="Clients enregistrés" value={stats?.clients ?? 0} icon={Users} />
        <StatCard label="Étudiants" value={stats?.etudiants ?? 0} icon={GraduationCap} />
      </div>

      {/* Raccourcis */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Link
          to="/secretaire/courriers"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:bg-muted/30 transition"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Courriers</div>
              <div className="text-xs text-muted-foreground">Entrant &amp; sortant</div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>

        <Link
          to="/secretaire/clients"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:bg-muted/30 transition"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Users className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Clients</div>
              <div className="text-xs text-muted-foreground">Particuliers &amp; entreprises</div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>

        <Link
          to="/secretaire/etudiants"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:bg-muted/30 transition"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Étudiants</div>
              <div className="text-xs text-muted-foreground">Profils &amp; dossiers</div>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Courriers récents */}
      {recentCourriers.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Courriers récents</h2>
            <Link to="/secretaire/courriers" className="text-xs text-primary hover:underline">
              Voir tout
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentCourriers.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                  c.type === "entrant" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {c.type === "entrant" ? <Inbox className="size-4" /> : <Send className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.objet}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.type === "entrant" ? `De : ${c.expediteur || "—"}` : `À : ${c.destinataire || "—"}`}
                    {" · "}{new Date(c.date_courrier).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  c.type === "entrant" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {c.type === "entrant" ? "Entrant" : "Sortant"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
