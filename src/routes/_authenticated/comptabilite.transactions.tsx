import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown } from "lucide-react";
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

const CATEGORIES_RECETTE = ["Prestation", "Abonnement", "Formation", "Partenariat", "Subvention", "Autre"];
const CATEGORIES_DEPENSE = ["Salaires", "Loyer", "Équipements", "Marketing", "Déplacements", "Logiciels", "Autre"];

const BRANCH_LABELS: Record<string, string> = Object.fromEntries(BRANCHES.map((b) => [b.value, b.label]));

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
}

type Txn = { id: string; date: string; type: string; amount: number; category: string; branch: string; description: string | null; reference: string | null };

const emptyForm = { date: new Date().toISOString().slice(0, 10), type: "recette", amount: "", category: "", branch: "general", description: "", reference: "" };

function Transactions() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterType, setFilterType] = useState("tous");
  const [filterBranch, setFilterBranch] = useState("tous");

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data as Txn[];
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
        created_by: auth?.user?.id ?? null,
      };
      if (editingId) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert(payload);
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
    setForm({ date: t.date, type: t.type, amount: String(t.amount), category: t.category, branch: t.branch, description: t.description ?? "", reference: t.reference ?? "" });
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
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Modifier">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => del.mutate(t.id)} disabled={del.isPending} title="Supprimer">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
