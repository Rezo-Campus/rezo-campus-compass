import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { doPrintFacture } from "@/components/FacturesPage";
import type { Facture } from "@/components/FacturesPage";

export const Route = createFileRoute("/_authenticated/comptabilite/facturation/$invoiceId")({
  component: FactureDetail,
});

const db = supabase as any;

export function FactureDetail() {
  const { invoiceId } = useParams({ strict: false }) as { invoiceId: string };
  const navigate = useNavigate();

  const { data: facture, isLoading } = useQuery({
    queryKey: ["facture-detail", invoiceId],
    queryFn: async () => {
      const { data, error } = await db
        .from("factures").select("*").eq("id", invoiceId).single();
      if (error) throw error;
      return data as Facture;
    },
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!facture) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Facture introuvable.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: ".." as any })}>
          <ArrowLeft className="mr-2 size-4" /> Retour
        </Button>
        <h1 className="text-lg font-semibold">Facture {facture.number}</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          L'impression se fait directement depuis la liste des factures via le bouton <strong>Voir / Imprimer</strong>.
        </p>
        <Button onClick={() => doPrintFacture(facture)}>
          Imprimer cette facture
        </Button>
      </div>
    </div>
  );
}
