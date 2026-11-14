import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  ClipboardList,
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

export const Route = createFileRoute("/_authenticated/secretaire/rapport-suivi")({
  component: SecretaireRapportSuivi,
});

const db = supabase as any;
const DK = "#1a5c3a";
const LG = "#d4edda";
const LY = "#fffde7";

type RapportRecord = {
  id: string;
  period_start: string;
  period_end: string;
  vals: Vals;
  comments: string | null;
  created_at: string;
};

type CustomRow = {
  id: string;
  label: string;
  type: "sub" | "item";
  parent_id: string;
  sort_order: number;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

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

function buildPrintHTML(
  periodStart: string,
  periodEnd: string,
  computed: Vals,
  allRows: BudgetRow[],
): string {
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
  const startFmt = new Date(periodStart).toLocaleDateString("fr-FR");
  const endFmt = new Date(periodEnd).toLocaleDateString("fr-FR");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport de Suivi Secrétariat</title>
<style>body{font-family:Arial,sans-serif;margin:10mm 8mm;font-size:8pt;}@media print{@page{size:A3 landscape;margin:8mm;}body{margin:0;}}table{border-collapse:collapse;width:100%;}</style>
</head><body>
<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
  <div style="display:flex;align-items:flex-start;gap:10px;">
    <img src="${logoUrl}" alt="Rézo Campus" style="height:50px;width:auto;object-fit:contain;" onerror="this.style.display='none'" />
    <div>
      <div style="font-size:18pt;font-weight:bold;color:${DK};">RAPPORT DE SUIVI</div>
      <div style="font-size:9pt;font-weight:bold;color:#555;">Secrétariat</div>
      <div style="font-size:8pt;color:#555;">RÉZO CAMPUS SARL — Brazzaville (Congo) &amp; Casablanca (Maroc)</div>
    </div>
  </div>
  <div style="text-align:right;font-size:9pt;"><strong>Période :</strong> ${startFmt} → ${endFmt}<br><span style="font-style:italic;font-size:8pt;color:#666;">Montants en F CFA</span></div>
</div>
<table><thead><tr><th ${thLabelStyle}>Libellé</th>${monthHeaders}<th style="background:#0d3d27;color:white;padding:4px 5px;text-align:right;font-size:7.5pt;border:1px solid #0d3d27;">Total</th></tr></thead>
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
  onRefresh,
}: {
  customRows: CustomRow[];
  hiddenIds: Set<string>;
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
        .from("secretaire_rapport_structure_custom")
        .insert({ label: newLabel.trim(), type: "sub", parent_id: newParent, sort_order: 100 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Libellé ajouté");
      setAddSub(false);
      setNewLabel("");
      setNewParent("");
      qc.invalidateQueries({ queryKey: ["sec-rapport-structure-custom"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const addItemMut = useMutation({
    mutationFn: async () => {
      if (!newLabel.trim() || !newParent) throw new Error("Remplis la ligne et le libellé parent.");
      const { error } = await db
        .from("secretaire_rapport_structure_custom")
        .insert({ label: newLabel.trim(), type: "item", parent_id: newParent, sort_order: 100 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ligne ajoutée");
      setAddItem(false);
      setNewLabel("");
      setNewParent("");
      qc.invalidateQueries({ queryKey: ["sec-rapport-structure-custom"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("secretaire_rapport_structure_custom").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimé");
      setDelId(null);
      qc.invalidateQueries({ queryKey: ["sec-rapport-structure-custom"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const hideMut = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await db.from("secretaire_rapport_hidden_rows").insert({ row_id: rowId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ligne masquée");
      qc.invalidateQueries({ queryKey: ["sec-rapport-hidden-rows"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const unhideMut = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await db
        .from("secretaire_rapport_hidden_rows")
        .delete()
        .eq("row_id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ligne réaffichée");
      qc.invalidateQueries({ queryKey: ["sec-rapport-hidden-rows"] });
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
          <PenLine className="size-4 text-primary" /> Gérer la structure du rapport
        </span>
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          <p className="text-xs text-muted-foreground">
            Ajoutez ou supprimez des libellés et des lignes personnalisées. Masquez les lignes
            intégrées que vous n'utilisez pas.
          </p>

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
              <Plus className="mr-1.5 size-3.5" /> Ajouter une ligne de suivi
            </Button>
          )}

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

          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Masquer des libellés / lignes intégrés :
            </p>
            <p className="text-xs text-muted-foreground italic mb-3">
              Masquez les catégories ou lignes que vous n'utilisez pas. Leurs valeurs sont exclues
              des totaux.
            </p>
            {sections.map((sec) => (
              <div key={sec.id} className="mb-3">
                <div className="text-xs font-bold uppercase text-primary mb-1">{sec.label}</div>
                {BUDGET_ROWS.filter((r) => r.type === "sub" && r.parentId === sec.id).map((sub) => {
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
                                  <span className="text-[10px] text-amber-600 mr-1">Masqué</span>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1"
                                  title={itemHidden ? "Réafficher" : "Masquer"}
                                  onClick={() =>
                                    itemHidden ? unhideMut.mutate(item.id) : hideMut.mutate(item.id)
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
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={delId !== null}
        onOpenChange={(o) => {
          if (!o) setDelId(null);
        }}
        title="Supprimer cet élément ?"
        description="Les valeurs saisies pour cette ligne dans tous les rapports ne seront plus affichées."
        onConfirm={() => {
          if (delId) delMut.mutate(delId);
        }}
        loading={delMut.isPending}
      />
    </div>
  );
}

/* ─── Editor ─────────────────────────────────────────────────── */
function RapportEditor({
  initialStart,
  initialEnd,
  initialVals,
  initialComments,
  allRows,
  onSave,
  onCancel,
  saving,
}: {
  initialStart: string;
  initialEnd: string;
  initialVals: Vals;
  initialComments: string;
  allRows: BudgetRow[];
  onSave: (start: string, end: string, vals: Vals, comments: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [vals, setVals] = useState<Vals>(initialVals);
  const [comments, setComments] = useState(initialComments);
  const computed = useMemo(() => computeAllForRows(vals, allRows), [vals, allRows]);

  const setVal = useCallback((id: string, mi: number, raw: string) => {
    const n = parseFloat(raw) || 0;
    setVals((prev) => {
      const existing = prev[id] || Array(12).fill(0);
      return { ...prev, [id]: existing.map((v: number, i: number) => (i === mi ? n : v)) };
    });
  }, []);

  const doPrint = async () => {
    let html = buildPrintHTML(start, end, computed, allRows);
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Période du</Label>
            <Input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">au</Label>
            <Input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-36"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={doPrint}>
            <Printer className="mr-2 size-4" /> Imprimer
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={() => onSave(start, end, vals, comments)} disabled={saving}>
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
        <Label className="text-xs text-muted-foreground">Commentaires / observations</Label>
        <textarea
          rows={3}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────── */
function SecretaireRapportSuivi() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const userId = auth?.user?.id;

  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  const [view, setView] = useState<"list" | "new" | string>("list");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: rapports = [], isLoading } = useQuery({
    queryKey: ["sec-rapports-suivi"],
    queryFn: async () => {
      const { data, error } = await db
        .from("secretaire_rapports_suivi")
        .select("*")
        .order("period_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RapportRecord[];
    },
  });

  const { data: customRows = [] } = useQuery({
    queryKey: ["sec-rapport-structure-custom"],
    queryFn: async () => {
      try {
        const { data, error } = await db
          .from("secretaire_rapport_structure_custom")
          .select("*")
          .order("sort_order");
        if (error) return [];
        return (data ?? []) as CustomRow[];
      } catch {
        return [];
      }
    },
  });

  const { data: hiddenRowsData = [] } = useQuery({
    queryKey: ["sec-rapport-hidden-rows"],
    queryFn: async () => {
      try {
        const { data, error } = await db.from("secretaire_rapport_hidden_rows").select("*");
        if (error) return [];
        return (data ?? []) as Array<{ id: string; row_id: string }>;
      } catch {
        return [];
      }
    },
  });

  const hiddenIds = useMemo(() => new Set(hiddenRowsData.map((r) => r.row_id)), [hiddenRowsData]);
  const allRows = useMemo(() => buildAllRows(customRows, hiddenIds), [customRows, hiddenIds]);
  const editing = view !== "list" && view !== "new" ? rapports.find((r) => r.id === view) : null;

  const save = useMutation({
    mutationFn: async ({
      start,
      end,
      vals,
      comments,
      id,
    }: {
      start: string;
      end: string;
      vals: Vals;
      comments: string;
      id?: string;
    }) => {
      const payload = { period_start: start, period_end: end, vals, comments: comments || null };
      if (id) {
        const { error } = await db.from("secretaire_rapports_suivi").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("secretaire_rapports_suivi")
          .insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Rapport enregistré");
      qc.invalidateQueries({ queryKey: ["sec-rapports-suivi"] });
      setView("list");
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("secretaire_rapports_suivi").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rapport supprimé");
      qc.invalidateQueries({ queryKey: ["sec-rapports-suivi"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function doPrint(r: RapportRecord) {
    const computed = computeAllForRows(r.vals || initValsForRows(allRows), allRows);
    let html = buildPrintHTML(r.period_start, r.period_end, computed, allRows);
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

  if (view === "new" || (view !== "list" && editing)) {
    const isEdit = !!editing;
    return (
      <>
        <PageHeader
          eyebrow="Secrétariat"
          title={isEdit ? "Modifier le rapport" : "Nouveau rapport de suivi"}
        />
        <RapportEditor
          initialStart={editing ? editing.period_start : firstOfYear}
          initialEnd={editing ? editing.period_end : today}
          initialVals={
            editing ? editing.vals || initValsForRows(allRows) : initValsForRows(allRows)
          }
          initialComments={editing ? editing.comments || "" : ""}
          allRows={allRows}
          saving={save.isPending}
          onCancel={() => setView("list")}
          onSave={(start, end, vals, comments) =>
            save.mutate({ start, end, vals, comments, id: editing?.id })
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Secrétariat"
        title="Rapport de Suivi"
        description="Créez et gérez les rapports de suivi du secrétariat."
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setView("new")}>
          <Plus className="mr-2 size-4" /> Nouveau rapport
        </Button>
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
              const computed = computeAllForRows(r.vals || initValsForRows(allRows), allRows);
              const prodTotal = rowTotal(computed, "produits");
              const charTotal = rowTotal(computed, "charges");
              const resultat = prodTotal - charTotal;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      <span>
                        Produits :{" "}
                        <span className="font-medium text-foreground">{fmt(prodTotal, false)}</span>
                      </span>
                      <span>
                        Charges :{" "}
                        <span className="font-medium text-foreground">{fmt(charTotal, false)}</span>
                      </span>
                      <span style={{ color: resultat < 0 ? "#c0392b" : DK }}>
                        Résultat : <span className="font-medium">{fmt(resultat, false)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => doPrint(r)}>
                      <Printer className="mr-1 size-3.5" /> Imprimer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setView(r.id)}>
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId(r.id)}
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
          qc.invalidateQueries({ queryKey: ["sec-rapport-structure-custom"] });
          qc.invalidateQueries({ queryKey: ["sec-rapport-hidden-rows"] });
        }}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
        title="Supprimer ce rapport ?"
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
