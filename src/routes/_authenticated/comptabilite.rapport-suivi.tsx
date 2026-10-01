import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Loader2, Plus, Trash2, ClipboardList, Printer, RefreshCw, ChevronDown, ChevronRight, PenLine } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BUDGET_ROWS, fmt } from "@/lib/budget-structure";
import type { BudgetRow } from "@/lib/budget-structure";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/comptabilite/rapport-suivi")({
  component: RapportSuivi,
});

const db = supabase as any;
const DK = "#1a5c3a";
const LG = "#d4edda";
const LY = "#fffde7";

/* ── Types ── */
type ItemVals = { budget: number; realise: number };
type RapportVals = Record<string, ItemVals>;
type RapportRecord = {
  id: string; period_start: string; period_end: string;
  vals: RapportVals; comments: string | null; created_at: string;
};
type CustomRow = { id: string; label: string; type: "sub" | "item"; parent_id: string; sort_order: number };

/* ── Date helpers ── */
function fmtDateShort(iso: string) { return new Date(iso).toLocaleDateString("fr-FR"); }
function fmtDatePeriod(d: string) {
  return d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "…………………";
}

/* ── Rows merge ── */
function buildAllRows(customRows: CustomRow[]): BudgetRow[] {
  const sections = BUDGET_ROWS.filter((r) => r.type === "section");
  const result: BudgetRow[] = [];
  sections.forEach((sec) => {
    result.push(sec);
    const builtinSubs = BUDGET_ROWS.filter((r) => r.type === "sub" && r.parentId === sec.id);
    builtinSubs.forEach((sub) => {
      result.push(sub);
      const builtinItems = BUDGET_ROWS.filter((r) => r.type === "item" && r.parentId === sub.id);
      builtinItems.forEach((item) => result.push(item));
      customRows.filter((r) => r.type === "item" && r.parent_id === sub.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach((r) => result.push({ id: r.id, label: r.label, type: "item", parentId: r.parent_id }));
    });
    customRows.filter((r) => r.type === "sub" && r.parent_id === sec.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((csub) => {
        result.push({ id: csub.id, label: csub.label, type: "sub", parentId: csub.parent_id });
        customRows.filter((r) => r.type === "item" && r.parent_id === csub.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .forEach((r) => result.push({ id: r.id, label: r.label, type: "item", parentId: r.parent_id }));
      });
  });
  return result;
}

function initVals(allRows: BudgetRow[]): RapportVals {
  const v: RapportVals = {};
  allRows.forEach((r) => { if (r.type === "item") v[r.id] = { budget: 0, realise: 0 }; });
  return v;
}

function computeRapport(vals: RapportVals, allRows: BudgetRow[]): Record<string, { budget: number; realise: number }> {
  const r: Record<string, { budget: number; realise: number }> = {};
  allRows.forEach((row) => {
    if (row.type === "item") r[row.id] = { budget: Number(vals[row.id]?.budget) || 0, realise: Number(vals[row.id]?.realise) || 0 };
  });
  allRows.forEach((row) => {
    if (row.type === "sub") {
      const items = allRows.filter((x) => x.type === "item" && x.parentId === row.id);
      r[row.id] = items.reduce(
        (acc, it) => ({ budget: acc.budget + (r[it.id]?.budget || 0), realise: acc.realise + (r[it.id]?.realise || 0) }),
        { budget: 0, realise: 0 }
      );
    }
  });
  allRows.forEach((row) => {
    if (row.type === "section") {
      const subs = allRows.filter((x) => x.type === "sub" && x.parentId === row.id);
      r[row.id] = subs.reduce(
        (acc, s) => ({ budget: acc.budget + (r[s.id]?.budget || 0), realise: acc.realise + (r[s.id]?.realise || 0) }),
        { budget: 0, realise: 0 }
      );
    }
  });
  return r;
}

function pct(realise: number, budget: number): string {
  if (!budget) return "-";
  return (realise / budget * 100).toFixed(1) + " %";
}

/* ── Print ── */
function buildPrintHTML(
  periodStart: string, periodEnd: string,
  computed: Record<string, { budget: number; realise: number }>,
  comments: string,
  allRows: BudgetRow[],
): string {
  const dataRows = allRows.map((row) => {
    const { budget, realise } = computed[row.id] || { budget: 0, realise: 0 };
    const ecart = realise - budget;
    const p = pct(realise, budget);
    let bg: string, color: string, fw: string, pl: string;
    if (row.type === "section") { bg = DK; color = "white"; fw = "bold"; pl = "8px"; }
    else if (row.type === "sub") { bg = LG; color = DK; fw = "bold"; pl = "14px"; }
    else { bg = LY; color = "#333"; fw = "normal"; pl = "20px"; }
    const tdS = (extra = "") => `style="border:1px solid #ccc;padding:3px 6px;background:${bg};color:${color};font-size:8pt;${extra}"`;
    const ecartColor = ecart < 0 ? "#c0392b" : ecart > 0 ? "#1a5c3a" : color;
    return `<tr style="font-weight:${fw};">
      <td ${tdS(`padding-left:${pl}`)}>${row.label}</td>
      <td ${tdS("text-align:right;")}>${fmt(budget, false)}</td>
      <td ${tdS("text-align:right;background:#fffde7;")}>${fmt(realise, false)}</td>
      <td style="border:1px solid #ccc;padding:3px 6px;font-size:8pt;text-align:right;font-weight:bold;color:${ecartColor};">${ecart === 0 ? "-" : fmt(ecart, false)}</td>
      <td style="border:1px solid #ccc;padding:3px 6px;font-size:8pt;text-align:right;">${p}</td>
    </tr>`;
  }).join("");
  const prodB = computed["produits"]?.budget || 0; const prodR = computed["produits"]?.realise || 0;
  const charB = computed["charges"]?.budget || 0;  const charR = computed["charges"]?.realise || 0;
  const resB = prodB - charB; const resR = prodR - charR; const resE = resR - resB;
  const commentRows = comments.split("\n").filter(Boolean).map((l) =>
    `<tr><td colspan="5" style="border:1px solid #ccc;padding:3px 8px;font-size:8pt;">${l}</td></tr>`
  ).join("") || `<tr><td colspan="5" style="border:1px solid #ccc;padding:6px 8px;color:#aaa;font-style:italic;font-size:8pt;">Aucun commentaire</td></tr>`;
  const logoUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/1.png`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport de Suivi Budgétaire</title>
<style>body{font-family:Arial,sans-serif;margin:12mm 10mm;font-size:8pt;}@media print{@page{size:A4 landscape;margin:10mm;}body{margin:0;}}table{border-collapse:collapse;width:100%;}</style>
</head><body>
<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
  <div style="display:flex;align-items:flex-start;gap:10px;">
    <img src="${logoUrl}" alt="Rézo Campus" style="height:50px;width:auto;object-fit:contain;" onerror="this.style.display='none'" />
    <div>
      <div style="font-size:18pt;font-weight:bold;color:${DK};">RAPPORT DE SUIVI BUDGÉTAIRE</div>
      <div style="font-size:8pt;color:#555;">RÉZO CAMPUS SARL — Brazzaville (Congo) &amp; Casablanca (Maroc)</div>
      <div style="font-size:8pt;color:#555;">contact@rezoconnect.com | +242 06 800 01 99 | +212 617-725867</div>
    </div>
  </div>
  <div style="text-align:right;font-size:9pt;">
    <div><strong>Période du :</strong> ${fmtDatePeriod(periodStart)} &nbsp; <strong>au :</strong> ${fmtDatePeriod(periodEnd)}</div>
    <div style="font-style:italic;font-size:8pt;color:#666;margin-top:2px;">Montants en F CFA</div>
  </div>
</div>
<table><thead><tr style="background:${DK};color:white;font-weight:bold;font-size:8pt;">
  <th style="padding:5px 8px;text-align:left;border:1px solid #0d3d27;min-width:220px;">Libellé</th>
  <th style="padding:5px 8px;text-align:right;border:1px solid #0d3d27;width:100px;">Budget</th>
  <th style="padding:5px 8px;text-align:right;border:1px solid #0d3d27;width:100px;">Réalisé</th>
  <th style="padding:5px 8px;text-align:right;border:1px solid #0d3d27;width:100px;">Écart</th>
  <th style="padding:5px 8px;text-align:right;border:1px solid #0d3d27;width:80px;">% réalisé</th>
</tr></thead><tbody>${dataRows}
<tr style="background:${DK};color:white;font-weight:bold;"><td colspan="5" style="padding:4px 8px;border:1px solid #0d3d27;font-size:8pt;">SYNTHÈSE</td></tr>
<tr style="background:#1a5c3a;color:white;font-weight:bold;">
  <td style="padding:5px 8px;border:1px solid #0d3d27;font-size:8.5pt;">Résultat de la période</td>
  <td style="text-align:right;padding:5px 8px;border:1px solid #0d3d27;font-size:8.5pt;">${fmt(resB, false)}</td>
  <td style="text-align:right;padding:5px 8px;border:1px solid #0d3d27;font-size:8.5pt;">${fmt(resR, false)}</td>
  <td style="text-align:right;padding:5px 8px;border:1px solid #0d3d27;font-size:8.5pt;color:${resE < 0 ? "#ff8a80" : "#a5d6a7"};">${fmt(resE, false)}</td>
  <td style="text-align:right;padding:5px 8px;border:1px solid #0d3d27;font-size:8.5pt;">${pct(resR, resB)}</td>
</tr></tbody></table>
<div style="margin-top:16px;"><div style="font-size:9pt;font-weight:bold;color:${DK};margin-bottom:4px;">Commentaires et actions correctives</div>
<table><tbody>${commentRows}</tbody></table></div>
<div style="margin-top:30px;display:flex;justify-content:space-between;font-size:8pt;">
  <div>Colonne Budget : reprise du budget prévisionnel.</div>
  <div>Colonne Réalisé : montants effectivement encaissés ou décaissés.</div>
  <div>Écart positif sur les charges = dépassement.</div>
</div></body></html>`;
}

/* ─── Structure panel ─────────────────────────────────────────── */
function StructurePanel({ customRows, onRefresh }: { customRows: CustomRow[]; onRefresh: () => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addSub,    setAddSub]    = useState(false);
  const [addItem,   setAddItem]   = useState(false);
  const [newLabel,  setNewLabel]  = useState("");
  const [newParent, setNewParent] = useState("");
  const [delId,     setDelId]     = useState<string | null>(null);

  const sections = BUDGET_ROWS.filter((r) => r.type === "section");
  const allSubs  = [
    ...BUDGET_ROWS.filter((r) => r.type === "sub"),
    ...customRows.filter((r) => r.type === "sub").map((r) => ({ id: r.id, label: r.label, type: "sub" as const, parentId: r.parent_id })),
  ];

  const addSubMut = useMutation({
    mutationFn: async () => {
      if (!newLabel.trim() || !newParent) throw new Error("Remplis le libellé et la section.");
      const { error } = await db.from("rapport_structure_custom").insert({ label: newLabel.trim(), type: "sub", parent_id: newParent, sort_order: 100 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Libellé ajouté"); setAddSub(false); setNewLabel(""); setNewParent("");
      qc.invalidateQueries({ queryKey: ["rapport-structure-custom"] }); onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const addItemMut = useMutation({
    mutationFn: async () => {
      if (!newLabel.trim() || !newParent) throw new Error("Remplis la ligne et le libellé parent.");
      const { error } = await db.from("rapport_structure_custom").insert({ label: newLabel.trim(), type: "item", parent_id: newParent, sort_order: 100 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ligne ajoutée"); setAddItem(false); setNewLabel(""); setNewParent("");
      qc.invalidateQueries({ queryKey: ["rapport-structure-custom"] }); onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("rapport_structure_custom").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimé"); setDelId(null);
      qc.invalidateQueries({ queryKey: ["rapport-structure-custom"] }); onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <div className="mt-4 rounded-xl border border-border bg-card">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors rounded-xl"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex items-center gap-2"><PenLine className="size-4 text-primary" /> Gérer la structure du rapport</span>
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          <p className="text-xs text-muted-foreground">
            Ajoutez ou supprimez des libellés et des lignes personnalisées. Les lignes intégrées ne peuvent pas être supprimées.
          </p>

          {/* Add sub (libellé) */}
          {addSub ? (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/30 p-3">
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-xs">Nom du libellé</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex : Vente de formations" />
              </div>
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-xs">Section parent</Label>
                <Select value={newParent} onValueChange={setNewParent}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addSubMut.mutate()} disabled={addSubMut.isPending}>
                  {addSubMut.isPending && <Loader2 className="mr-1 size-3 animate-spin" />} Ajouter
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddSub(false); setNewLabel(""); setNewParent(""); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => { setAddItem(false); setAddSub(true); setNewLabel(""); setNewParent(""); }}>
              <Plus className="mr-1.5 size-3.5" /> Ajouter un libellé (sous-catégorie)
            </Button>
          )}

          {/* Add item (ligne) */}
          {addItem ? (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/30 p-3">
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-xs">Intitulé de la ligne</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex : Frais de déplacement terrain" />
              </div>
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs">Libellé parent</Label>
                <Select value={newParent} onValueChange={setNewParent}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {allSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addItemMut.mutate()} disabled={addItemMut.isPending}>
                  {addItemMut.isPending && <Loader2 className="mr-1 size-3 animate-spin" />} Ajouter
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddItem(false); setNewLabel(""); setNewParent(""); }}>Annuler</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => { setAddSub(false); setAddItem(true); setNewLabel(""); setNewParent(""); }}>
              <Plus className="mr-1.5 size-3.5" /> Ajouter une ligne budgétaire
            </Button>
          )}

          {/* List custom rows */}
          {customRows.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Éléments personnalisés :</p>
              {customRows.map((r) => {
                const parentLabel = allSubs.find((s) => s.id === r.parent_id)?.label
                  ?? BUDGET_ROWS.find((s) => s.id === r.parent_id)?.label
                  ?? r.parent_id;
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs">
                    <span>
                      <span className="font-medium">{r.label}</span>
                      <span className="ml-2 text-muted-foreground">({r.type === "sub" ? "Libellé" : "Ligne"} sous «{parentLabel}»)</span>
                    </span>
                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:bg-destructive/10"
                      onClick={() => setDelId(r.id)} title="Supprimer">
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {customRows.length === 0 && !addSub && !addItem && (
            <p className="text-xs text-muted-foreground italic">Aucune ligne personnalisée.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={delId !== null}
        onOpenChange={(o) => { if (!o) setDelId(null); }}
        title="Supprimer cet élément ?"
        description="Les valeurs saisies pour cette ligne dans tous les rapports ne seront plus affichées."
        onConfirm={() => { if (delId) delMut.mutate(delId); }}
        loading={delMut.isPending}
      />
    </div>
  );
}

/* ─── Editor ─────────────────────────────────────────────────── */
function RapportEditor({
  initialPeriodStart, initialPeriodEnd, initialVals, initialComments,
  rapportId, allRows,
  onSave, onCancel, saving,
}: {
  initialPeriodStart: string; initialPeriodEnd: string;
  initialVals: RapportVals; initialComments: string;
  rapportId?: string; allRows: BudgetRow[];
  onSave: (ps: string, pe: string, vals: RapportVals, comments: string) => void;
  onCancel: () => void; saving: boolean;
}) {
  const [periodStart, setPeriodStart] = useState(initialPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
  const [vals, setVals] = useState<RapportVals>(initialVals);
  const [comments, setComments] = useState(initialComments);
  const [syncing, setSyncing] = useState(false);
  const computed = useMemo(() => computeRapport(vals, allRows), [vals, allRows]);

  const setField = (id: string, field: "budget" | "realise", raw: string) => {
    const n = parseFloat(raw) || 0;
    setVals((prev) => ({ ...prev, [id]: { ...prev[id], [field]: n } }));
  };

  const syncFromTransactions = async () => {
    if (!rapportId) return;
    setSyncing(true);
    try {
      const { data: txns, error } = await db.from("transactions")
        .select("rapport_row_id, amount")
        .eq("rapport_id", rapportId)
        .not("rapport_row_id", "is", null);
      if (error) throw error;
      const grouped: Record<string, number> = {};
      (txns ?? []).forEach((t: { rapport_row_id: string; amount: number }) => {
        grouped[t.rapport_row_id] = (grouped[t.rapport_row_id] || 0) + Number(t.amount);
      });
      setVals((prev) => {
        const next = { ...prev };
        Object.entries(grouped).forEach(([rowId, total]) => {
          if (!next[rowId]) next[rowId] = { budget: 0, realise: 0 };
          next[rowId] = { ...next[rowId], realise: total };
        });
        return next;
      });
      const count = Object.keys(grouped).length;
      toast.success(`Synchronisation effectuée — ${count} ligne${count > 1 ? "s" : ""} mise${count > 1 ? "s" : ""} à jour`);
    } catch (e: unknown) {
      toast.error("Erreur de synchronisation", { description: (e as Error).message });
    } finally {
      setSyncing(false);
    }
  };

  const doPrint = () => {
    const html = buildPrintHTML(periodStart, periodEnd, computed, comments, allRows);
    const w = window.open("", "_blank");
    if (!w) { alert("Autorisez les pop-ups pour imprimer."); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  const prodC = computed["produits"] || { budget: 0, realise: 0 };
  const charC = computed["charges"] || { budget: 0, realise: 0 };
  const resB = prodC.budget - charC.budget;
  const resR = prodC.realise - charC.realise;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
        <div>
          <Label className="text-xs text-muted-foreground">Période du</Label>
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="mt-1 w-40" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">au</Label>
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="mt-1 w-40" />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {rapportId && (
            <Button variant="outline" onClick={syncFromTransactions} disabled={syncing} title="Importer les montants réalisés depuis les transactions liées à ce rapport">
              {syncing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              Sync transactions
            </Button>
          )}
          <Button variant="outline" onClick={doPrint}><Printer className="mr-2 size-4" /> Imprimer</Button>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onSave(periodStart, periodEnd, vals, comments)} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Enregistrer
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr style={{ background: DK }}>
              <th className="sticky left-0 min-w-[200px] p-2 text-left text-xs text-white" style={{ background: DK }}>Libellé</th>
              <th className="min-w-[110px] p-2 text-right text-xs text-white">Budget</th>
              <th className="min-w-[110px] p-2 text-right text-xs text-white">Réalisé</th>
              <th className="min-w-[110px] p-2 text-right text-xs text-white">Écart</th>
              <th className="min-w-[80px] p-2 text-right text-xs text-white">% réalisé</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row) => {
              const { budget, realise } = computed[row.id] || { budget: 0, realise: 0 };
              const ecart = realise - budget;
              const isSection = row.type === "section";
              const isSub = row.type === "sub";
              const isItem = row.type === "item";
              const rowBg = isSection ? DK : isSub ? LG : LY;
              const textCls = isSection ? "text-white font-bold" : isSub ? "font-semibold" : "";
              const pl = isSection ? "pl-2" : isSub ? "pl-4" : "pl-6";
              return (
                <tr key={row.id} style={{ background: rowBg }}>
                  <td className={`sticky left-0 border-b border-border/40 p-1.5 text-xs ${pl} ${textCls}`} style={{ background: rowBg }}>{row.label}</td>
                  <td className="border-b border-border/40 p-0.5">
                    {isItem ? (
                      <input type="number" min={0} step="0.01" value={budget === 0 ? "" : budget}
                        onChange={(e) => setField(row.id, "budget", e.target.value)}
                        className="w-full rounded bg-transparent px-1 py-0.5 text-right text-xs outline-none focus:bg-white focus:ring-1 focus:ring-primary" placeholder="-" />
                    ) : (
                      <span className={`block px-1 text-right text-xs ${isSection ? "text-white" : ""}`}>{fmt(budget, false)}</span>
                    )}
                  </td>
                  <td className="border-b border-border/40 p-0.5" style={{ background: isItem ? "#fffde7" : rowBg }}>
                    {isItem ? (
                      <input type="number" min={0} step="0.01" value={realise === 0 ? "" : realise}
                        onChange={(e) => setField(row.id, "realise", e.target.value)}
                        className="w-full rounded bg-transparent px-1 py-0.5 text-right text-xs outline-none focus:bg-white focus:ring-1 focus:ring-primary" placeholder="-" />
                    ) : (
                      <span className={`block px-1 text-right text-xs ${isSection ? "text-white" : ""}`}>{fmt(realise, false)}</span>
                    )}
                  </td>
                  <td className="border-b border-border/40 px-2 text-right text-xs font-semibold"
                    style={{ color: ecart < 0 ? "#c0392b" : ecart > 0 ? DK : "inherit" }}>
                    {ecart === 0 ? "-" : fmt(ecart, false)}
                  </td>
                  <td className="border-b border-border/40 px-2 text-right text-xs">{pct(realise, budget)}</td>
                </tr>
              );
            })}
            <tr style={{ background: DK }}>
              <td className="sticky left-0 p-2 text-xs font-bold text-white" style={{ background: DK }} colSpan={5}>SYNTHÈSE</td>
            </tr>
            <tr style={{ background: DK }}>
              <td className="sticky left-0 p-2 text-xs font-bold text-white" style={{ background: DK }}>Résultat de la période</td>
              <td className="p-2 text-right text-xs font-bold text-white">{fmt(resB, false)}</td>
              <td className="p-2 text-right text-xs font-bold text-white">{fmt(resR, false)}</td>
              <td className="p-2 text-right text-xs font-bold" style={{ color: (resR - resB) < 0 ? "#ff8a80" : "#a5d6a7" }}>{fmt(resR - resB, false)}</td>
              <td className="p-2 text-right text-xs font-bold text-white">{pct(resR, resB)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <Label className="text-sm font-semibold">Commentaires et actions correctives</Label>
        <Textarea className="mt-2 resize-none" rows={4} value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Observations, analyses d'écarts, actions à mettre en œuvre…" />
      </div>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────── */
function RapportSuivi() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const userId = auth?.user?.id;

  const [view, setView] = useState<"list" | "new" | string>("list");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: rapports = [], isLoading } = useQuery({
    queryKey: ["rapports-suivi"],
    queryFn: async () => {
      const { data, error } = await db.from("rapports_suivi").select("*").order("period_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RapportRecord[];
    },
  });

  const { data: customRows = [], refetch: refetchCustom } = useQuery({
    queryKey: ["rapport-structure-custom"],
    queryFn: async () => {
      try {
        const { data, error } = await db.from("rapport_structure_custom").select("*").order("sort_order");
        if (error) return [];
        return (data ?? []) as CustomRow[];
      } catch { return []; }
    },
  });

  const allRows = useMemo(() => buildAllRows(customRows), [customRows]);

  const editing = view !== "list" && view !== "new" ? rapports.find((r) => r.id === view) : null;

  const save = useMutation({
    mutationFn: async ({ ps, pe, vals, comments, id }: { ps: string; pe: string; vals: RapportVals; comments: string; id?: string }) => {
      const payload = { period_start: ps, period_end: pe, vals, comments: comments || null };
      if (id) {
        const { error } = await db.from("rapports_suivi").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("rapports_suivi").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Rapport enregistré");
      qc.invalidateQueries({ queryKey: ["rapports-suivi"] });
      setView("list");
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("rapports_suivi").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rapport supprimé"); qc.invalidateQueries({ queryKey: ["rapports-suivi"] }); },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  function doPrint(r: RapportRecord) {
    const computed = computeRapport(r.vals || initVals(allRows), allRows);
    const html = buildPrintHTML(r.period_start, r.period_end, computed, r.comments || "", allRows);
    const w = window.open("", "_blank");
    if (!w) { alert("Autorisez les pop-ups pour imprimer."); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  const curYear = new Date().getFullYear();

  if (view === "new" || view !== "list") {
    const isEdit = !!editing;
    return (
      <>
        <PageHeader eyebrow="Comptabilité" title={isEdit
          ? `Rapport ${fmtDatePeriod(editing!.period_start)} – ${fmtDatePeriod(editing!.period_end)}`
          : "Nouveau rapport de suivi"} />
        <RapportEditor
          initialPeriodStart={editing ? editing.period_start : `${curYear}-01-01`}
          initialPeriodEnd={editing ? editing.period_end : `${curYear}-12-31`}
          initialVals={editing ? (editing.vals || initVals(allRows)) : initVals(allRows)}
          initialComments={editing ? (editing.comments || "") : ""}
          rapportId={editing?.id}
          allRows={allRows}
          saving={save.isPending}
          onCancel={() => setView("list")}
          onSave={(ps, pe, vals, comments) => save.mutate({ ps, pe, vals, comments, id: editing?.id })}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Comptabilité" title="Rapport de Suivi Budgétaire"
        description="Créez et gérez les rapports de suivi budgétaire par période." />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setView("new")}><Plus className="mr-2 size-4" /> Nouveau rapport</Button>
      </div>

      <Panel title={`${rapports.length} rapport${rapports.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : rapports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <ClipboardList className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucun rapport enregistré.
          </div>
        ) : (
          <ul className="space-y-2">
            {rapports.map((r) => {
              const computed = computeRapport(r.vals || initVals(allRows), allRows);
              const prodC = computed["produits"] || { budget: 0, realise: 0 };
              const charC = computed["charges"] || { budget: 0, realise: 0 };
              const resR = prodC.realise - charC.realise;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {fmtDatePeriod(r.period_start)} → {fmtDatePeriod(r.period_end)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      <span>Résultat réalisé : <span className={`font-medium ${resR < 0 ? "text-red-600" : "text-foreground"}`}>{fmt(resR, false)}</span></span>
                      <span>Créé le {fmtDateShort(r.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => doPrint(r)}>
                      <Printer className="mr-1 size-3.5" /> Imprimer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setView(r.id)}>Modifier</Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId(r.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <StructurePanel customRows={customRows} onRefresh={() => qc.invalidateQueries({ queryKey: ["rapport-structure-custom"] })} />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer ce rapport ?"
        description="Cette action est irréversible."
        onConfirm={() => { if (pendingDeleteId) del.mutate(pendingDeleteId); setPendingDeleteId(null); }}
        loading={del.isPending}
      />
    </>
  );
}
