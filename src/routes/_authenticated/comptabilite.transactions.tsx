import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown, Printer } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/comptabilite/transactions")({
  component: Transactions,
});

const BRANCHES = [
  { value: "sites_logiciels", label: "Sites & Logiciels" },
  { value: "automatisation", label: "Automatisation" },
  { value: "accompagnement", label: "Accompagnement étudiant" },
  { value: "marketing", label: "Marketing & Commercial" },
  { value: "general", label: "Général" },
];

const CATEGORIES_RECETTE = ["Prestation", "Abonnement", "Formation", "Partenariat", "Subvention", "Estudiantine", "Autre"];
const CATEGORIES_DEPENSE = ["Salaires", "Loyer", "Équipements", "Marketing", "Déplacements", "Logiciels", "Autre"];

const BRANCH_LABELS: Record<string, string> = Object.fromEntries(BRANCHES.map((b) => [b.value, b.label]));

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
}

const DK = "#1a5c3a";

function fmtDate(d: string) {
  return d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "—";
}

function buildReceiptHTML(t: Txn): string {
  const logoUrl = `${window.location.origin}/1.png`;
  const isRecette = t.type === "recette";
  const typeLabel = isRecette ? "REÇU DE PAIEMENT" : "BON DE DÉPENSE";
  const typeColor = isRecette ? "#166534" : "#991b1b";
  const ref = t.reference || `TXN-${t.id.slice(0, 8).toUpperCase()}`;
  const amtFormatted = fmt(t.amount);
  const printedAt = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

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
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;width:180px;border-bottom:1px solid #eee;">Type</td><td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;"><span style="font-weight:bold;color:${typeColor};">${isRecette ? "✓ Recette" : "✗ Dépense"}</span></td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Catégorie</td><td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;">${t.category}</td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Branche</td><td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;">${BRANCH_LABELS[t.branch] ?? t.branch}</td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;border-bottom:1px solid #eee;">Description</td><td style="padding:5px 8px;font-size:9pt;border-bottom:1px solid #eee;">${t.description || "—"}</td></tr>
    <tr><td style="padding:5px 8px;font-weight:bold;font-size:9pt;">Référence</td><td style="padding:5px 8px;font-size:9pt;">${ref}</td></tr>
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
  <div style="font-size:8pt;color:#888;max-width:60%;">Document généré par le système de gestion Rézo Campus. Ce reçu est valable comme justificatif de transaction interne.</div>
  <div style="border:1px solid #333;width:160px;height:70px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;"><span style="font-size:8.5pt;font-style:italic;color:#555;">Cachet et signature</span></div>
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

type Txn = { id: string; date: string; type: string; amount: number; category: string; branch: string; description: string | null; reference: string | null; amount_words?: string | null };

const emptyForm = { date: new Date().toISOString().slice(0, 10), type: "recette", amount: "", category: "", branch: "general", description: "", reference: "", amountWords: "" };

function Transactions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [filterType, setFilterType] = useState("tous");
  const [filterBranch, setFilterBranch] = useState("tous");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Txn[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.category || !form.amount) throw new Error("Catégorie et montant requis");
      const payload = {
        date: form.date,
        type: form.type,
        amount: Number(form.amount),
        category: form.category,
        branch: form.branch,
        description: form.description || null,
        reference: form.reference || null,
        amount_words: form.amountWords || null,
        created_by: auth?.user?.id ?? null,
      };
      const db = supabase as any;
      if (editingId) {
        const { error } = await db.from("transactions").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from("transactions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Transaction modifiée" : "Transaction ajoutée");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["compta-month"] });
      qc.invalidateQueries({ queryKey: ["compta-year"] });
      qc.invalidateQueries({ queryKey: ["compta-recent"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transaction supprimée");
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const openEdit = (t: Txn) => {
    setForm({ date: t.date, type: t.type, amount: String(t.amount), category: t.category, branch: t.branch, description: t.description ?? "", reference: t.reference ?? "", amountWords: t.amount_words ?? "" });
    setEditingId(t.id);
    setOpen(true);
  };

  const categories = form.type === "recette" ? CATEGORIES_RECETTE : CATEGORIES_DEPENSE;

  const filtered = txns.filter((t) => {
    if (filterType !== "tous" && t.type !== filterType) return false;
    if (filterBranch !== "tous" && t.branch !== filterBranch) return false;
    return true;
  });

  const totalRecettes = filtered.filter((t) => t.type === "recette").reduce((s, t) => s + t.amount, 0);
  const totalDepenses = filtered.filter((t) => t.type === "depense").reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Comptabilité"
        title="Transactions"
        description="Enregistrez et suivez toutes les entrées et sorties financières."
      />

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
          <span className="text-green-600 font-medium">+{fmt(totalRecettes)}</span>
          <span className="text-red-500 font-medium">-{fmt(totalDepenses)}</span>
          <span className={`font-semibold ${totalRecettes - totalDepenses >= 0 ? "text-green-600" : "text-red-500"}`}>
            = {fmt(totalRecettes - totalDepenses)}
          </span>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditingId(null); setForm(emptyForm); } else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier la transaction" : "Nouvelle transaction"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v, category: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recette">Recette</SelectItem>
                      <SelectItem value="depense">Dépense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Montant (FCFA)</Label>
                  <Input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Branche</Label>
                <Select value={form.branch} onValueChange={(v) => setForm((f) => ({ ...f, branch: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Objet de la transaction…" />
              </div>
              <div className="space-y-1.5">
                <Label>Référence / N° facture</Label>
                <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="FAC-2025-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Montant en toutes lettres</Label>
                <Input value={form.amountWords} onChange={(e) => setForm((f) => ({ ...f, amountWords: e.target.value }))} placeholder="Ex : Dix mille francs CFA" />
              </div>
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editingId ? "Enregistrer" : "Ajouter la transaction"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Panel title={`${filtered.length} transaction${filtered.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucune transaction.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${t.type === "recette" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
                  {t.type === "recette" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{t.description || t.category}</span>
                    <Badge variant="outline" className="text-xs">{t.category}</Badge>
                    <Badge variant="secondary" className="text-xs">{BRANCH_LABELS[t.branch] ?? t.branch}</Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{new Date(t.date).toLocaleDateString("fr-FR")}</span>
                    {t.reference && <span>Réf : {t.reference}</span>}
                  </div>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${t.type === "recette" ? "text-green-600" : "text-red-500"}`}>
                  {t.type === "recette" ? "+" : "-"}{fmt(t.amount)}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => doPrintReceipt(t)} title="Imprimer le reçu">
                    <Printer className="mr-1 size-3.5" /> Reçu
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Modifier">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setPendingDeleteId(t.id)} title="Supprimer">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer cette transaction ?"
        description="Cette action est irréversible. La transaction sera définitivement supprimée."
        onConfirm={() => {
          if (pendingDeleteId) del.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={del.isPending}
      />
    </>
  );
}
