import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2, FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SERVICE_CATALOG, DEFAULT_INVOICE_CONDITIONS } from "@/data/service-catalog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/comptabilite/facturation/")({
  component: FacturationListe,
});

type ClientLite = {
  id: string;
  type: string;
  prenom?: string | null;
  nom?: string | null;
  nom_entreprise?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
  annulee: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-gray-100 text-gray-600",
  envoyee: "bg-blue-100 text-blue-700",
  payee: "bg-green-100 text-green-700",
  annulee: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = ["brouillon", "envoyee", "payee", "annulee"];

function clientLabel(c?: ClientLite | null) {
  if (!c) return "—";
  if (c.type === "entreprise") return c.nom_entreprise || "—";
  return [c.prenom, c.nom].filter(Boolean).join(" ") || "—";
}

type LineForm = { key: string; service: string; customService: string; description: string; montant: string };
const emptyLine = (): LineForm => ({
  key: crypto.randomUUID(), service: "", customService: "", description: "", montant: "",
});
const emptyForm = {
  numero: "",
  client_id: "",
  date_facture: new Date().toISOString().split("T")[0],
  status: "brouillon",
  conditions: DEFAULT_INVOICE_CONDITIONS,
  notes: "",
};

export function FacturationListe() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const uid = auth?.user?.id;

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("date_facture", { ascending: false });
      if (error) throw error;
      if (!data.length) return [];

      const clientIds = [...new Set(data.map((i) => i.client_id).filter(Boolean))] as string[];
      const invoiceIds = data.map((i) => i.id);

      const [clientsRes, linesRes] = await Promise.all([
        clientIds.length
          ? supabase.from("clients").select("id, type, prenom, nom, nom_entreprise").in("id", clientIds)
          : Promise.resolve({ data: [] as ClientLite[] }),
        supabase.from("invoice_lines").select("invoice_id, montant").in("invoice_id", invoiceIds),
      ]);

      return data.map((inv) => {
        const total = (linesRes.data ?? [])
          .filter((l) => l.invoice_id === inv.id)
          .reduce((sum, l) => sum + Number(l.montant), 0);
        return {
          ...inv,
          client: (clientsRes.data ?? []).find((c) => c.id === inv.client_id),
          total,
        };
      });
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, type, prenom, nom, nom_entreprise")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function resetAndClose() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setLines([emptyLine()]);
  }

  function openNew() {
    setEditingId(null);
    const year = new Date().getFullYear();
    const suggested = `FACT-${year}-${String(invoices.length + 1).padStart(3, "0")}`;
    setForm({ ...emptyForm, numero: suggested });
    setLines([emptyLine()]);
    setOpen(true);
  }

  async function openEdit(invoiceId: string) {
    const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    const { data: invLines } = await supabase
      .from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("position");
    if (!inv) return;
    setForm({
      numero: inv.numero,
      client_id: inv.client_id ?? "",
      date_facture: inv.date_facture,
      status: inv.status,
      conditions: inv.conditions ?? "",
      notes: inv.notes ?? "",
    });
    setLines(
      (invLines ?? []).map((l) => {
        const known = SERVICE_CATALOG.flatMap((c) => c.items).some((it) => it.label === l.service);
        return {
          key: crypto.randomUUID(),
          service: known ? l.service : "Autre service (à préciser)",
          customService: known ? "" : l.service,
          description: l.description ?? "",
          montant: String(l.montant),
        };
      })
    );
    setEditingId(invoiceId);
    setOpen(true);
  }

  function updateLine(key: string, patch: Partial<LineForm>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.montant) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.numero.trim()) throw new Error("Le numéro de facture est requis.");
      if (!form.client_id) throw new Error("Veuillez choisir un client.");
      const validLines = lines.filter((l) => (l.service || l.customService) && l.montant);
      if (!validLines.length) throw new Error("Ajoutez au moins une ligne de facturation avec un montant.");

      const payload = {
        numero: form.numero.trim(),
        client_id: form.client_id,
        date_facture: form.date_facture,
        status: form.status,
        conditions: form.conditions || null,
        notes: form.notes || null,
      };

      let invoiceId = editingId;
      if (editingId) {
        const { error } = await supabase.from("invoices").update(payload).eq("id", editingId);
        if (error) throw error;
        await supabase.from("invoice_lines").delete().eq("invoice_id", editingId);
      } else {
        const { data, error } = await supabase
          .from("invoices")
          .insert({ ...payload, created_by: uid })
          .select("id")
          .single();
        if (error) throw error;
        invoiceId = data.id;
      }

      const linesPayload = validLines.map((l, i) => ({
        invoice_id: invoiceId!,
        service: l.service === "Autre service (à préciser)" ? (l.customService.trim() || "Service") : l.service,
        description: l.description || null,
        montant: Number(l.montant),
        position: i,
      }));
      const { error: linesErr } = await supabase.from("invoice_lines").insert(linesPayload);
      if (linesErr) throw linesErr;
    },
    onSuccess: () => {
      toast.success(editingId ? "Facture modifiée" : "Facture créée");
      resetAndClose();
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Facture supprimée");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Facturation"
        title="Factures clients"
        description="Créez des factures à partir des services proposés, avec montants saisis librement."
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}>
          <Plus className="mr-2 size-4" /> Nouvelle facture
        </Button>
      </div>

      <Panel title={`${invoices.length} facture${invoices.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <Receipt className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucune facture enregistrée.
          </div>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{inv.numero}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[inv.status] ?? "bg-muted"}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>{clientLabel(inv.client)}</span>
                    <span>{new Date(inv.date_facture).toLocaleDateString("fr-FR")}</span>
                    <span className="font-medium text-foreground">{inv.total.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link to="/comptabilite/facturation/$invoiceId" params={{ invoiceId: inv.id }}>
                    <Button size="sm" variant="outline">Voir / Imprimer</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(inv.id)}>Modifier</Button>
                  <Button
                    size="sm" variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setPendingDeleteId(inv.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Dialog formulaire */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la facture" : "Nouvelle facture"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Numéro de facture *</Label>
                <Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date_facture} onChange={(e) => setForm((f) => ({ ...f, date_facture: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{clientLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lignes de facturation */}
            <div className="space-y-2">
              <Label>Lignes de facturation</Label>
              <div className="space-y-3">
                {lines.map((l) => (
                  <div key={l.key} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Select value={l.service} onValueChange={(v) => updateLine(l.key, { service: v })}>
                          <SelectTrigger><SelectValue placeholder="Choisir un service..." /></SelectTrigger>
                          <SelectContent>
                            {SERVICE_CATALOG.map((cat) => (
                              <div key={cat.category}>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{cat.category}</div>
                                {cat.items.map((it) => (
                                  <SelectItem key={it.label} value={it.label}>
                                    {it.label}{it.hint ? ` — ${it.hint}` : ""}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        {l.service === "Autre service (à préciser)" && (
                          <Input
                            placeholder="Préciser le nom du service"
                            value={l.customService}
                            onChange={(e) => updateLine(l.key, { customService: e.target.value })}
                          />
                        )}
                        <Input
                          placeholder="Description (optionnel)"
                          value={l.description}
                          onChange={(e) => updateLine(l.key, { description: e.target.value })}
                        />
                      </div>
                      <div className="w-36 shrink-0 space-y-2">
                        <Input
                          type="number" min={0}
                          placeholder="Montant (FCFA)"
                          value={l.montant}
                          onChange={(e) => updateLine(l.key, { montant: e.target.value })}
                        />
                        <Button
                          type="button" size="sm" variant="ghost"
                          className="w-full text-destructive hover:bg-destructive/10"
                          onClick={() => removeLine(l.key)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus className="size-3.5" /> Ajouter une ligne
              </button>
              <div className="flex justify-end rounded-lg bg-muted/40 p-3 text-sm font-semibold">
                Total : {total.toLocaleString("fr-FR")} FCFA
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Conditions de paiement</Label>
              <Textarea rows={3} value={form.conditions} onChange={(e) => setForm((f) => ({ ...f, conditions: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes complémentaires</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Annuler</Button>
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
        description="Cette action est irréversible. La facture et ses lignes seront définitivement supprimées."
        onConfirm={() => {
          if (pendingDeleteId) deleteInvoice.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={deleteInvoice.isPending}
      />
    </>
  );
}
