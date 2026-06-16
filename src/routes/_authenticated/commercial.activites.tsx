import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/commercial/activites")({
  component: CommercialActivites,
});

const TYPES = [
  { value: "partenariat", label: "Partenariat" },
  { value: "forum", label: "Forum / Événement" },
  { value: "visite", label: "Visite terrain" },
  { value: "suivi_livraison", label: "Suivi livraison" },
  { value: "solution_numerique", label: "Solution numérique" },
  { value: "prospection", label: "Prospection" },
  { value: "autre", label: "Autre" },
];

const STATUSES = [
  { value: "prospection", label: "Prospection" },
  { value: "en_negociation", label: "En négociation" },
  { value: "gagne", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
  { value: "en_attente", label: "En attente" },
  { value: "annule", label: "Annulé" },
];

const STATUS_COLORS: Record<string, string> = {
  prospection: "bg-blue-100 text-blue-700",
  en_negociation: "bg-yellow-100 text-yellow-700",
  gagne: "bg-green-100 text-green-700",
  perdu: "bg-red-100 text-red-500",
  en_attente: "bg-gray-100 text-gray-600",
  annule: "bg-gray-100 text-gray-400",
};

type Lead = {
  id: string; type: string; title: string; description: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  status: string; value: number | null; scheduled_at: string | null;
  notes: string | null; created_at: string; updated_at: string;
};

const emptyForm = { type: "prospection", title: "", description: "", contact_name: "", contact_email: "", contact_phone: "", status: "prospection", value: "", scheduled_at: "", notes: "" };

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 });
}

function CommercialActivites() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState("tous");
  const [filterType, setFilterType] = useState("tous");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["commercial-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commercial_leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Titre requis");
      const payload = {
        type: form.type,
        title: form.title.trim(),
        description: form.description || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        status: form.status,
        value: form.value ? Number(form.value) : null,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        notes: form.notes || null,
        created_by: auth?.user?.id ?? null,
      };
      if (editingId) {
        const { error } = await supabase.from("commercial_leads").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("commercial_leads").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Activité modifiée" : "Activité ajoutée");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["commercial-leads"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commercial_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Activité supprimée");
      qc.invalidateQueries({ queryKey: ["commercial-leads"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const openEdit = (l: Lead) => {
    setForm({
      type: l.type, title: l.title, description: l.description ?? "",
      contact_name: l.contact_name ?? "", contact_email: l.contact_email ?? "",
      contact_phone: l.contact_phone ?? "", status: l.status,
      value: l.value ? String(l.value) : "",
      scheduled_at: l.scheduled_at ? new Date(l.scheduled_at).toISOString().slice(0, 16) : "",
      notes: l.notes ?? "",
    });
    setEditingId(l.id);
    setOpen(true);
  };

  const filtered = leads.filter((l) => {
    if (filterStatus !== "tous" && l.status !== filterStatus) return false;
    if (filterType !== "tous" && l.type !== filterType) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Marketing & Commercial"
        title="Activités commerciales"
        description="Suivez vos opportunités, partenariats, visites et solutions proposées."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous statuts</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditingId(null); setForm(emptyForm); } else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 size-4" /> Nouvelle activité</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Modifier l'activité" : "Nouvelle activité commerciale"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Statut</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Titre *</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Nom de l'opportunité ou activité" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Contexte, objectif…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Contact (nom)</Label>
                    <Input value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email contact</Label>
                    <Input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valeur estimée (FCFA)</Label>
                    <Input type="number" min={0} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Date / Heure prévue</Label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingId ? "Enregistrer" : "Créer l'activité"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Panel title={`${filtered.length} activité${filtered.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucune activité.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{l.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[l.status]}`}>
                      {STATUSES.find((s) => s.value === l.status)?.label}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {TYPES.find((t) => t.value === l.type)?.label}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {l.contact_name && <span>{l.contact_name}</span>}
                    {l.contact_phone && <span>{l.contact_phone}</span>}
                    {l.contact_email && <span>{l.contact_email}</span>}
                    {l.scheduled_at && <span>· {new Date(l.scheduled_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                    {l.value && <span className="font-semibold text-primary">· {fmt(l.value)}</span>}
                  </div>
                  {l.notes && <p className="mt-1 text-xs text-muted-foreground italic">{l.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(l)} title="Modifier"><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setPendingDeleteId(l.id)} title="Supprimer"><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer cette activité ?"
        description="Cette action est irréversible. L'activité commerciale sera définitivement supprimée."
        onConfirm={() => {
          if (pendingDeleteId) del.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={del.isPending}
      />
    </>
  );
}
