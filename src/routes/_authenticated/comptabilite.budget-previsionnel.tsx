import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  BarChart2,
  Printer,
  PenLine,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { injectCachetInHtml } from "@/lib/cachet-utils";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BUDGET_ROWS,
  MONTHS_SHORT,
  MONTHS_FULL,
  rowTotal,
  fmt,
  type Vals,
  type BudgetRow,
} from "@/lib/budget-structure";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/comptabilite/budget-previsionnel")({
  component: BudgetPrevisionnel,
});

const db = supabase as any;
const DK = "#1a5c3a";
const LG = "#d4edda";
const LY = "#fffde7";

type BudgetRecord = {
  id: string;
  year: number;
  vals: Vals;
  notes: string | null;
  created_at: string;
};

type CustomRow = {
  id: string;
  label: string;
  type: "sub" | "item";
  parent_id: string;
  sort_order: number;
};

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

/* ── Local helpers ── */
function buildAllRows(customRows: CustomRow[], hiddenIds: Set<string>): BudgetRow[] {
  const sections = BUDGET_ROWS.filter((r) => r.type === "section");
  const result: BudgetRow[] = [];
  sections.forEach((sec) => {
    result.push(sec);
    const builtinSubs = BUDGET_ROWS.filter((r) => r.type === "sub" && r.parentId === sec.id);
    builtinSubs.forEach((sub) => {
      if (hiddenIds.has(sub.id)) return;
      result.push(sub);
      const builtinItems = BUDGET_ROWS.filter((r) => r.type === "item" && r.parentId === sub.id);
      builtinItems.forEach((item) => {
        if (!hiddenIds.has(item.id)) result.push(item);
      });
      customRows
        .filter((r) => r.type === "item" && r.parent_id === sub.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach((r) => {
          if (!hiddenIds.has(r.id))
            result.push({ id: r.id, label: r.label, type: "item", parentId: r.parent_id });
        });
    });
    customRows
      .filter((r) => r.type === "sub" && r.parent_id === sec.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((csub) => {
        if (hiddenIds.has(csub.id)) return;
        result.push({ id: csub.id, label: csub.label, type: "sub", parentId: csub.parent_id });
        customRows
          .filter((r) => r.type === "item" && r.parent_id === csub.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .forEach((r) => {
            if (!hiddenIds.has(r.id))
              result.push({ id: r.id, label: r.label, type: "item", parentId: r.parent_id });
          });
      });
  });
  return result;
}

function computeAllForRows(vals: Vals, rows: BudgetRow[]): Vals {
  const r: Vals = {};
  rows.forEach((row) => {
    if (row.type === "item")
      r[row.id] = (vals[row.id] || Array(12).fill(0)).map((v) => Number(v) || 0);
  });
  rows.forEach((row) => {
    if (row.type === "sub") {
      const items = rows.filter((x) => x.type === "item" && x.parentId === row.id);
      const tot = Array(12).fill(0);
      items.forEach((it) =>
        r[it.id]?.forEach((v, i) => {
          tot[i] += v;
        }),
      );
      r[row.id] = tot;
    }
  });
  rows.forEach((row) => {
    if (row.type === "section") {
      const subs = rows.filter((x) => x.type === "sub" && x.parentId === row.id);
      const tot = Array(12).fill(0);
      subs.forEach((sub) =>
        r[sub.id]?.forEach((v, i) => {
          tot[i] += v;
        }),
      );
      r[row.id] = tot;
    }
  });
  return r;
}

function initValsForRows(rows: BudgetRow[]): Vals {
  const v: Vals = {};
  rows.forEach((r) => {
    if (r.type === "item") v[r.id] = Array(12).fill(0);
  });
  return v;
}

function buildPrintHTML(year: number, computed: Vals, allRows: BudgetRow[]): string {
  const thStyle = `style="background:${DK};color:white;padding:4px 5px;text-align:right;font-size:7.5pt;border:1px solid #0d3d27;white-space:nowrap;"`;
  const thLabelStyle = `style="background:${DK};color:white;padding:4px 8px;text-align:left;font-size:8pt;border:1px solid #0d3d27;min-width:200px;"`;
  const monthHeaders = MONTHS_FULL.map((m) => `<th ${thStyle}>${m}</th>`).join("");
  const prodVals = computed["produits"] || Array(12).fill(0);
  const chargesVals = computed["charges"] || Array(12).fill(0);
  const resMois = prodVals.map((p: number, i: number) => p - (chargesVals[i] || 0));
  const resCumul: number[] = [];
  resMois.forEach((v: number, i: number) => {
    resCumul.push((resCumul[i - 1] || 0) + v);
  });
  const dataRows = allRows
    .map((row) => {
      const vals = computed[row.id] || Array(12).fill(0);
      const total = rowTotal(computed, row.id);
      let bg: string, color: string, fw: string, pl: string, darkTotal: string;
      if (row.type === "section") {
        bg = DK;
        color = "white";
        fw = "bold";
        pl = "8px";
        darkTotal = "#0d3d27";
      } else if (row.type === "sub") {
        bg = LG;
        color = DK;
        fw = "bold";
        pl = "14px";
        darkTotal = "#b8ddc8";
      } else {
        bg = LY;
        color = "#333";
        fw = "normal";
        pl = "20px";
        darkTotal = "#fff3b0";
      }
      const cells = vals
        .map(
          (v: number) =>
            `<td style="text-align:right;padding:3px 5px;background:${bg};color:${color};border:1px solid #ccc;font-size:7.5pt;">${row.type === "item" ? fmt(v) : fmt(v, false)}</td>`,
        )
        .join("");
      const totalCell = `<td style="text-align:right;padding:3px 5px;background:${darkTotal};color:${row.type === "section" ? "white" : color};font-weight:bold;border:1px solid #ccc;font-size:7.5pt;">${fmt(total, false)}</td>`;
      return `<tr style="font-weight:${fw};"><td style="padding:3px ${pl};background:${bg};color:${color};border:1px solid #ccc;font-size:8pt;">${row.label}</td>${cells}${totalCell}</tr>`;
    })
    .join("");
  const resMoisRow = resMois
    .map(
      (v: number) =>
        `<td style="text-align:right;padding:3px 5px;background:#e8f5e9;color:${v < 0 ? "#c0392b" : DK};border:1px solid #ccc;font-size:7.5pt;font-weight:bold;">${fmt(v, false)}</td>`,
    )
    .join("");
  const resCumulRow = resCumul
    .map(
      (v: number) =>
        `<td style="text-align:right;padding:3px 5px;background:#c8e6c9;color:${v < 0 ? "#c0392b" : DK};border:1px solid #ccc;font-size:7.5pt;font-weight:bold;">${fmt(v, false)}</td>`,
    )
    .join("");
  const resMoisTotal = resMois.reduce((a: number, b: number) => a + b, 0);
  const resCumulTotal = resCumul[resCumul.length - 1] || 0;
  const logoUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/1.png`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Budget Prévisionnel ${year}</title>
<style>body{font-family:Arial,sans-serif;margin:10mm 8mm;font-size:8pt;}@media print{@page{size:A3 landscape;margin:8mm;}body{margin:0;}}table{border-collapse:collapse;width:100%;}</style>
</head><body>
<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
  <div style="display:flex;align-items:flex-start;gap:10px;">
    <img src="${logoUrl}" alt="Rézo Campus" style="height:50px;width:auto;object-fit:contain;" onerror="this.style.display='none'" />
    <div>
      <div style="font-size:18pt;font-weight:bold;color:${DK};">BUDGET PRÉVISIONNEL</div>
      <div style="font-size:8pt;color:#555;">RÉZO CAMPUS SARL — Brazzaville (Congo) &amp; Casablanca (Maroc)</div>
      <div style="font-size:8pt;color:#555;">contact@rezoconnect.com | +242 06 800 01 99 | +212 617-725867</div>
    </div>
  </div>
  <div style="text-align:right;font-size:9pt;"><strong>Exercice :</strong> ${year}<br><span style="font-style:italic;font-size:8pt;color:#666;">Montants en F CFA</span></div>
</div>
<table><thead><tr><th ${thLabelStyle}>Libellé</th>${monthHeaders}<th style="background:#0d3d27;color:white;padding:4px 5px;text-align:right;font-size:7.5pt;border:1px solid #0d3d27;">Total annuel</th></tr></thead>
<tbody>${dataRows}
<tr style="background:#e8f5e9;font-weight:bold;"><td style="padding:3px 8px;color:${DK};border:1px solid #ccc;font-size:8pt;">Résultat du mois</td>${resMoisRow}<td style="text-align:right;padding:3px 5px;background:#c8e6c9;color:${resMoisTotal < 0 ? "#c0392b" : DK};font-weight:bold;border:1px solid #ccc;font-size:7.5pt;">${fmt(resMoisTotal, false)}</td></tr>
<tr style="background:#c8e6c9;font-weight:bold;"><td style="padding:3px 8px;color:${DK};border:1px solid #ccc;font-size:8pt;">Résultat cumulé</td>${resCumulRow}<td style="text-align:right;padding:3px 5px;background:#a5d6a7;color:${resCumulTotal < 0 ? "#c0392b" : DK};font-weight:bold;border:1px solid #ccc;font-size:7.5pt;">${fmt(resCumulTotal, false)}</td></tr>
</tbody></table>
<p style="margin-top:12px;font-size:7.5pt;font-style:italic;color:#555;">Les sous-totaux, totaux et résultats se calculent automatiquement.</p>
<div style="display:flex;justify-content:flex-end;margin-top:24px;">
  <div style="border:1px solid #ccc;width:150px;padding:6px;text-align:center;">
    <!-- CACHET -->
    <div style="font-size:8pt;color:#666;margin-top:4px;border-top:1px solid #ccc;padding-top:3px;">Administrateur général</div>
  </div>
</div>
</body></html>`;
}

/* ─── Structure panel ─────────────────────────────────────────── */
function StructurePanel({
  customRows,
  hiddenIds,
  budgetId,
  currentVals,
  onRefresh,
}: {
  customRows: CustomRow[];
  hiddenIds: Set<string>;
  budgetId?: string;
  currentVals?: Vals;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addSub, setAddSub] = useState(false);
  const [addItem, setAddItem] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newParent, setNewParent] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  const toggleExpandSub = (subId: string) =>
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      next.has(subId) ? next.delete(subId) : next.add(subId);
      return next;
    });

  const sections = BUDGET_ROWS.filter((r) => r.type === "section");
  const allSubs = [
    ...BUDGET_ROWS.filter((r) => r.type === "sub"),
    ...customRows
      .filter((r) => r.type === "sub")
      .map((r) => ({ id: r.id, label: r.label, type: "sub" as const, parentId: r.parent_id })),
  ];

  const addSubMut = useMutation({
    mutationFn: async () => {
      if (!newLabel.trim() || !newParent) throw new Error("Remplis le libellé et la section.");
      const { error } = await db
        .from("budget_structure_custom")
        .insert({ label: newLabel.trim(), type: "sub", parent_id: newParent, sort_order: 100 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Libellé ajouté");
      setAddSub(false);
      setNewLabel("");
      setNewParent("");
      qc.invalidateQueries({ queryKey: ["budget-structure-custom"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const addItemMut = useMutation({
    mutationFn: async () => {
      if (!newLabel.trim() || !newParent) throw new Error("Remplis la ligne et le libellé parent.");
      const { error } = await db
        .from("budget_structure_custom")
        .insert({ label: newLabel.trim(), type: "item", parent_id: newParent, sort_order: 100 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ligne ajoutée");
      setAddItem(false);
      setNewLabel("");
      setNewParent("");
      qc.invalidateQueries({ queryKey: ["budget-structure-custom"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("budget_structure_custom").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimé");
      setDelId(null);
      qc.invalidateQueries({ queryKey: ["budget-structure-custom"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const hideMut = useMutation({
    mutationFn: async (rowId: string) => {
      if (!budgetId) return;
      const builtinRow = BUDGET_ROWS.find((r) => r.id === rowId);
      const idsToCheck: string[] = [];
      if (builtinRow?.type === "item") {
        idsToCheck.push(rowId);
      } else if (builtinRow?.type === "sub") {
        BUDGET_ROWS.filter((r) => r.type === "item" && r.parentId === rowId).forEach((r) =>
          idsToCheck.push(r.id),
        );
      }
      const hasData = idsToCheck.some((id) => {
        const v = currentVals?.[id];
        return Array.isArray(v) && v.some((n: number) => Number(n) !== 0);
      });
      if (hasData)
        throw new Error(
          "Cette ligne contient des données saisies. Videz-la d'abord pour pouvoir la masquer.",
        );
      const { error } = await db
        .from("budget_hidden_rows")
        .insert({ document_id: budgetId, row_id: rowId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ligne masquée");
      qc.invalidateQueries({ queryKey: ["budget-hidden-rows", budgetId] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const unhideMut = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await db
        .from("budget_hidden_rows")
        .delete()
        .eq("document_id", budgetId ?? "")
        .eq("row_id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ligne réaffichée");
      qc.invalidateQueries({ queryKey: ["budget-hidden-rows", budgetId] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <div className="mt-4 rounded-xl border border-border bg-card">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors rounded-xl"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <PenLine className="size-4 text-primary" /> Gérer la structure du budget
        </span>
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          <p className="text-xs text-muted-foreground">
            Ajoutez ou supprimez des libellés et des lignes personnalisées. Masquez les lignes
            intégrées que vous n'utilisez pas.
          </p>

          {/* Add sub */}
          {addSub ? (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/30 p-3">
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-xs">Nom du libellé</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex : Vente de formations"
                />
              </div>
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-xs">Section parent</Label>
                <Select value={newParent} onValueChange={setNewParent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addSubMut.mutate()} disabled={addSubMut.isPending}>
                  {addSubMut.isPending && <Loader2 className="mr-1 size-3 animate-spin" />} Ajouter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddSub(false);
                    setNewLabel("");
                    setNewParent("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddItem(false);
                setAddSub(true);
                setNewLabel("");
                setNewParent("");
              }}
            >
              <Plus className="mr-1.5 size-3.5" /> Ajouter un libellé (sous-catégorie)
            </Button>
          )}

          {/* Add item */}
          {addItem ? (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/30 p-3">
              <div className="flex-1 min-w-[160px] space-y-1">
                <Label className="text-xs">Intitulé de la ligne</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex : Frais de déplacement terrain"
                />
              </div>
              <div className="flex-1 min-w-[200px] space-y-1">
                <Label className="text-xs">Libellé parent</Label>
                <Select value={newParent} onValueChange={setNewParent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSubs.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addItemMut.mutate()}
                  disabled={addItemMut.isPending}
                >
                  {addItemMut.isPending && <Loader2 className="mr-1 size-3 animate-spin" />} Ajouter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddItem(false);
                    setNewLabel("");
                    setNewParent("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddSub(false);
                setAddItem(true);
                setNewLabel("");
                setNewParent("");
              }}
            >
              <Plus className="mr-1.5 size-3.5" /> Ajouter une ligne budgétaire
            </Button>
          )}

          {/* List custom rows */}
          {customRows.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Éléments personnalisés :
              </p>
              {customRows.map((r) => {
                const parentLabel =
                  allSubs.find((s) => s.id === r.parent_id)?.label ??
                  BUDGET_ROWS.find((s) => s.id === r.parent_id)?.label ??
                  r.parent_id;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs"
                  >
                    <span>
                      <span className="font-medium">{r.label}</span>
                      <span className="ml-2 text-muted-foreground">
                        ({r.type === "sub" ? "Libellé" : "Ligne"} sous «{parentLabel}»)
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-destructive hover:bg-destructive/10"
                      onClick={() => setDelId(r.id)}
                      title="Supprimer"
                    >
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

          {/* Built-in rows visibility — only when editing a specific document */}
          {budgetId && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                Masquer des libellés / lignes intégrés :
              </p>
              <p className="text-xs text-muted-foreground italic mb-3">
                Masquez les catégories ou lignes vides de ce budget. Leurs valeurs sont exclues des
                totaux.
              </p>
              {sections.map((sec) => (
                <div key={sec.id} className="mb-3">
                  <div className="text-xs font-bold uppercase text-primary mb-1">{sec.label}</div>
                  {BUDGET_ROWS.filter((r) => r.type === "sub" && r.parentId === sec.id).map(
                    (sub) => {
                      const isHidden = hiddenIds.has(sub.id);
                      const isExpanded = expandedSubs.has(sub.id);
                      const subItems = BUDGET_ROWS.filter(
                        (r) => r.type === "item" && r.parentId === sub.id,
                      );
                      return (
                        <div key={sub.id} className="mb-1">
                          <div
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5"
                            style={{ opacity: isHidden ? 0.6 : 1 }}
                          >
                            <button
                              className="p-0.5 hover:bg-muted/30 rounded"
                              onClick={() => toggleExpandSub(sub.id)}
                              title="Voir les lignes"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}
                            </button>
                            <span
                              className={`flex-1 text-xs font-medium ${isHidden ? "line-through text-muted-foreground" : ""}`}
                            >
                              {sub.label}
                            </span>
                            {isHidden && (
                              <span className="text-[10px] text-amber-600 mr-1">Masqué</span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5"
                              title={isHidden ? "Réafficher" : "Masquer"}
                              onClick={() =>
                                isHidden ? unhideMut.mutate(sub.id) : hideMut.mutate(sub.id)
                              }
                              disabled={hideMut.isPending || unhideMut.isPending}
                            >
                              {isHidden ? (
                                <Eye className="size-3 text-primary" />
                              ) : (
                                <EyeOff className="size-3 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                          {isExpanded && !isHidden && (
                            <div className="ml-6 mt-0.5 space-y-0.5">
                              {subItems.map((item) => {
                                const itemHidden = hiddenIds.has(item.id);
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-1 rounded border border-border/50 px-3 py-1"
                                    style={{ opacity: itemHidden ? 0.6 : 1 }}
                                  >
                                    <span
                                      className={`flex-1 text-xs ${itemHidden ? "line-through text-muted-foreground" : ""}`}
                                    >
                                      {item.label}
                                    </span>
                                    {itemHidden && (
                                      <span className="text-[10px] text-amber-600 mr-1">
                                        Masqué
                                      </span>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 px-1"
                                      title={itemHidden ? "Réafficher" : "Masquer"}
                                      onClick={() =>
                                        itemHidden
                                          ? unhideMut.mutate(item.id)
                                          : hideMut.mutate(item.id)
                                      }
                                      disabled={hideMut.isPending || unhideMut.isPending}
                                    >
                                      {itemHidden ? (
                                        <Eye className="size-3 text-primary" />
                                      ) : (
                                        <EyeOff className="size-3 text-muted-foreground" />
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={delId !== null}
        onOpenChange={(o) => {
          if (!o) setDelId(null);
        }}
        title="Supprimer cet élément ?"
        description="Les valeurs saisies pour cette ligne dans tous les budgets ne seront plus affichées."
        onConfirm={() => {
          if (delId) delMut.mutate(delId);
        }}
        loading={delMut.isPending}
      />
    </div>
  );
}

/* ─── Editor ─────────────────────────────────────────────────── */
function BudgetEditor({
  initialYear,
  initialVals,
  initialNotes,
  allRows,
  onSave,
  onCancel,
  saving,
}: {
  initialYear: number;
  initialVals: Vals;
  initialNotes: string;
  allRows: BudgetRow[];
  onSave: (year: number, vals: Vals, notes: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [year, setYear] = useState(initialYear);
  const [vals, setVals] = useState<Vals>(initialVals);
  const [notes, setNotes] = useState(initialNotes);
  const computed = useMemo(() => computeAllForRows(vals, allRows), [vals, allRows]);

  const setVal = useCallback((id: string, mi: number, raw: string) => {
    const n = parseFloat(raw) || 0;
    setVals((prev) => {
      const existing = prev[id] || Array(12).fill(0);
      return { ...prev, [id]: existing.map((v: number, i: number) => (i === mi ? n : v)) };
    });
  }, []);

  const doPrint = async () => {
    let html = buildPrintHTML(year, computed, allRows);
    html = await injectCachetInHtml(html);
    const w = window.open("", "_blank");
    if (!w) {
      alert("Autorisez les pop-ups pour imprimer.");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 400);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Exercice</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="w-28"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={doPrint}>
            <Printer className="mr-2 size-4" /> Imprimer
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave(year, vals, notes)} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Enregistrer
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr style={{ background: DK }}>
              <th
                className="sticky left-0 min-w-[200px] p-2 text-left text-xs font-semibold text-white"
                style={{ background: DK }}
              >
                Libellé
              </th>
              {MONTHS_SHORT.map((m) => (
                <th
                  key={m}
                  className="min-w-[72px] p-1 text-right text-[10px] font-semibold text-white"
                >
                  {m}
                </th>
              ))}
              <th
                className="min-w-[85px] p-1 text-right text-[10px] font-semibold text-white"
                style={{ background: "#0d3d27" }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row) => {
              const cv = computed[row.id] || Array(12).fill(0);
              const total = rowTotal(computed, row.id);
              const isSection = row.type === "section";
              const isSub = row.type === "sub";
              const rowBg = isSection ? DK : isSub ? LG : LY;
              const textCls = isSection ? "text-white font-bold" : isSub ? "font-semibold" : "";
              const pl = isSection ? "pl-2" : isSub ? "pl-4" : "pl-6";
              return (
                <tr key={row.id} style={{ background: rowBg }}>
                  <td
                    className={`sticky left-0 border-b border-border/40 p-1.5 text-xs ${pl} ${textCls}`}
                    style={{ background: rowBg, minWidth: 200 }}
                  >
                    {row.label}
                  </td>
                  {cv.map((v: number, mi: number) => (
                    <td key={mi} className="border-b border-border/40 p-0.5">
                      {row.type === "item" ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={v === 0 ? "" : v}
                          onChange={(e) => setVal(row.id, mi, e.target.value)}
                          className="w-full rounded bg-transparent px-1 py-0.5 text-right text-xs outline-none ring-0 focus:bg-white focus:ring-1 focus:ring-primary"
                          placeholder="-"
                        />
                      ) : (
                        <span
                          className={`block px-1 text-right text-xs ${isSection ? "text-white" : "text-foreground/70"}`}
                        >
                          {fmt(v)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td
                    className="border-b border-border/40 px-2 py-1 text-right text-xs font-semibold"
                    style={{
                      background: isSection ? "#0d3d27" : isSub ? "#b8ddc8" : "#fff3b0",
                      color: isSection ? "white" : "inherit",
                    }}
                  >
                    {fmt(total, false)}
                  </td>
                </tr>
              );
            })}
            {(() => {
              const prodV = computed["produits"] || Array(12).fill(0);
              const charV = computed["charges"] || Array(12).fill(0);
              const resMois = prodV.map((p: number, i: number) => p - (charV[i] || 0));
              const resCumul: number[] = [];
              resMois.forEach((v: number, i: number) => resCumul.push((resCumul[i - 1] || 0) + v));
              return (
                <>
                  <tr style={{ background: "#e8f5e9" }}>
                    <td
                      className="sticky left-0 border-t-2 border-primary p-2 text-xs font-bold"
                      style={{ background: "#e8f5e9", color: DK }}
                    >
                      Résultat du mois
                    </td>
                    {resMois.map((v: number, i: number) => (
                      <td
                        key={i}
                        className="border-t-2 border-primary px-1 text-right text-xs font-semibold"
                        style={{ color: v < 0 ? "#c0392b" : DK }}
                      >
                        {fmt(v, false)}
                      </td>
                    ))}
                    <td
                      className="border-t-2 border-primary px-2 text-right text-xs font-bold"
                      style={{ background: "#c8e6c9", color: DK }}
                    >
                      {fmt(
                        resMois.reduce((a: number, b: number) => a + b, 0),
                        false,
                      )}
                    </td>
                  </tr>
                  <tr style={{ background: "#c8e6c9" }}>
                    <td
                      className="sticky left-0 p-2 text-xs font-bold"
                      style={{ background: "#c8e6c9", color: DK }}
                    >
                      Résultat cumulé
                    </td>
                    {resCumul.map((v: number, i: number) => (
                      <td
                        key={i}
                        className="px-1 text-right text-xs font-semibold"
                        style={{ color: v < 0 ? "#c0392b" : DK }}
                      >
                        {fmt(v, false)}
                      </td>
                    ))}
                    <td
                      className="px-2 text-right text-xs font-bold"
                      style={{ background: "#a5d6a7", color: DK }}
                    >
                      {fmt(resCumul[resCumul.length - 1] || 0, false)}
                    </td>
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Notes / commentaires</Label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────── */
function BudgetPrevisionnel() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const userId = auth?.user?.id;

  const [view, setView] = useState<"list" | "new" | string>("list");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets-previsionnels"],
    queryFn: async () => {
      const { data, error } = await db
        .from("budgets_previsionnels")
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BudgetRecord[];
    },
  });

  const { data: customRows = [] } = useQuery({
    queryKey: ["budget-structure-custom"],
    queryFn: async () => {
      try {
        const { data, error } = await db
          .from("budget_structure_custom")
          .select("*")
          .order("sort_order");
        if (error) return [];
        return (data ?? []) as CustomRow[];
      } catch {
        return [];
      }
    },
  });

  const currentDocId = view !== "list" && view !== "new" ? view : null;

  const { data: hiddenRowsData = [] } = useQuery({
    queryKey: ["budget-hidden-rows", currentDocId],
    queryFn: async () => {
      if (!currentDocId) return [];
      try {
        const { data, error } = await db
          .from("budget_hidden_rows")
          .select("*")
          .eq("document_id", currentDocId);
        if (error) return [];
        return (data ?? []) as Array<{ id: string; row_id: string; document_id: string }>;
      } catch {
        return [];
      }
    },
  });

  const hiddenIds = useMemo(() => new Set(hiddenRowsData.map((r) => r.row_id)), [hiddenRowsData]);

  const allRows = useMemo(() => buildAllRows(customRows, hiddenIds), [customRows, hiddenIds]);

  const editing = view !== "list" && view !== "new" ? budgets.find((b) => b.id === view) : null;

  const save = useMutation({
    mutationFn: async ({
      year,
      vals,
      notes,
      id,
    }: {
      year: number;
      vals: Vals;
      notes: string;
      id?: string;
    }) => {
      const payload = { year, vals, notes: notes || null };
      if (id) {
        const { error } = await db.from("budgets_previsionnels").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("budgets_previsionnels")
          .insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Budget enregistré");
      qc.invalidateQueries({ queryKey: ["budgets-previsionnels"] });
      setView("list");
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("budgets_previsionnels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget supprimé");
      qc.invalidateQueries({ queryKey: ["budgets-previsionnels"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function doPrint(b: BudgetRecord) {
    const computed = computeAllForRows(b.vals || initValsForRows(allRows), allRows);
    let html = buildPrintHTML(b.year, computed, allRows);
    html = await injectCachetInHtml(html);
    const w = window.open("", "_blank");
    if (!w) {
      alert("Autorisez les pop-ups pour imprimer.");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 400);
  }

  /* Vue éditeur */
  if (view === "new" || view !== "list") {
    const isEdit = !!editing;
    return (
      <>
        <PageHeader
          eyebrow="Comptabilité"
          title={isEdit ? `Budget ${editing!.year} — Modification` : "Nouveau budget prévisionnel"}
        />
        <BudgetEditor
          initialYear={editing ? editing.year : new Date().getFullYear()}
          initialVals={
            editing ? editing.vals || initValsForRows(allRows) : initValsForRows(allRows)
          }
          initialNotes={editing ? editing.notes || "" : ""}
          allRows={allRows}
          saving={save.isPending}
          onCancel={() => setView("list")}
          onSave={(year, vals, notes) => save.mutate({ year, vals, notes, id: editing?.id })}
        />
        <StructurePanel
          customRows={customRows}
          hiddenIds={hiddenIds}
          budgetId={editing?.id}
          currentVals={editing?.vals ?? undefined}
          onRefresh={() => {
            qc.invalidateQueries({ queryKey: ["budget-structure-custom"] });
            qc.invalidateQueries({ queryKey: ["budget-hidden-rows", editing?.id] });
          }}
        />
      </>
    );
  }

  /* Vue liste */
  return (
    <>
      <PageHeader
        eyebrow="Comptabilité"
        title="Budget Prévisionnel"
        description="Créez et gérez les budgets prévisionnels annuels de Rézo Campus."
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setView("new")}>
          <Plus className="mr-2 size-4" /> Nouveau budget
        </Button>
      </div>

      <Panel title={`${budgets.length} budget${budgets.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : budgets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <BarChart2 className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucun budget enregistré.
          </div>
        ) : (
          <ul className="space-y-2">
            {budgets.map((b) => {
              const computed = computeAllForRows(b.vals || initValsForRows(allRows), allRows);
              const prodTotal = rowTotal(computed, "produits");
              const charTotal = rowTotal(computed, "charges");
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <BarChart2 className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Budget Prévisionnel {b.year}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      <span>
                        Produits :{" "}
                        <span className="font-medium text-foreground">{fmt(prodTotal, false)}</span>
                      </span>
                      <span>
                        Charges :{" "}
                        <span className="font-medium text-foreground">{fmt(charTotal, false)}</span>
                      </span>
                      <span>Créé le {fmtDateShort(b.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => doPrint(b)}>
                      <Printer className="mr-1 size-3.5" /> Imprimer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setView(b.id)}>
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId(b.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <StructurePanel
        customRows={customRows}
        hiddenIds={hiddenIds}
        onRefresh={() => {
          qc.invalidateQueries({ queryKey: ["budget-structure-custom"] });
        }}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
        title="Supprimer ce budget ?"
        description="Cette action est irréversible."
        onConfirm={() => {
          if (pendingDeleteId) del.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={del.isPending}
      />
    </>
  );
}
