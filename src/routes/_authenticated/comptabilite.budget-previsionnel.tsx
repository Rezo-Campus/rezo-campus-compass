import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import { Loader2, Plus, Trash2, BarChart2, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BUDGET_ROWS, MONTHS_SHORT, MONTHS_FULL,
  initVals, computeAll, rowTotal, fmt,
  type Vals,
} from "@/lib/budget-structure";

export const Route = createFileRoute("/_authenticated/comptabilite/budget-previsionnel")({
  component: BudgetPrevisionnel,
});

const db = supabase as any;
const DK = "#1a5c3a";
const LG = "#d4edda";
const LY = "#fffde7";

type BudgetRecord = {
  id: string; year: number; vals: Vals; notes: string | null; created_at: string;
};

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function buildPrintHTML(year: number, computed: Vals): string {
  const thStyle = `style="background:${DK};color:white;padding:4px 5px;text-align:right;font-size:7.5pt;border:1px solid #0d3d27;white-space:nowrap;"`;
  const thLabelStyle = `style="background:${DK};color:white;padding:4px 8px;text-align:left;font-size:8pt;border:1px solid #0d3d27;min-width:200px;"`;
  const monthHeaders = MONTHS_FULL.map((m) => `<th ${thStyle}>${m}</th>`).join("");
  const prodVals = computed["produits"] || Array(12).fill(0);
  const chargesVals = computed["charges"] || Array(12).fill(0);
  const resMois = prodVals.map((p: number, i: number) => p - (chargesVals[i] || 0));
  const resCumul: number[] = [];
  resMois.forEach((v: number, i: number) => { resCumul.push((resCumul[i - 1] || 0) + v); });
  const dataRows = BUDGET_ROWS.map((row) => {
    const vals = computed[row.id] || Array(12).fill(0);
    const total = rowTotal(computed, row.id);
    let bg: string, color: string, fw: string, pl: string, darkTotal: string;
    if (row.type === "section") { bg = DK; color = "white"; fw = "bold"; pl = "8px"; darkTotal = "#0d3d27"; }
    else if (row.type === "sub") { bg = LG; color = DK; fw = "bold"; pl = "14px"; darkTotal = "#b8ddc8"; }
    else { bg = LY; color = "#333"; fw = "normal"; pl = "20px"; darkTotal = "#fff3b0"; }
    const cells = vals.map((v: number) =>
      `<td style="text-align:right;padding:3px 5px;background:${bg};color:${color};border:1px solid #ccc;font-size:7.5pt;">${row.type === "item" ? fmt(v) : fmt(v, false)}</td>`
    ).join("");
    const totalCell = `<td style="text-align:right;padding:3px 5px;background:${darkTotal};color:${row.type === "section" ? "white" : color};font-weight:bold;border:1px solid #ccc;font-size:7.5pt;">${fmt(total, false)}</td>`;
    return `<tr style="font-weight:${fw};"><td style="padding:3px ${pl};background:${bg};color:${color};border:1px solid #ccc;font-size:8pt;">${row.label}</td>${cells}${totalCell}</tr>`;
  }).join("");
  const resMoisRow = resMois.map((v: number) =>
    `<td style="text-align:right;padding:3px 5px;background:#e8f5e9;color:${v < 0 ? "#c0392b" : DK};border:1px solid #ccc;font-size:7.5pt;font-weight:bold;">${fmt(v, false)}</td>`
  ).join("");
  const resCumulRow = resCumul.map((v: number) =>
    `<td style="text-align:right;padding:3px 5px;background:#c8e6c9;color:${v < 0 ? "#c0392b" : DK};border:1px solid #ccc;font-size:7.5pt;font-weight:bold;">${fmt(v, false)}</td>`
  ).join("");
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
</body></html>`;
}

/* ─── Editor ─────────────────────────────────────────────────── */
function BudgetEditor({
  initialYear, initialVals, initialNotes, onSave, onCancel, saving,
}: {
  initialYear: number; initialVals: Vals; initialNotes: string;
  onSave: (year: number, vals: Vals, notes: string) => void;
  onCancel: () => void; saving: boolean;
}) {
  const [year, setYear] = useState(initialYear);
  const [vals, setVals] = useState<Vals>(initialVals);
  const [notes, setNotes] = useState(initialNotes);
  const computed = useMemo(() => computeAll(vals), [vals]);

  const setVal = useCallback((id: string, mi: number, raw: string) => {
    const n = parseFloat(raw) || 0;
    setVals((prev) => ({ ...prev, [id]: prev[id].map((v, i) => (i === mi ? n : v)) }));
  }, []);

  const doPrint = () => {
    const html = buildPrintHTML(year, computed);
    const w = window.open("", "_blank");
    if (!w) { alert("Autorisez les pop-ups pour imprimer."); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Exercice</Label>
          <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())} className="w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={doPrint}><Printer className="mr-2 size-4" /> Imprimer</Button>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onSave(year, vals, notes)} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Enregistrer
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr style={{ background: DK }}>
              <th className="sticky left-0 min-w-[200px] p-2 text-left text-xs font-semibold text-white" style={{ background: DK }}>Libellé</th>
              {MONTHS_SHORT.map((m) => (
                <th key={m} className="min-w-[72px] p-1 text-right text-[10px] font-semibold text-white">{m}</th>
              ))}
              <th className="min-w-[85px] p-1 text-right text-[10px] font-semibold text-white" style={{ background: "#0d3d27" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {BUDGET_ROWS.map((row) => {
              const cv = computed[row.id] || Array(12).fill(0);
              const total = rowTotal(computed, row.id);
              const isSection = row.type === "section";
              const isSub = row.type === "sub";
              const rowBg = isSection ? DK : isSub ? LG : LY;
              const textCls = isSection ? "text-white font-bold" : isSub ? "font-semibold" : "";
              const pl = isSection ? "pl-2" : isSub ? "pl-4" : "pl-6";
              return (
                <tr key={row.id} style={{ background: rowBg }}>
                  <td className={`sticky left-0 border-b border-border/40 p-1.5 text-xs ${pl} ${textCls}`} style={{ background: rowBg, minWidth: 200 }}>{row.label}</td>
                  {cv.map((v: number, mi: number) => (
                    <td key={mi} className="border-b border-border/40 p-0.5">
                      {row.type === "item" ? (
                        <input type="number" min={0} step="0.01" value={v === 0 ? "" : v}
                          onChange={(e) => setVal(row.id, mi, e.target.value)}
                          className="w-full rounded bg-transparent px-1 py-0.5 text-right text-xs outline-none ring-0 focus:bg-white focus:ring-1 focus:ring-primary"
                          placeholder="-" />
                      ) : (
                        <span className={`block px-1 text-right text-xs ${isSection ? "text-white" : "text-foreground/70"}`}>{fmt(v)}</span>
                      )}
                    </td>
                  ))}
                  <td className="border-b border-border/40 px-2 py-1 text-right text-xs font-semibold"
                    style={{ background: isSection ? "#0d3d27" : isSub ? "#b8ddc8" : "#fff3b0", color: isSection ? "white" : "inherit" }}>
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
                    <td className="sticky left-0 border-t-2 border-primary p-2 text-xs font-bold" style={{ background: "#e8f5e9", color: DK }}>Résultat du mois</td>
                    {resMois.map((v: number, i: number) => (
                      <td key={i} className="border-t-2 border-primary px-1 text-right text-xs font-semibold" style={{ color: v < 0 ? "#c0392b" : DK }}>{fmt(v, false)}</td>
                    ))}
                    <td className="border-t-2 border-primary px-2 text-right text-xs font-bold" style={{ background: "#c8e6c9", color: DK }}>{fmt(resMois.reduce((a: number, b: number) => a + b, 0), false)}</td>
                  </tr>
                  <tr style={{ background: "#c8e6c9" }}>
                    <td className="sticky left-0 p-2 text-xs font-bold" style={{ background: "#c8e6c9", color: DK }}>Résultat cumulé</td>
                    {resCumul.map((v: number, i: number) => (
                      <td key={i} className="px-1 text-right text-xs font-semibold" style={{ color: v < 0 ? "#c0392b" : DK }}>{fmt(v, false)}</td>
                    ))}
                    <td className="px-2 text-right text-xs font-bold" style={{ background: "#a5d6a7", color: DK }}>{fmt(resCumul[resCumul.length - 1] || 0, false)}</td>
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Notes / commentaires</Label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
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
      const { data, error } = await db.from("budgets_previsionnels").select("*").order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BudgetRecord[];
    },
  });

  const editing = view !== "list" && view !== "new" ? budgets.find((b) => b.id === view) : null;

  const save = useMutation({
    mutationFn: async ({ year, vals, notes, id }: { year: number; vals: Vals; notes: string; id?: string }) => {
      const payload = { year, vals, notes: notes || null };
      if (id) {
        const { error } = await db.from("budgets_previsionnels").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("budgets_previsionnels").insert({ ...payload, created_by: userId });
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
    onSuccess: () => { toast.success("Budget supprimé"); qc.invalidateQueries({ queryKey: ["budgets-previsionnels"] }); },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  function doPrint(b: BudgetRecord) {
    const computed = computeAll(b.vals || initVals());
    const html = buildPrintHTML(b.year, computed);
    const w = window.open("", "_blank");
    if (!w) { alert("Autorisez les pop-ups pour imprimer."); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  /* Vue éditeur */
  if (view === "new" || view !== "list") {
    const isEdit = !!editing;
    return (
      <>
        <PageHeader eyebrow="Comptabilité" title={isEdit ? `Budget ${editing!.year} — Modification` : "Nouveau budget prévisionnel"} />
        <BudgetEditor
          initialYear={editing ? editing.year : new Date().getFullYear()}
          initialVals={editing ? (editing.vals || initVals()) : initVals()}
          initialNotes={editing ? (editing.notes || "") : ""}
          saving={save.isPending}
          onCancel={() => setView("list")}
          onSave={(year, vals, notes) => save.mutate({ year, vals, notes, id: editing?.id })}
        />
      </>
    );
  }

  /* Vue liste */
  return (
    <>
      <PageHeader eyebrow="Comptabilité" title="Budget Prévisionnel"
        description="Créez et gérez les budgets prévisionnels annuels de Rézo Campus." />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setView("new")}><Plus className="mr-2 size-4" /> Nouveau budget</Button>
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
              const computed = computeAll(b.vals || initVals());
              const prodTotal = rowTotal(computed, "produits");
              const charTotal = rowTotal(computed, "charges");
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <BarChart2 className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Budget Prévisionnel {b.year}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      <span>Produits : <span className="font-medium text-foreground">{fmt(prodTotal, false)}</span></span>
                      <span>Charges : <span className="font-medium text-foreground">{fmt(charTotal, false)}</span></span>
                      <span>Créé le {fmtDateShort(b.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => doPrint(b)}>
                      <Printer className="mr-1 size-3.5" /> Imprimer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setView(b.id)}>Modifier</Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId(b.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer ce budget ?"
        description="Cette action est irréversible."
        onConfirm={() => { if (pendingDeleteId) del.mutate(pendingDeleteId); setPendingDeleteId(null); }}
        loading={del.isPending}
      />
    </>
  );
}
