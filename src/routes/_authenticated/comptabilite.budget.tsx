import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Plus, PieChart, TrendingUp, TrendingDown, DollarSign,
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

export const Route = createFileRoute("/_authenticated/comptabilite/budget")({
  component: ComptabiliteBudget,
});

const db = supabase as any;

const CATEGORIES = [
  { value: "personnel",    label: "Personnel / RH" },
  { value: "marketing",    label: "Marketing & Communication" },
  { value: "operations",   label: "Opérations" },
  { value: "it",           label: "Informatique & Technologie" },
  { value: "formation",    label: "Formation" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "imprevu",      label: "Imprévus" },
  { value: "autre",        label: "Autre" },
];

type BudgetLine = {
  id: string;
  label: string;
  category: string;
  amount_planned: number;
  amount_spent: number | null;
  period: string;
  notes: string | null;
  created_at: string;
};

function ComptabiliteBudget() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [form, setForm] = useState({
    label: "",
    category: "operations",
    amount_planned: "",
    amount_spent: "",
    period: new Date().getFullYear().toString(),
    notes: "",
  });

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["budget-lines", filterYear],
    queryFn: async () => {
      let q = db.from("budget_lines").select("*");
      if (filterYear) q = q.eq("period", filterYear);
      const { data, error } = await q.order("category");
      if (error) throw error;
      return (data ?? []) as BudgetLine[];
    },
  });

  const addLine = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Non authentifié");
      const { error } = await db.from("budget_lines").insert({
        created_by: uid,
        label: form.label,
        category: form.category,
        amount_planned: parseFloat(form.amount_planned),
        amount_spent: form.amount_spent ? parseFloat(form.amount_spent) : null,
        period: form.period,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ligne budgétaire ajoutée");
      qc.invalidateQueries({ queryKey: ["budget-lines"] });
      setShowNew(false);
      setForm({ label: "", category: "operations", amount_planned: "", amount_spent: "", period: new Date().getFullYear().toString(), notes: "" });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const totalPlanned = lines.reduce((acc, l) => acc + l.amount_planned, 0);
  const totalSpent = lines.reduce((acc, l) => acc + (l.amount_spent ?? 0), 0);
  const remaining = totalPlanned - totalSpent;
  const usageRate = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;

  const byCategory = lines.reduce((acc: Record<string, { planned: number; spent: number }>, l) => {
    if (!acc[l.category]) acc[l.category] = { planned: 0, spent: 0 };
    acc[l.category].planned += l.amount_planned;
    acc[l.category].spent += l.amount_spent ?? 0;
    return acc;
  }, {});

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

  return (
    <>
      <PageHeader
        eyebrow="Finance & Comptabilité"
        title="Provisions budgétaires"
        description="Planifiez et suivez les prévisions budgétaires par catégorie et par période."
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-lg font-bold">{totalPlanned.toLocaleString("fr-FR")}</div>
          <div className="text-[10px] text-muted-foreground">Budget total (FCFA)</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-lg font-bold text-red-700">{totalSpent.toLocaleString("fr-FR")}</div>
          <div className="text-[10px] text-red-600">Dépensé (FCFA)</div>
        </div>
        <div className={`rounded-xl border p-4 text-center ${remaining >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <div className={`text-lg font-bold ${remaining >= 0 ? "text-green-700" : "text-red-700"}`}>
            {remaining.toLocaleString("fr-FR")}
          </div>
          <div className={`text-[10px] ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>Restant (FCFA)</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-lg font-bold">{usageRate}%</div>
          <div className="text-[10px] text-muted-foreground">Taux d'utilisation</div>
        </div>
      </div>

      {/* Barre de progression globale */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex justify-between text-xs">
          <span className="font-medium">Consommation du budget {filterYear}</span>
          <span className="text-muted-foreground">{usageRate}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${usageRate > 90 ? "bg-red-500" : usageRate > 70 ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${Math.min(usageRate, 100)}%` }}
          />
        </div>
      </div>

      <Panel
        title="Lignes budgétaires"
        action={
          <div className="flex items-center gap-2">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="mr-2 size-4" /> Ajouter
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <PieChart className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucune provision budgétaire pour {filterYear}.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Sous-totaux par catégorie */}
            {Object.entries(byCategory).map(([cat, vals]) => {
              const catLabel = CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
              const catLines = lines.filter((l) => l.category === cat);
              const catRate = vals.planned > 0 ? Math.round((vals.spent / vals.planned) * 100) : 0;
              return (
                <div key={cat} className="rounded-xl border border-border">
                  <div className="flex items-center justify-between rounded-t-xl bg-muted/40 px-4 py-2">
                    <span className="text-xs font-semibold">{catLabel}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Prévu : {vals.planned.toLocaleString("fr-FR")} FCFA</span>
                      <span>·</span>
                      <span>Dépensé : {vals.spent.toLocaleString("fr-FR")} FCFA</span>
                      <span className={`font-bold ${catRate > 90 ? "text-red-600" : catRate > 70 ? "text-amber-600" : "text-green-600"}`}>
                        {catRate}%
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-border/50">
                    {catLines.map((l) => {
                      const rate = l.amount_planned > 0 ? Math.round(((l.amount_spent ?? 0) / l.amount_planned) * 100) : 0;
                      return (
                        <div key={l.id} className="flex items-center gap-4 px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">{l.label}</div>
                            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rate > 90 ? "bg-red-500" : rate > 70 ? "bg-amber-500" : "bg-primary"}`}
                                style={{ width: `${Math.min(rate, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <div className="font-medium">{l.amount_planned.toLocaleString("fr-FR")}</div>
                            <div className="text-muted-foreground">{(l.amount_spent ?? 0).toLocaleString("fr-FR")} dép.</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Dialog open={showNew} onOpenChange={(o) => { if (!o) setShowNew(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle provision budgétaire</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Libellé *</Label>
              <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Période (Année)</Label>
                <Select value={form.period} onValueChange={(v) => setForm((f) => ({ ...f, period: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Montant prévu (FCFA) *</Label>
                <Input type="number" value={form.amount_planned} onChange={(e) => setForm((f) => ({ ...f, amount_planned: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Montant dépensé (FCFA)</Label>
                <Input type="number" value={form.amount_spent} onChange={(e) => setForm((f) => ({ ...f, amount_spent: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button disabled={!form.label.trim() || !form.amount_planned || addLine.isPending} onClick={() => addLine.mutate()}>
              {addLine.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
