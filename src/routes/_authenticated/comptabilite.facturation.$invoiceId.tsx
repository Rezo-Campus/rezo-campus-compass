import { createFileRoute, Link, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Printer, Mail, Phone, MapPin } from "lucide-react";
import type { CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/comptabilite/facturation/$invoiceId")({
  component: FactureDetail,
});

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
  annulee: "Annulée",
};

function clientLabel(c?: { type: string; prenom?: string | null; nom?: string | null; nom_entreprise?: string | null } | null) {
  if (!c) return "—";
  if (c.type === "entreprise") return c.nom_entreprise || "—";
  return [c.prenom, c.nom].filter(Boolean).join(" ") || "—";
}

export function FactureDetail() {
  const { invoiceId } = useParams({ strict: false }) as { invoiceId: string };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = pathname.split("/")[1] || "comptabilite";

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-detail", invoiceId],
    queryFn: async () => {
      const { data: invoice, error } = await supabase
        .from("invoices").select("*").eq("id", invoiceId).single();
      if (error) throw error;

      const [linesRes, clientRes] = await Promise.all([
        supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("position"),
        invoice.client_id
          ? supabase.from("clients").select("*").eq("id", invoice.client_id).single()
          : Promise.resolve({ data: null }),
      ]);

      return {
        invoice,
        lines: linesRes.data ?? [],
        client: clientRes.data,
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

  if (!data?.invoice) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Facture introuvable.</div>;
  }

  const { invoice, lines, client } = data;
  const total = lines.reduce((sum, l) => sum + Number(l.montant), 0);

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      {/* Barre d'action (masquée à l'impression) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          to={`/${section}/facturation` as "/comptabilite/facturation"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" /> Retour aux factures
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 size-4" /> Imprimer / Exporter en PDF
        </Button>
      </div>

      <div
        className="mx-auto max-w-[210mm] bg-white p-12 text-black shadow-sm print:m-0 print:w-full print:max-w-full print:p-0 print:shadow-none"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", colorAdjust: "exact" } as CSSProperties}
      >
        {/* En-tête */}
        <div className="flex items-start justify-between border-b-2 border-primary pb-6">
          <div>
            <img src="/1.png" alt="Rézo Campus" className="h-14 w-auto object-contain" />
            <p className="mt-2 text-xs text-gray-600">Recrutement · Accompagnement · Solutions numériques</p>
            <p className="text-xs text-gray-600">campusrezo@gmail.com · +242 06 668 5543</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">FACTURE</h1>
            <p className="mt-1 text-sm text-gray-600">N° {invoice.numero}</p>
            <p className="text-sm text-gray-600">
              {new Date(invoice.date_facture).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
              {STATUS_LABELS[invoice.status] ?? invoice.status}
            </span>
          </div>
        </div>

        {/* Client */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Facturé à</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{clientLabel(client)}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-600">
            {client?.email && <span className="flex items-center gap-1"><Mail className="size-3.5" /> {client.email}</span>}
            {client?.telephone && <span className="flex items-center gap-1"><Phone className="size-3.5" /> {client.telephone}</span>}
            {client?.adresse_physique && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {client.adresse_physique}</span>}
          </div>
        </div>

        {/* Lignes */}
        <table className="mt-8 w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "45%" }} />
            <col style={{ width: "25%" }} />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-gray-300 text-left text-gray-700">
              <th className="py-2">Service</th>
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Montant (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-200">
                <td className="py-2 pr-2 font-medium break-words">{l.service}</td>
                <td className="py-2 pr-2 text-gray-600 break-words">{l.description || "—"}</td>
                <td className="py-2 text-right whitespace-nowrap">{Number(l.montant).toLocaleString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="py-3 text-right font-semibold">Total</td>
              <td className="py-3 text-right text-lg font-bold">{total.toLocaleString("fr-FR")} FCFA</td>
            </tr>
          </tfoot>
        </table>

        {/* Conditions */}
        {invoice.conditions && (
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conditions de paiement</p>
            <p className="mt-1 text-sm text-gray-700">{invoice.conditions}</p>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* Signature */}
        <div className="mt-12 flex justify-end">
          <div className="w-64 text-center text-sm">
            <p className="font-semibold text-gray-900">Direction Financière et des Ressources Humaines</p>
            <div className="mt-16 border-t border-gray-400 pt-1 text-xs text-gray-500">Date et signature</div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          Rézo Campus SARL — Local sis avenue de l'OUA, bloc 88-91, quartier Moukoundzi Ngouaka, Arr. 1 Makélékélé — Brazzaville, République du Congo.
        </div>
      </div>
    </div>
  );
}
