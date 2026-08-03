/**
 * Shared factures component — used by all departments.
 * Queries the `factures` table (new Moroccan/F CFA model).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const DK = "#1a5c3a";

const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
};
const fmtDate = (d: string) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "…………………";
const fmtNum = (n: number) =>
  n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type LineItem = { id: string; designation: string; qte: number; pu: number };
export type Facture = {
  id: string; number: string; date: string; echeance: string | null;
  status: string; client_name: string | null; client_address: string | null;
  client_city: string | null; client_ice: string | null;
  items: LineItem[]; tva_rate: number; amount_words: string | null;
  mode_reglement: string | null; banque: string | null; rib: string | null;
  delai: string | null; created_at: string;
};

export const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-gray-100 text-gray-600",
  envoyee: "bg-blue-100 text-blue-700",
  payee: "bg-green-100 text-green-700",
  annulee: "bg-red-100 text-red-600",
};
export const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", envoyee: "Envoyée", payee: "Payée", annulee: "Annulée",
};

export function calcHT(items: LineItem[]) {
  return items.reduce((acc, it) => acc + (Number(it.qte) || 0) * (Number(it.pu) || 0), 0);
}

export function buildFacturePrintHTML(f: Facture): string {
  const items = f.items || [];
  const totalHT = calcHT(items);
  const tva = totalHT * ((Number(f.tva_rate) || 20) / 100);
  const totalTTC = totalHT + tva;
  const logoUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/1.png`;

  const itemRows = items.map((it) => {
    const mt = (Number(it.qte) || 0) * (Number(it.pu) || 0);
    return `<tr>
      <td style="border:1px solid #ddd;padding:5px 8px;font-size:9pt;">${it.designation || ""}</td>
      <td style="border:1px solid #ddd;padding:5px 8px;text-align:center;font-size:9pt;">${it.qte}</td>
      <td style="border:1px solid #ddd;padding:5px 8px;text-align:right;font-size:9pt;">${fmtNum(Number(it.pu))}</td>
      <td style="border:1px solid #ddd;padding:5px 8px;text-align:right;font-size:9pt;">${mt === 0 ? "" : fmtNum(mt)}</td>
    </tr>`;
  }).join("");
  const emptyRows = Array(Math.max(0, 5 - items.length)).fill(0).map(() =>
    `<tr><td style="border:1px solid #ddd;padding:10px 8px;">&nbsp;</td><td style="border:1px solid #ddd;"></td><td style="border:1px solid #ddd;"></td><td style="border:1px solid #ddd;"></td></tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture ${f.number}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:10pt;color:#222;padding:15mm 12mm;}@media print{@page{size:A4;margin:12mm;}body{padding:0;}}table{border-collapse:collapse;width:100%;}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
  <div style="display:flex;align-items:flex-start;gap:12px;">
    <img src="${logoUrl}" alt="Rézo Campus" style="height:60px;width:auto;object-fit:contain;" onerror="this.style.display='none'" />
    <div>
      <div style="font-size:18pt;font-weight:bold;color:${DK};line-height:1.1;">RÉZO CAMPUS</div>
      <div style="font-size:8.5pt;color:#555;margin-top:2px;">Société à responsabilité limitée (SARL)</div>
      <div style="margin-top:6px;font-size:8pt;color:#333;line-height:1.7;">
        <strong>Maroc :</strong> 46, Bd Zerktouni, Étage 5, N17 — Maarif, 20250 Casablanca<br>
        <strong>Congo :</strong> Av de l'OUA, bloc 88-91, Moukoundzi Ngouaka — Brazzaville<br>
        ✉ contact@rezoconnect.com &nbsp;|&nbsp; ☎ Maroc : +212 617-725867 &nbsp;|&nbsp; Congo : +242 06 800 01 99
      </div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:28pt;font-weight:bold;color:${DK};line-height:1;">FACTURE</div>
    <table style="margin-top:10px;width:auto;border-collapse:collapse;">
      <tr><td style="padding:3px 8px;font-size:9pt;font-weight:bold;text-align:right;">Facture n°</td><td style="padding:3px 8px;font-size:9pt;border:1px solid #333;background:#fffde7;min-width:110px;">${f.number}</td></tr>
      <tr><td style="padding:3px 8px;font-size:9pt;font-weight:bold;text-align:right;">Date</td><td style="padding:3px 8px;font-size:9pt;border:1px solid #333;background:#fffde7;">${fmtDate(f.date)}</td></tr>
      <tr><td style="padding:3px 8px;font-size:9pt;font-weight:bold;text-align:right;">Échéance</td><td style="padding:3px 8px;font-size:9pt;border:1px solid #333;background:#fffde7;">${f.echeance ? fmtDate(f.echeance) : "—"}</td></tr>
    </table>
  </div>
</div>
<div style="background:${DK};color:white;text-align:center;padding:5px 8px;font-size:8.5pt;margin-bottom:12px;">RC 741051 (Casablanca) &nbsp;-&nbsp; ICE 003997443000066 &nbsp;-&nbsp; IF 73197307 &nbsp;-&nbsp; TP 34218488</div>
<div style="border:1px solid ${DK};margin-bottom:12px;">
  <div style="background:#d4edda;padding:4px 8px;font-weight:bold;font-size:9pt;color:${DK};border-bottom:1px solid ${DK};">CLIENT</div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:9pt;width:160px;">Raison sociale / Nom</td><td style="padding:4px 8px;font-size:9pt;background:#fffde7;">${f.client_name || "Nom du client"}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:9pt;">Adresse</td><td style="padding:4px 8px;font-size:9pt;background:#fffde7;">${f.client_address || "Adresse complète du client"}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:9pt;">Ville / Pays</td><td style="padding:4px 8px;font-size:9pt;background:#fffde7;">${f.client_city || "Brazzaville - Congo"}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:9pt;">Réf. client</td><td style="padding:4px 8px;font-size:9pt;background:#fffde7;">${f.client_ice || "—"}</td></tr>
  </table>
</div>
<table style="margin-bottom:8px;">
  <thead><tr style="background:${DK};color:white;"><th style="padding:6px 8px;text-align:left;font-size:9pt;">Désignation</th><th style="padding:6px 8px;text-align:center;font-size:9pt;width:60px;">Qté</th><th style="padding:6px 8px;text-align:right;font-size:9pt;width:110px;">P.U. HT (F CFA)</th><th style="padding:6px 8px;text-align:right;font-size:9pt;width:120px;">Montant HT (F CFA)</th></tr></thead>
  <tbody>${itemRows}${emptyRows}</tbody>
</table>
<div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
  <table style="width:260px;border-collapse:collapse;">
    <tr><td style="padding:4px 8px;text-align:right;font-size:9pt;background:#f5f5f5;border:1px solid #ddd;">Total HT</td><td style="padding:4px 8px;text-align:right;font-size:9pt;border:1px solid #ddd;width:110px;">${fmtNum(totalHT)} F CFA</td></tr>
    <tr><td style="padding:4px 8px;text-align:right;font-size:9pt;background:#f5f5f5;border:1px solid #ddd;"><span style="font-style:italic;font-size:8pt;color:#666;">Taux TVA -> </span>${f.tva_rate || 20}% &nbsp; TVA</td><td style="padding:4px 8px;text-align:right;font-size:9pt;border:1px solid #ddd;">${fmtNum(tva)} F CFA</td></tr>
    <tr style="background:${DK};color:white;font-weight:bold;"><td style="padding:5px 8px;text-align:right;font-size:10pt;border:1px solid ${DK};">TOTAL TTC</td><td style="padding:5px 8px;text-align:right;font-size:10pt;border:1px solid ${DK};">${fmtNum(totalTTC)} F CFA</td></tr>
  </table>
</div>
<div style="margin-bottom:12px;"><div style="font-weight:bold;font-size:9pt;margin-bottom:3px;">Arrêtée la présente facture à la somme de :</div><div style="border:1px solid #ddd;padding:5px 8px;background:#fffde7;font-size:9pt;min-height:30px;">${f.amount_words || "(montant en toutes lettres) francs CFA, toutes taxes comprises."}</div></div>
<div style="border:1px solid #ddd;margin-bottom:12px;">
  <div style="background:#d4edda;padding:4px 8px;font-weight:bold;font-size:9pt;color:${DK};border-bottom:1px solid #ddd;">MODALITÉS DE RÈGLEMENT</div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:9pt;width:160px;">Mode de règlement</td><td style="padding:4px 8px;font-size:9pt;">${f.mode_reglement || "Virement bancaire / Mobile Money"}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:9pt;">Banque</td><td style="padding:4px 8px;font-size:9pt;">${f.banque || "À compléter"}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:9pt;">RIB / IBAN</td><td style="padding:4px 8px;font-size:9pt;">${f.rib || "À compléter"}</td></tr>
    <tr><td style="padding:4px 8px;font-weight:bold;font-size:9pt;">Délai de paiement</td><td style="padding:4px 8px;font-size:9pt;">${f.delai || "30 jours date de facture"}</td></tr>
  </table>
</div>
<div style="font-size:8pt;color:#555;text-align:center;margin-bottom:10px;">Paiement : 50 % à la commande, solde à la livraison. Moyens de paiement : MTN Mobile Money, Airtel Money, virement bancaire, espèces.</div>
<div style="background:${DK};color:white;text-align:center;padding:4px 8px;font-size:8pt;margin-bottom:14px;">RÉZO CAMPUS SARL — Brazzaville (Congo) &amp; Casablanca (Maroc) — contact@rezoconnect.com</div>
<div style="display:flex;justify-content:flex-end;"><div style="border:1px solid #333;width:160px;height:70px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;"><span style="font-size:8.5pt;font-style:italic;color:#555;">Cachet et signature</span></div></div>
</body></html>`;
}

export function doPrintFacture(f: Facture) {
  const html = buildFacturePrintHTML(f);
  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez les pop-ups pour imprimer."); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

type FormState = {
  number: string; date: string; echeance: string; status: string;
  clientName: string; clientAddress: string; clientCity: string; clientIce: string;
  items: LineItem[]; tvaRate: number; amountWords: string;
  modeReglement: string; banque: string; rib: string; delai: string;
};

function makeForm(count: number, existing?: Facture): FormState {
  if (existing) {
    return {
      number: existing.number,
      date: existing.date,
      echeance: existing.echeance || addDays(existing.date, 30),
      status: existing.status,
      clientName: existing.client_name || "",
      clientAddress: existing.client_address || "",
      clientCity: existing.client_city || "Casablanca - Maroc",
      clientIce: existing.client_ice || "",
      items: (existing.items || []).length > 0 ? existing.items : [{ id: uid(), designation: "", qte: 1, pu: 0 }],
      tvaRate: Number(existing.tva_rate) || 20,
      amountWords: existing.amount_words || "",
      modeReglement: existing.mode_reglement || "Virement bancaire",
      banque: existing.banque || "",
      rib: existing.rib || "",
      delai: existing.delai || "30 jours date de facture",
    };
  }
  const d = todayStr();
  return {
    number: `FACT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`,
    date: d, echeance: addDays(d, 30), status: "brouillon",
    clientName: "", clientAddress: "", clientCity: "Casablanca - Maroc", clientIce: "",
    items: [{ id: uid(), designation: "", qte: 1, pu: 0 }],
    tvaRate: 20, amountWords: "",
    modeReglement: "Virement bancaire", banque: "", rib: "", delai: "30 jours date de facture",
  };
}

export function FacturesPage() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const userId = auth?.user?.id;

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(makeForm(0));
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: factures = [], isLoading } = useQuery({
    queryKey: ["factures"],
    queryFn: async () => {
      const { data, error } = await db.from("factures").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Facture[];
    },
  });

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  function openNew() {
    setEditingId(null);
    setForm(makeForm(factures.length));
    setOpen(true);
  }
  function openEdit(f: Facture) {
    setEditingId(f.id);
    setForm(makeForm(factures.length, f));
    setOpen(true);
  }
  function closeDialog() { setOpen(false); setEditingId(null); }

  const addItem = () =>
    setForm((p) => ({ ...p, items: [...p.items, { id: uid(), designation: "", qte: 1, pu: 0 }] }));
  const removeItem = (id: string) =>
    setForm((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
  const updItem = <K extends keyof LineItem>(id: string, k: K, v: LineItem[K]) =>
    setForm((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, [k]: v } : it)) }));

  const totalHT = calcHT(form.items);
  const tva = totalHT * (form.tvaRate / 100);
  const totalTTC = totalHT + tva;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.number.trim()) throw new Error("Le numéro de facture est requis.");
      const payload = {
        number: form.number.trim(),
        date: form.date,
        echeance: form.echeance || null,
        status: form.status,
        client_name: form.clientName || null,
        client_address: form.clientAddress || null,
        client_city: form.clientCity || null,
        client_ice: form.clientIce || null,
        items: form.items,
        tva_rate: form.tvaRate,
        amount_words: form.amountWords || null,
        mode_reglement: form.modeReglement || null,
        banque: form.banque || null,
        rib: form.rib || null,
        delai: form.delai || null,
      };
      if (editingId) {
        const { error } = await db.from("factures").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from("factures").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Facture modifiée" : "Facture créée");
      qc.invalidateQueries({ queryKey: ["factures"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("factures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Facture supprimée");
      qc.invalidateQueries({ queryKey: ["factures"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Facturation"
        title="Factures clients"
        description="Créez des factures au format officiel Rézo Campus (Maroc — F CFA — TVA)."
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}><Plus className="mr-2 size-4" /> Nouvelle facture</Button>
      </div>

      <Panel title={`${factures.length} facture${factures.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : factures.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucune facture enregistrée.
          </div>
        ) : (
          <ul className="space-y-2">
            {factures.map((f) => {
              const ht = calcHT(f.items || []);
              const tvaAmt = ht * ((Number(f.tva_rate) || 20) / 100);
              const ttc = ht + tvaAmt;
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{f.number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[f.status] ?? "bg-muted"}`}>
                        {STATUS_LABELS[f.status] ?? f.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{f.client_name || "—"}</span>
                      <span>{fmtDate(f.date)}</span>
                      <span className="font-medium text-foreground">{fmtNum(ttc)} F CFA</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => doPrintFacture(f)}>
                      <Printer className="mr-1 size-3.5" /> Voir / Imprimer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>Modifier</Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId(f.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Dialog formulaire */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la facture" : "Nouvelle facture"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">N° de facture *</Label>
                <Input className="mt-1" value={form.number} onChange={(e) => upd("number", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" className="mt-1" value={form.date} onChange={(e) => upd("date", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Échéance</Label>
                <Input type="date" className="mt-1" value={form.echeance} onChange={(e) => upd("echeance", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Statut</Label>
              <Select value={form.status} onValueChange={(v) => upd("status", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["brouillon", "envoyee", "payee", "annulee"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Client */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Client</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Raison sociale / Nom</Label>
                  <Input className="mt-1 text-sm" value={form.clientName} onChange={(e) => upd("clientName", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Adresse</Label>
                  <Input className="mt-1 text-sm" value={form.clientAddress} onChange={(e) => upd("clientAddress", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ville / Pays</Label>
                  <Input className="mt-1 text-sm" value={form.clientCity} onChange={(e) => upd("clientCity", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ICE du client</Label>
                  <Input className="mt-1 text-sm" value={form.clientIce} onChange={(e) => upd("clientIce", e.target.value)} />
                </div>
              </div>
            </div>
            {/* Items */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Lignes de facturation</p>
              {form.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2">
                  <Input placeholder="Désignation" className="flex-1 text-sm"
                    value={it.designation} onChange={(e) => updItem(it.id, "designation", e.target.value)} />
                  <Input type="number" min={0} step="0.01" placeholder="Qté" className="w-16 text-sm text-right"
                    value={it.qte} onChange={(e) => updItem(it.id, "qte", parseFloat(e.target.value) || 0)} />
                  <Input type="number" min={0} step="0.01" placeholder="P.U. HT" className="w-24 text-sm text-right"
                    value={it.pu === 0 ? "" : it.pu}
                    onChange={(e) => updItem(it.id, "pu", parseFloat(e.target.value) || 0)} />
                  <span className="w-24 text-right text-xs font-medium shrink-0">
                    {fmtNum(it.qte * it.pu)} F CFA
                  </span>
                  <Button size="icon" variant="ghost" className="size-8 shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(it.id)} disabled={form.items.length === 1}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="size-3.5" /> Ajouter une ligne
              </button>
              <div className="flex flex-col items-end gap-1 rounded-lg bg-muted/40 p-3 text-sm">
                <span>Total HT : <strong>{fmtNum(totalHT)} F CFA</strong></span>
                <div className="flex items-center gap-2">
                  <span>TVA</span>
                  <Input type="number" min={0} max={100} value={form.tvaRate}
                    onChange={(e) => upd("tvaRate", parseFloat(e.target.value) || 0)}
                    className="h-6 w-14 px-1 text-center text-xs" />
                  <span>% : <strong>{fmtNum(tva)} F CFA</strong></span>
                </div>
                <span className="font-bold text-primary">TOTAL TTC : {fmtNum(totalTTC)} F CFA</span>
              </div>
            </div>
            {/* Compléments */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Montant en toutes lettres</Label>
              <Input className="text-sm" value={form.amountWords} onChange={(e) => upd("amountWords", e.target.value)}
                placeholder="Ex : Douze mille cinq cents dirhams toutes taxes comprises." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Mode de règlement</Label>
                <Input className="mt-1 text-sm" value={form.modeReglement} onChange={(e) => upd("modeReglement", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Banque</Label>
                <Input className="mt-1 text-sm" value={form.banque} onChange={(e) => upd("banque", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">RIB / IBAN</Label>
                <Input className="mt-1 text-sm" value={form.rib} onChange={(e) => upd("rib", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Délai de paiement</Label>
                <Input className="mt-1 text-sm" value={form.delai} onChange={(e) => upd("delai", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Enregistrer" : "Créer la facture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer cette facture ?"
        description="Cette action est irréversible. La facture sera définitivement supprimée."
        onConfirm={() => { if (pendingDeleteId) del.mutate(pendingDeleteId); setPendingDeleteId(null); }}
        loading={del.isPending}
      />
    </>
  );
}

export { FacturesPage as FacturationListe };
