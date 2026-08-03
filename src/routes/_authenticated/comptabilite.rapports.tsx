import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Plus, TrendingUp, Download, Calendar, CheckCircle2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/comptabilite/rapports")({
  component: ComptabiliteRapports,
});

const db = supabase as any;

const QUARTERS = [
  { value: "T1", label: "T1 — Janvier à Mars" },
  { value: "T2", label: "T2 — Avril à Juin" },
  { value: "T3", label: "T3 — Juillet à Septembre" },
  { value: "T4", label: "T4 — Octobre à Décembre" },
];

type Report = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  total_income: number | null;
  total_expenses: number | null;
  net_result: number | null;
  status: string;
  notes: string | null;
  created_at: string;
};

function ComptabiliteRapports() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    quarter: "T1",
    year: new Date().getFullYear().toString(),
    total_income: "",
    total_expenses: "",
    notes: "",
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["financial-reports"],
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_reports")
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const createReport = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Non authentifié");
      const income = form.total_income ? parseFloat(form.total_income) : null;
      const expenses = form.total_expenses ? parseFloat(form.total_expenses) : null;
      const net = income != null && expenses != null ? income - expenses : null;
      const { error } = await db.from("financial_reports").insert({
        created_by: uid,
        title: `Rapport financier ${form.quarter} ${form.year}`,
        quarter: form.quarter,
        year: parseInt(form.year),
        total_income: income,
        total_expenses: expenses,
        net_result: net,
        status: "brouillon",
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rapport créé");
      qc.invalidateQueries({ queryKey: ["financial-reports"] });
      setShowNew(false);
      setForm({ quarter: "T1", year: new Date().getFullYear().toString(), total_income: "", total_expenses: "", notes: "" });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const publishReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("financial_reports").update({ status: "publie" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rapport publié");
      qc.invalidateQueries({ queryKey: ["financial-reports"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const formatAmount = (v: number | null) =>
    v != null ? `${v.toLocaleString("fr-FR")} FCFA` : "—";

  return (
    <>
      <PageHeader
        eyebrow="Finance & Comptabilité"
        title="Rapports financiers trimestriels"
        description="Produisez et consultez les rapports financiers par trimestre."
      />

      <Panel
        title="Tous les rapports"
        action={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="mr-2 size-4" /> Nouveau rapport
          </Button>
        }
      >
        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <TrendingUp className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucun rapport généré.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const isPositive = (r.net_result ?? 0) >= 0;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {r.quarter} {r.year}
                        </span>
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          r.status === "publie" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {r.status === "publie" ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                          {r.status === "publie" ? "Publié" : "Brouillon"}
                        </span>
                      </div>
                      <h3 className="mt-1 font-semibold">{r.title}</h3>
                    </div>
                    <div className="flex gap-2">
                      {r.status === "brouillon" && (
                        <Button size="sm" variant="outline" className="h-8 text-xs"
                          onClick={() => publishReport.mutate(r.id)}>
                          <CheckCircle2 className="mr-1.5 size-3" /> Publier
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 rounded-lg bg-muted/40 p-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Recettes</div>
                      <div className="mt-0.5 text-sm font-bold text-green-700">{formatAmount(r.total_income)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Dépenses</div>
                      <div className="mt-0.5 text-sm font-bold text-red-600">{formatAmount(r.total_expenses)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Résultat net</div>
                      <div className={`mt-0.5 text-sm font-bold ${isPositive ? "text-green-700" : "text-red-600"}`}>
                        {r.net_result != null ? `${isPositive ? "+" : ""}${r.net_result.toLocaleString("fr-FR")} FCFA` : "—"}
                      </div>
                    </div>
                  </div>
                  {r.notes && (
                    <p className="mt-2 text-xs text-muted-foreground">{r.notes}</p>
                  )}
                  <div className="mt-2 text-right text-[10px] text-muted-foreground">
                    Créé le {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Dialog open={showNew} onOpenChange={(o) => { if (!o) setShowNew(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau rapport financier trimestriel</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Trimestre *</Label>
                <Select value={form.quarter} onValueChange={(v) => setForm((f) => ({ ...f, quarter: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{QUARTERS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Année *</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Total recettes (FCFA)</Label>
                <Input type="number" value={form.total_income} onChange={(e) => setForm((f) => ({ ...f, total_income: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total dépenses (FCFA)</Label>
                <Input type="number" value={form.total_expenses} onChange={(e) => setForm((f) => ({ ...f, total_expenses: e.target.value }))} className="mt-1" />
              </div>
            </div>
            {form.total_income && form.total_expenses && (
              <div className="rounded-lg bg-muted/50 p-3 text-center text-sm">
                Résultat net estimé :{" "}
                <span className={`font-bold ${parseFloat(form.total_income) - parseFloat(form.total_expenses) >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {(parseFloat(form.total_income) - parseFloat(form.total_expenses)).toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Notes / Commentaires</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button disabled={!form.quarter || !form.year || createReport.isPending} onClick={() => createReport.mutate()}>
              {createReport.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Générer le rapport
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
