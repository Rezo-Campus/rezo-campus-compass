import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown,
  Printer, CheckCircle2, ShieldCheck, Pen,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BUDGET_ROWS } from "@/lib/budget-structure";

export const Route = createFileRoute("/_authenticated/comptabilite/transactions")({
  component: Transactions,
});

const db = supabase as any;

/* ── Constantes ── */
const PAYMENT_METHODS = [
  { value: "virement",     label: "Virement bancaire" },
  { value: "especes",      label: "Espèces" },
  { value: "cheque",       label: "Chèque" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "autre",        label: "Autre" },
];

const BRANCHES = [
  { value: "sites_logiciels", label: "Sites & Logiciels" },
  { value: "automatisation",  label: "Automatisation" },
  { value: "accompagnement",  label: "Accompagnement étudiant" },
  { value: "marketing",       label: "Marketing & Commercial" },
  { value: "general",         label: "Général" },
];

const BRANCH_LABELS: Record<string, string> = Object.fromEntries(BRANCHES.map((b) => [b.value, b.label]));
const PAY_LABELS:    Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((p) => [p.value, p.label]));

const DK = "#1a5c3a";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
}
function fmtDate(d: string) {
  return d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "—";
}
function fmtPeriod(ps: string, pe: string) {
  return `${fmtDate(ps)} → ${fmtDate(pe)}`;
}

/* ── Types ── */
type Txn = {
  id: string; date: string; type: string; amount: number;
  category: string; branch: string; description: string | null;
  reference: string | null; amount_words?: string | null;
  rapport_id?: string | null; rapport_row_id?: string | null;
  payment_method?: string | null; payer_name?: string | null;
  signed_by?: string | null; signed_at?: string | null; signed_note?: string | null;
  validated_by?: string | null; validated_at?: string | null; validated_note?: string | null;
};

type RapportRow = { id: string; period_start: string; period_end: string };

/* ── Form state ── */
const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  type: "recette",
  rapportId: "",
  rapportSubId: "",
  rapportRowId: "",
  amount: "",
  amountWords: "",
  category: "",
  branch: "general",
  description: "",
  reference: "",
  paymentMethod: "virement",
  payerName: "",
};

