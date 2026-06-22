import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/projets/cahier-des-charges/$projectId")({
  component: CahierDesCharges,
});

const BRANCH_LABELS: Record<string, string> = {
  sites_logiciels: "Sites & Logiciels",
  automatisation: "Automatisation",
  accompagnement: "Accompagnement",
  autre: "Autre",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
  bloque: "Bloqué",
};

function CahierDesCharges() {
  const { projectId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["cahier-des-charges", projectId],
    queryFn: async () => {
      const [projectRes, featuresRes, tasksRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("project_features").select("*").eq("project_id", projectId).order("created_at"),
        supabase.from("project_tasks").select("*").eq("project_id", projectId).order("created_at"),
      ]);
      if (projectRes.error) throw projectRes.error;
      return {
        project: projectRes.data,
        features: featuresRes.data ?? [],
        tasks: tasksRes.data ?? [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.project) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Projet introuvable.</div>;
  }

  const { project: p, features, tasks } = data;
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const objectifsList = (p.objectives ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const contraintesList = (p.tech_constraints ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      {/* Barre d'action (masquée à l'impression) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          to="/projets/liste"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" /> Retour aux projets
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 size-4" /> Imprimer / Exporter en PDF
        </Button>
      </div>

      {!p.partner_logo_url && (
        <div className="mb-6 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 print:hidden">
          Aucun logo partenaire téléversé. Ajoutez-le depuis « Modifier le projet » pour qu'il apparaisse sur la page de garde.
        </div>
      )}

      <div className="mx-auto max-w-[210mm] bg-white text-black shadow-sm print:max-w-none print:shadow-none">
        {/* ───────────── PAGE DE GARDE ───────────── */}
        <section className="flex min-h-[270mm] flex-col border border-border p-12 print:border-0 print:break-after-page">
          <div className="flex items-center justify-between">
            {p.partner_logo_url ? (
              <img src={p.partner_logo_url} alt="Logo partenaire" className="h-20 w-auto object-contain" />
            ) : (
              <div className="h-20 w-32 rounded border border-dashed border-gray-300" />
            )}
            <img src="/1.png" alt="Rézo Campus Consulting" className="h-16 w-auto object-contain" />
          </div>

          {p.client && (
            <p className="mt-10 text-center text-lg font-semibold uppercase tracking-wide text-blue-900">
              {p.client}
            </p>
          )}

          <div className="my-auto py-16 text-center">
            <div className="mx-auto h-1 w-24 bg-amber-500" />
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900">CAHIER DES CHARGES</h1>
            <div className="mx-auto mt-6 h-1 w-24 bg-amber-500" />
            <h2 className="mt-8 text-2xl font-semibold text-blue-900">« {p.name} »</h2>
            {p.description && (
              <p className="mx-auto mt-4 max-w-md text-sm text-gray-600">{p.description}</p>
            )}
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Document préparé et proposé par</p>
            <p className="text-base font-semibold text-blue-900">Rézo Campus Consulting</p>
            <p className="text-xs">Conseil • Digitalisation • Solutions logicielles</p>
            <p className="text-xs">Brazzaville (Congo) — Casablanca (Maroc)</p>
            <p className="mt-6 text-xs italic">Version 1.0 — {today}</p>
          </div>
        </section>

        {/* ───────────── 1. PRÉSENTATION ───────────── */}
        <Section number="1" title="Présentation du projet">
          <SubSection number="1.1" title="Contexte">
            <p>{p.description || "—"}</p>
          </SubSection>
          <SubSection number="1.2" title="Objectifs stratégiques">
            {objectifsList.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {objectifsList.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            ) : <p>—</p>}
          </SubSection>
          <SubSection number="1.3" title="Audience cible">
            <p>{p.target_audience || "—"}</p>
          </SubSection>
        </Section>

        {/* ───────────── 2. FONCTIONNALITÉS ───────────── */}
        <Section number="2" title="Fonctionnalités attendues">
          {features.length === 0 ? (
            <p>Aucune fonctionnalité renseignée pour ce projet.</p>
          ) : (
            <div className="space-y-4">
              {features.map((f, i) => (
                <div key={f.id}>
                  <p className="font-semibold text-blue-800">2.{i + 1}. {f.title}</p>
                  {f.description && <p className="mt-1">{f.description}</p>}
                  {f.acceptance_criteria && (
                    <p className="mt-1 text-sm italic text-gray-600">
                      Critères d'acceptation : {f.acceptance_criteria}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ───────────── 3. EXIGENCES TECHNIQUES ───────────── */}
        <Section number="3" title="Exigences techniques">
          {contraintesList.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {contraintesList.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          ) : <p>Aucune contrainte technique particulière n'a été renseignée.</p>}
        </Section>

        {/* ───────────── 4. DÉROULEMENT DU PROJET ───────────── */}
        <Section number="4" title="Déroulement du projet">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="border border-gray-300 p-2 text-left">Étape</th>
                <th className="border border-gray-300 p-2 text-left">Statut</th>
                <th className="border border-gray-300 p-2 text-left">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border border-gray-300 p-2 text-center text-gray-500">
                    Planning non détaillé.
                  </td>
                </tr>
              ) : tasks.map((t) => (
                <tr key={t.id}>
                  <td className="border border-gray-300 p-2">{t.title}</td>
                  <td className="border border-gray-300 p-2">{TASK_STATUS_LABELS[t.status] ?? t.status}</td>
                  <td className="border border-gray-300 p-2">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <p><strong>Date de début :</strong> {p.start_date ? new Date(p.start_date).toLocaleDateString("fr-FR") : "—"}</p>
            <p><strong>Date de livraison prévue :</strong> {p.end_date ? new Date(p.end_date).toLocaleDateString("fr-FR") : "—"}</p>
          </div>
        </Section>

        {/* ───────────── 5. INFORMATIONS COMPLÉMENTAIRES ───────────── */}
        <Section number="5" title="Informations complémentaires">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <Row label="Client / Partenaire" value={p.client || "—"} />
              <Row label="Branche d'activité" value={BRANCH_LABELS[p.branch] ?? p.branch} />
              <Row label="Budget estimé" value={p.budget ? `${p.budget.toLocaleString("fr-FR")} FCFA` : "—"} />
              <Row label="Statut des spécifications" value={p.validated_spec ? "Validées" : "En cours de validation"} />
            </tbody>
          </table>
        </Section>

        {/* ───────────── 6. VALIDATION ───────────── */}
        <Section number="6" title="Validation">
          <p>
            Le présent cahier des charges, établi sur la base des informations communiquées par les deux parties,
            engage celles-ci après signature ci-dessous.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-10 text-sm">
            <div>
              <p className="font-semibold">Pour {p.client || "le partenaire"}</p>
              <p className="text-gray-500">La Direction</p>
              <div className="mt-16 border-t border-gray-400 pt-1 text-xs text-gray-500">Date et signature</div>
            </div>
            <div>
              <p className="font-semibold">Pour Rézo Campus Consulting</p>
              <p className="text-gray-500">Direction des Affaires Extérieures</p>
              <div className="mt-16 border-t border-gray-400 pt-1 text-xs text-gray-500">Date et signature</div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="border-b border-gray-200 px-12 py-8 print:break-inside-avoid">
      <h2 className="border-b-2 border-amber-500 pb-2 text-xl font-bold text-blue-900">
        {number}. {title}
      </h2>
      <div className="mt-4 text-sm leading-relaxed text-gray-800">{children}</div>
    </section>
  );
}

function SubSection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-blue-800">{number}. {title}</h3>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-1/3 border border-gray-300 bg-gray-50 p-2 font-medium">{label}</td>
      <td className="border border-gray-300 p-2">{value}</td>
    </tr>
  );
}
