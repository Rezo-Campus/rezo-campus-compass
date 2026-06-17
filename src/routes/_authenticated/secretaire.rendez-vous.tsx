import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Pencil, Trash2, User, Building2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/secretaire/rendez-vous")({
  component: ClientAppointments,
});

type ClientLite = {
  id: string;
  type: string;
  prenom?: string | null;
  nom?: string | null;
  nom_entreprise?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  programme: "Programmé",
  termine: "Terminé",
  annule: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
  programme: "bg-blue-100 text-blue-700",
  termine: "bg-green-100 text-green-700",
  annule: "bg-red-100 text-red-700",
};

function clientLabel(c?: ClientLite | null) {
  if (!c) return "—";
  if (c.type === "entreprise") return c.nom_entreprise || "—";
  return [c.prenom, c.nom].filter(Boolean).join(" ") || "—";
}

export function ClientAppointments() {
  const { data: auth } = useAuth();
  const canManage = auth?.role === "admin" || auth?.role === "secretaire";
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const emptyForm = { client_id: "", scheduled_at: "", duration_min: 30, location: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: rdvs = [], isLoading } = useQuery({
    queryKey: ["client-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_appointments")
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      if (!data.length) return [];
      const clientIds = [...new Set(data.map((a) => a.client_id))];
      const { data: clients } = await supabase
        .from("clients")
        .select("id, type, prenom, nom, nom_entreprise")
        .in("id", clientIds);
      return data.map((a) => ({
        ...a,
        client: clients?.find((c) => c.id === a.client_id),
      }));
    },
  });

  const { data: clients = [] } = useQuery({
    enabled: canManage,
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

  const resetAndClose = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (r: typeof rdvs[0]) => {
    const dt = new Date(r.scheduled_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    setForm({
      client_id: r.client_id,
      scheduled_at: local,
      duration_min: r.duration_min,
      location: r.location ?? "",
      notes: r.notes ?? "",
    });
    setEditingId(r.id);
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.client_id || !form.scheduled_at) throw new Error("Client et date requis");
      const payload = {
        client_id: form.client_id,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_min: form.duration_min,
        location: form.location || null,
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from("client_appointments").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_appointments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Rendez-vous modifié" : "Rendez-vous créé");
      resetAndClose();
      qc.invalidateQueries({ queryKey: ["client-appointments"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteRdv = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rendez-vous supprimé");
      qc.invalidateQueries({ queryKey: ["client-appointments"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const upcoming = rdvs.filter((r) => new Date(r.scheduled_at) >= new Date() && r.status === "programme");
  const past = rdvs.filter((r) => !upcoming.includes(r));

  const RdvCard = ({ r }: { r: typeof rdvs[0] }) => (
    <li className="flex items-start gap-3 rounded-xl border border-border p-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {r.client?.type === "entreprise" ? <Building2 className="size-4" /> : <User className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{clientLabel(r.client)}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(r.scheduled_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
          {" · "}{r.duration_min} min
          {r.location && ` · ${r.location}`}
        </div>
        {r.notes && <div className="mt-1 text-xs text-muted-foreground italic">{r.notes}</div>}
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[r.status] ?? "bg-muted"}`}>
        {STATUS_LABELS[r.status] ?? r.status}
      </span>
      {canManage && r.status === "programme" && (
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Modifier">
            <Pencil className="size-4" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setPendingDeleteId(r.id)}
            title="Supprimer"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </li>
  );

  return (
    <>
      <PageHeader
        eyebrow="Rendez-vous"
        title="Rendez-vous clients"
        description={
          canManage
            ? "Planifiez et suivez les rendez-vous avec les clients du secrétariat."
            : "Rendez-vous clients planifiés par le secrétariat, visibles par tous les départements."
        }
      />

      {canManage && (
        <div className="mb-4 flex justify-end">
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 size-4" /> Nouveau RDV</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Modifier le rendez-vous" : "Planifier un rendez-vous"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select
                    value={form.client_id}
                    disabled={!!editingId}
                    onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{clientLabel(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date & heure</Label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Durée (min)</Label>
                    <Input
                      type="number" min={10} max={240}
                      value={form.duration_min}
                      onChange={(e) => setForm((f) => ({ ...f, duration_min: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Lieu / lien visio</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Bureau Casablanca, Google Meet, ..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingId ? "Enregistrer les modifications" : "Créer le rendez-vous"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-primary" />
      ) : (
        <>
          <Panel title={`À venir (${upcoming.length})`}>
            {upcoming.length === 0 ? <Empty /> : (
              <ul className="space-y-3">{upcoming.map((r) => <RdvCard key={r.id} r={r} />)}</ul>
            )}
          </Panel>
          <div className="mt-6">
            <Panel title={`Historique (${past.length})`}>
              {past.length === 0 ? <Empty /> : (
                <ul className="space-y-3">{past.map((r) => <RdvCard key={r.id} r={r} />)}</ul>
              )}
            </Panel>
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer ce rendez-vous ?"
        description="Cette action est irréversible. Le rendez-vous sera définitivement supprimé."
        onConfirm={() => {
          if (pendingDeleteId) deleteRdv.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={deleteRdv.isPending}
      />
    </>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      Aucun rendez-vous.
    </div>
  );
}