/* ── Receipt HTML builder ── */
function buildReceiptHTML(t: Txn): string {
  const logoUrl = `${window.location.origin}/1.png`;
  const isRecette = t.type === "recette";
  const typeLabel = isRecette ? "REÇU DE PAIEMENT" : "BON DE DÉPENSE";
  const typeColor = isRecette ? "#166534" : "#991b1b";
  const ref = t.reference || `TXN-${t.id.slice(0, 8).toUpperCase()}`;
  const amtFormatted = fmt(t.amount);
  const printedAt = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const payLabel = t.payment_method ? (PAY_LABELS[t.payment_method] ?? t.payment_method) : "—";
  const payerLabel = t.payer_name || "—";

  const signBlock = t.signed_by
    ? `<tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Signé par (Secrétaire)</td>
       <td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;color:#166534;">✓ ${fmtDate(t.signed_at ?? "")}${t.signed_note ? " — " + t.signed_note : ""}</td></tr>` : "";
  const validateBlock = t.validated_by
    ? `<tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Validé par (Admin)</td>
       <td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;color:#166534;">✓ ${fmtDate(t.validated_at ?? "")}${t.validated_note ? " — " + t.validated_note : ""}</td></tr>` : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${typeLabel} — ${ref}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:10pt;color:#222;padding:15mm 12mm;}@media print{@page{size:A4;margin:12mm;}body{padding:0;}}table{border-collapse:collapse;width:100%;}</style>
</head><body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
  <div style="display:flex;align-items:flex-start;gap:12px;">
    <img src="${logoUrl}" alt="Rézo Campus" style="height:60px;width:auto;object-fit:contain;" onerror="this.style.display='none'" />
    <div>
      <div style="font-size:17pt;font-weight:bold;color:${DK};line-height:1.1;">RÉZO CAMPUS</div>
      <div style="font-size:8.5pt;color:#555;margin-top:2px;">Société à responsabilité limitée (SARL)</div>
      <div style="margin-top:5px;font-size:8pt;color:#333;line-height:1.7;">
        <strong>Maroc :</strong> 46, Bd Zerktouni, Étage 5, N17 — Maarif, 20250 Casablanca<br>
        <strong>Congo :</strong> Av de l'OUA, bloc 88-91, Moukoundzi Ngouaka — Brazzaville<br>
        ✉ contact@rezoconnect.com &nbsp;|&nbsp; ☎ +212 617-725867
      </div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:20pt;font-weight:bold;color:${typeColor};line-height:1;">${typeLabel}</div>
    <table style="margin-top:10px;width:auto;border-collapse:collapse;">
      <tr><td style="padding:3px 8px;font-size:9pt;font-weight:bold;text-align:right;">Référence</td><td style="padding:3px 8px;font-size:9pt;border:1px solid #333;background:#fffde7;min-width:120px;">${ref}</td></tr>
      <tr><td style="padding:3px 8px;font-size:9pt;font-weight:bold;text-align:right;">Date</td><td style="padding:3px 8px;font-size:9pt;border:1px solid #333;background:#fffde7;">${fmtDate(t.date)}</td></tr>
      <tr><td style="padding:3px 8px;font-size:9pt;font-weight:bold;text-align:right;">Émis le</td><td style="padding:3px 8px;font-size:9pt;border:1px solid #333;background:#fffde7;">${printedAt}</td></tr>
    </table>
  </div>
</div>

<div style="background:${DK};color:white;text-align:center;padding:5px 8px;font-size:8.5pt;margin-bottom:14px;">RC 741051 (Casablanca) &nbsp;-&nbsp; ICE 003997443000066 &nbsp;-&nbsp; IF 73197307 &nbsp;-&nbsp; TP 34218488</div>

<div style="border:1px solid ${DK};margin-bottom:14px;">
  <div style="background:#d4edda;padding:5px 8px;font-weight:bold;font-size:9pt;color:${DK};border-bottom:1px solid ${DK};">DÉTAILS DE LA TRANSACTION</div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;width:200px;border-bottom:1px solid #eee;">Type</td>
        <td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;"><span style="font-weight:bold;color:${typeColor};">${isRecette ? "✓ Recette" : "✗ Dépense"}</span></td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Catégorie</td>
        <td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;">${t.category || "—"}</td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Branche</td>
        <td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;">${BRANCH_LABELS[t.branch] ?? t.branch}</td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Mode de paiement</td>
        <td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;">${payLabel}</td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">${isRecette ? "Payeur / Client" : "Bénéficiaire"}</td>
        <td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;">${payerLabel}</td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Description</td>
        <td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;">${t.description || "—"}</td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;">Référence</td>
        <td style="padding:5px 8px;font-size:9pt;">${ref}</td></tr>
    ${signBlock}${validateBlock}
  </table>
</div>

<div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
  <table style="width:280px;border-collapse:collapse;">
    <tr style="background:${typeColor};color:white;font-weight:bold;">
      <td style="padding:8px 12px;text-align:right;font-size:12pt;border:1px solid ${typeColor};">MONTANT ${isRecette ? "REÇU" : "DÉCAISSÉ"}</td>
      <td style="padding:8px 12px;text-align:right;font-size:12pt;border:1px solid ${typeColor};white-space:nowrap;">${amtFormatted}</td>
    </tr>
  </table>
</div>
<div style="margin-bottom:16px;">
  <div style="font-weight:bold;font-size:8.5pt;margin-bottom:3px;color:#555;">Arrêté le présent montant à la somme de :</div>
  <div style="border:1px solid #ddd;padding:6px 10px;background:#fffde7;font-size:9pt;min-height:28px;">${t.amount_words || "(montant en toutes lettres) francs CFA"}</div>
</div>

<div style="border:1px solid #ddd;margin-bottom:14px;">
  <div style="background:#d4edda;padding:4px 8px;font-weight:bold;font-size:9pt;color:${DK};border-bottom:1px solid #ddd;">RIB BANCAIRE — RÉZO CAMPUS SARL</div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:8.5pt;width:160px;">Banque</td><td style="padding:4px 8px;font-size:8.5pt;">Attijari Wafa Bank &nbsp;|&nbsp; Code banque : <strong>007</strong> &nbsp;|&nbsp; Ville : <strong>780</strong></td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:8.5pt;">N° de compte</td><td style="padding:4px 8px;font-size:8.5pt;font-family:monospace;">0001269000005563 &nbsp;&nbsp; Clé RIB : <strong>18</strong></td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:8.5pt;">BIC / SWIFT</td><td style="padding:4px 8px;font-size:8.5pt;font-family:monospace;"><strong>BCMAMAMC</strong></td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:8.5pt;">IBAN</td><td style="padding:4px 8px;font-size:8.5pt;font-family:monospace;letter-spacing:0.5px;"><strong>MA64 007 780 0001269000005563 18</strong></td></tr>
  </table>
</div>

<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;">
  <div style="font-size:8pt;color:#888;max-width:60%;">Document généré par le système de gestion Rézo Campus.</div>
  <div style="display:flex;gap:20px;">
    <div style="text-align:center;">
      <div style="border:1px solid #333;width:160px;height:70px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;"><span style="font-size:8.5pt;font-style:italic;color:#555;">Secrétaire particulier</span></div>
    </div>
    <div style="text-align:center;">
      <div style="border:1px solid #333;width:160px;height:70px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;"><span style="font-size:8.5pt;font-style:italic;color:#555;">Administrateur général</span></div>
    </div>
  </div>
</div>
<div style="background:${DK};color:white;text-align:center;padding:4px 8px;font-size:8pt;margin-top:14px;">RÉZO CAMPUS SARL — Brazzaville (Congo) &amp; Casablanca (Maroc) — contact@rezoconnect.com</div>
</body></html>`;
}

function doPrintReceipt(t: Txn) {
  const html = buildReceiptHTML(t);
  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez les pop-ups pour imprimer."); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

/* ─── Component principal ─── */
export function Transactions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const uid = auth?.user?.id;
  const role = auth?.role;
  const isSecretaire = role === "secretaire" || role === "admin";
  const isAdmin = role === "admin";

  /* Dialog transaction */
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  /* Filters */
  const [filterType,   setFilterType]   = useState("tous");
  const [filterBranch, setFilterBranch] = useState("tous");

  /* Delete */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  /* Sign dialog (secrétaire → recettes) */
  const [signOpen,   setSignOpen]   = useState(false);
  const [signingId,  setSigningId]  = useState<string | null>(null);
  const [signNote,   setSignNote]   = useState("");

  /* Validate dialog (admin → dépenses) */
  const [validateOpen,  setValidateOpen]  = useState(false);
  const [validatingId,  setValidatingId]  = useState<string | null>(null);
  const [validateNote,  setValidateNote]  = useState("");

  /* Cascade derived */
  const rapportSection = form.type === "recette" ? "produits" : "charges";
  const availableSubs  = BUDGET_ROWS.filter((r) => r.type === "sub"  && r.parentId === rapportSection);
  const availableItems = form.rapportSubId
    ? BUDGET_ROWS.filter((r) => r.type === "item" && r.parentId === form.rapportSubId)
    : [];

  /* ── Queries ── */
  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await db.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Txn[];
    },
  });

  const { data: rapports = [] } = useQuery({
    queryKey: ["rapports-suivi-list"],
    queryFn: async () => {
      const { data, error } = await db.from("rapports_suivi").select("id, period_start, period_end").order("period_start", { ascending: false });
      if (error) return [];
      return (data ?? []) as RapportRow[];
    },
  });

  /* ── Helpers ── */
  async function syncRapportRealise(rapportId: string, rowId: string) {
    try {
      const { data: linked } = await db.from("transactions").select("amount").eq("rapport_id", rapportId).eq("rapport_row_id", rowId);
      const total = (linked ?? []).reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
      const { data: rapport } = await db.from("rapports_suivi").select("vals").eq("id", rapportId).single();
      const vals: Record<string, { budget: number; realise: number }> = { ...(rapport?.vals || {}) };
      if (!vals[rowId]) vals[rowId] = { budget: 0, realise: 0 };
      vals[rowId] = { ...vals[rowId], realise: total };
      await db.from("rapports_suivi").update({ vals }).eq("id", rapportId);
    } catch { /* best-effort */ }
  }

  /* ── Mutations ── */
  const save = useMutation({
    mutationFn: async () => {
      if (!form.amount) throw new Error("Le montant est requis.");
      const subLabel = form.rapportSubId ? (BUDGET_ROWS.find((r) => r.id === form.rapportSubId)?.label ?? "") : "";
      const rowLabel = form.rapportRowId ? (BUDGET_ROWS.find((r) => r.id === form.rapportRowId)?.label ?? "") : "";

      const payload = {
        date: form.date,
        type: form.type,
        amount: Number(form.amount),
        category: form.category || subLabel || (form.type === "recette" ? "Recette" : "Dépense"),
        branch: form.branch,
        description: form.description || rowLabel || null,
        reference: form.reference || null,
        amount_words: form.amountWords || null,
        rapport_id:    form.rapportId    || null,
        rapport_row_id: form.rapportRowId || null,
        payment_method: form.paymentMethod || null,
        payer_name:    form.payerName    || null,
        created_by:    uid ?? null,
      };

      if (editingId) {
        const { error } = await db.from("transactions").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from("transactions").insert(payload);
        if (error) throw error;
      }

      if (form.rapportId && form.rapportRowId) {
        await syncRapportRealise(form.rapportId, form.rapportRowId);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Transaction modifiée" : "Transaction ajoutée");
      setOpen(false); setEditingId(null); setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["rapports-suivi"] });
      qc.invalidateQueries({ queryKey: ["compta-month"] });
      qc.invalidateQueries({ queryKey: ["compta-year"] });
      qc.invalidateQueries({ queryKey: ["compta-recent"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const txn = txns.find((t) => t.id === id);
      const { error } = await db.from("transactions").delete().eq("id", id);
      if (error) throw error;
      if (txn?.rapport_id && txn?.rapport_row_id) {
        await syncRapportRealise(txn.rapport_id, txn.rapport_row_id);
      }
    },
    onSuccess: () => {
      toast.success("Transaction supprimée");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["rapports-suivi"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const signTxn = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await db.from("transactions").update({
        signed_by: uid, signed_at: new Date().toISOString(), signed_note: note || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reçu signé");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setSignOpen(false); setSignNote(""); setSigningId(null);
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const validateTxn = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await db.from("transactions").update({
        validated_by: uid, validated_at: new Date().toISOString(), validated_note: note || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bon de dépense validé");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setValidateOpen(false); setValidateNote(""); setValidatingId(null);
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  /* ── openEdit ── */
  const openEdit = (t: Txn) => {
    const subId = t.rapport_row_id
      ? (BUDGET_ROWS.find((r) => r.id === t.rapport_row_id)?.parentId ?? "")
      : "";
    setForm({
      date: t.date, type: t.type,
      rapportId: t.rapport_id ?? "", rapportSubId: subId, rapportRowId: t.rapport_row_id ?? "",
      amount: String(t.amount), amountWords: t.amount_words ?? "",
      category: t.category, branch: t.branch,
      description: t.description ?? "", reference: t.reference ?? "",
      paymentMethod: t.payment_method ?? "virement", payerName: t.payer_name ?? "",
    });
    setEditingId(t.id); setOpen(true);
  };

  /* ── Filtered list ── */
  const filtered = txns.filter((t) => {
    if (filterType !== "tous" && t.type !== filterType) return false;
    if (filterBranch !== "tous" && t.branch !== filterBranch) return false;
    return true;
  });
  const totalRecettes = filtered.filter((t) => t.type === "recette").reduce((s, t) => s + t.amount, 0);
  const totalDepenses = filtered.filter((t) => t.type === "depense").reduce((s, t) => s + t.amount, 0);

  /* ── Render ── */
  return (
    <>
      <PageHeader
        eyebrow="Comptabilité"
        title="Transactions"
        description="Enregistrez et suivez toutes les entrées et sorties financières."
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous types</SelectItem>
            <SelectItem value="recette">Recettes</SelectItem>
            <SelectItem value="depense">Dépenses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes branches</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="font-medium text-green-600">+{fmt(totalRecettes)}</span>
          <span className="font-medium text-red-500">-{fmt(totalDepenses)}</span>
          <span className={`font-semibold ${totalRecettes - totalDepenses >= 0 ? "text-green-600" : "text-red-500"}`}>
            = {fmt(totalRecettes - totalDepenses)}
          </span>
        </div>

        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setOpen(true); }}>
          <Plus className="mr-2 size-4" /> Ajouter
        </Button>
      </div>

      {/* List */}
      <Panel title={`${filtered.length} transaction${filtered.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucune transaction.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => {
              const isSigned    = !!t.signed_by;
              const isValidated = !!t.validated_by;
              const rapportRow  = t.rapport_row_id ? BUDGET_ROWS.find((r) => r.id === t.rapport_row_id) : null;

              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${t.type === "recette" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                    {t.type === "recette" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{t.description || t.category}</span>
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                      <Badge variant="secondary" className="text-xs">{BRANCH_LABELS[t.branch] ?? t.branch}</Badge>
                      {t.payment_method && t.payment_method !== "virement" && (
                        <Badge variant="secondary" className="text-xs">{PAY_LABELS[t.payment_method] ?? t.payment_method}</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{new Date(t.date).toLocaleDateString("fr-FR")}</span>
                      {t.reference && <span>Réf : {t.reference}</span>}
                      {t.payer_name && <span>{t.type === "recette" ? "De : " : "À : "}{t.payer_name}</span>}
                      {rapportRow && <span className="text-primary/70">↗ {rapportRow.label}</span>}
                    </div>
                    {/* Status badges */}
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {isSigned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          <CheckCircle2 className="size-3" /> Signé le {fmtDate(t.signed_at ?? "")}
                        </span>
                      )}
                      {isValidated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          <ShieldCheck className="size-3" /> Validé le {fmtDate(t.validated_at ?? "")}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`shrink-0 text-sm font-semibold ${t.type === "recette" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "recette" ? "+" : "-"}{fmt(t.amount)}
                  </span>

                  <div className="flex shrink-0 flex-wrap gap-1">
                    {/* Sign button - secretaire sur recettes */}
                    {isSecretaire && t.type === "recette" && !isSigned && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs text-green-700 border-green-300 hover:bg-green-50"
                        onClick={() => { setSigningId(t.id); setSignOpen(true); }} title="Signer le reçu">
                        <Pen className="size-3" /> Signer
                      </Button>
                    )}
                    {/* Validate button - admin sur dépenses */}
                    {isAdmin && t.type === "depense" && !isValidated && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                        onClick={() => { setValidatingId(t.id); setValidateOpen(true); }} title="Valider la dépense">
                        <ShieldCheck className="size-3" /> Valider
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7" onClick={() => doPrintReceipt(t)} title="Imprimer le reçu">
                      <Printer className="mr-1 size-3.5" /> Reçu
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(t)} title="Modifier">
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId(t.id)} title="Supprimer">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* ── Dialog : nouvelle / modifier transaction ── */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la transaction" : "Nouvelle transaction"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh] pr-3">
            <form id="txn-form" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-4 py-1">

              {/* — Lien Rapport de Suivi — */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Lien Rapport de Suivi <span className="font-normal normal-case">(optionnel)</span>
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rapport de suivi</Label>
                  <Select
                    value={form.rapportId || "__none__"}
                    onValueChange={(v) => setForm((f) => ({ ...f, rapportId: v === "__none__" ? "" : v, rapportSubId: "", rapportRowId: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Aucun rapport lié —</SelectItem>
                      {rapports.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{fmtPeriod(r.period_start, r.period_end)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.rapportId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Libellé (sous-catégorie)</Label>
                      <Select value={form.rapportSubId}
                        onValueChange={(v) => setForm((f) => ({
                          ...f, rapportSubId: v, rapportRowId: "",
                          category: BUDGET_ROWS.find((r) => r.id === v)?.label ?? f.category,
                        }))}>
                        <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                        <SelectContent>
                          {availableSubs.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ligne budgétaire</Label>
                      <Select value={form.rapportRowId}
                        onValueChange={(v) => setForm((f) => ({ ...f, rapportRowId: v }))}
                        disabled={!form.rapportSubId}>
                        <SelectTrigger>
                          <SelectValue placeholder={form.rapportSubId ? "Choisir…" : "← Choisir un libellé"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableItems.map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* — Type & Date — */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={form.type}
                    onValueChange={(v) => setForm((f) => ({ ...f, type: v, rapportSubId: "", rapportRowId: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recette">✅ Recette (encaissement)</SelectItem>
                      <SelectItem value="depense">❌ Dépense (décaissement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
                </div>
              </div>

              {/* — Montants — */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Montant (FCFA) *</Label>
                  <Input type="number" min={0} step={0.01} value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Montant en toutes lettres</Label>
                  <Input value={form.amountWords}
                    onChange={(e) => setForm((f) => ({ ...f, amountWords: e.target.value }))}
                    placeholder="Ex : Dix mille francs CFA" />
                </div>
              </div>

              {/* — Mode de paiement & Bénéficiaire — */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mode de paiement</Label>
                  <Select value={form.paymentMethod}
                    onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{form.type === "recette" ? "Payeur / Client" : "Bénéficiaire / Fournisseur"}</Label>
                  <Input value={form.payerName}
                    onChange={(e) => setForm((f) => ({ ...f, payerName: e.target.value }))}
                    placeholder="Nom ou raison sociale…" />
                </div>
              </div>

              {/* — Catégorie & Branche — */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Input value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Auto-rempli depuis le libellé ou saisie libre" />
                </div>
                <div className="space-y-1.5">
                  <Label>Branche</Label>
                  <Select value={form.branch}
                    onValueChange={(v) => setForm((f) => ({ ...f, branch: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* — Description & Référence — */}
              <div className="space-y-1.5">
                <Label>Description / Objet</Label>
                <Input value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Objet de la transaction…" />
              </div>
              <div className="space-y-1.5">
                <Label>Référence / N° facture</Label>
                <Input value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="FAC-2026-001" />
              </div>
            </form>
          </ScrollArea>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setOpen(false); setEditingId(null); setForm(emptyForm); }}>
              Annuler
            </Button>
            <Button type="submit" form="txn-form" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Enregistrer les modifications" : "Ajouter la transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : signer reçu (secrétaire) ── */}
      <Dialog open={signOpen} onOpenChange={(v) => { if (!v) { setSignOpen(false); setSignNote(""); setSigningId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signer le reçu d'encaissement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              En signant, vous certifiez avoir encaissé ce montant et validez ce reçu.
            </p>
            <div className="space-y-1.5">
              <Label>Note / Observation <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
              <Textarea value={signNote} onChange={(e) => setSignNote(e.target.value)}
                placeholder="Remarque éventuelle…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSignOpen(false); setSignNote(""); setSigningId(null); }}>
              Annuler
            </Button>
            <Button onClick={() => { if (signingId) signTxn.mutate({ id: signingId, note: signNote }); }}
              disabled={signTxn.isPending} className="bg-green-700 hover:bg-green-800">
              {signTxn.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <CheckCircle2 className="mr-2 size-4" /> Signer le reçu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : valider dépense (admin) ── */}
      <Dialog open={validateOpen} onOpenChange={(v) => { if (!v) { setValidateOpen(false); setValidateNote(""); setValidatingId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider le bon de dépense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              En validant, vous approuvez cette dépense en tant qu'administrateur général.
            </p>
            <div className="space-y-1.5">
              <Label>Commentaire <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
              <Textarea value={validateNote} onChange={(e) => setValidateNote(e.target.value)}
                placeholder="Commentaire de validation…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setValidateOpen(false); setValidateNote(""); setValidatingId(null); }}>
              Annuler
            </Button>
            <Button onClick={() => { if (validatingId) validateTxn.mutate({ id: validatingId, note: validateNote }); }}
              disabled={validateTxn.isPending} className="bg-blue-700 hover:bg-blue-800">
              {validateTxn.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <ShieldCheck className="mr-2 size-4" /> Valider la dépense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ── */}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer cette transaction ?"
        description="Cette action est irréversible. Le rapport lié sera mis à jour automatiquement."
        onConfirm={() => { if (pendingDeleteId) del.mutate(pendingDeleteId); setPendingDeleteId(null); }}
        loading={del.isPending}
      />
    </>
  );
}
