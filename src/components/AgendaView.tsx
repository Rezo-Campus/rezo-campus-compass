import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus, Loader2, CalendarDays, Edit2, Trash2, Flag, Bell,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const EVENT_TYPES = [
  { value: "task",     label: "Tâche" },
  { value: "meeting",  label: "Réunion" },
  { value: "deadline", label: "Échéance" },
  { value: "reminder", label: "Rappel" },
];

const PRIORITIES = [
  { value: "low",    label: "Basse",   color: "bg-slate-100 text-slate-600" },
  { value: "normal", label: "Normale", color: "bg-blue-100 text-blue-700" },
  { value: "high",   label: "Haute",   color: "bg-amber-100 text-amber-700" },
  { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-700" },
];

const STATUSES = [
  { value: "planifie",  label: "Planifié",  icon: Clock,        color: "text-blue-600" },
  { value: "en_cours",  label: "En cours",  icon: CalendarDays, color: "text-amber-600" },
  { value: "termine",   label: "Terminé",   icon: CheckCircle2, color: "text-green-600" },
  { value: "annule",    label: "Annulé",    icon: XCircle,      color: "text-red-500" },
];

type AgendaEvent = {
  id: string;
  department: string;
  title: string;
  description: string | null;
  type: string;
  start_date: string;
  end_date: string | null;
  priority: string;
  status: string;
  created_by: string;
  creator_name?: string;
};

type EventForm = {
  title: string;
  description: string;
  type: string;
  start_date: string;
  end_date: string;
  priority: string;
};

function emptyForm(): EventForm {
  const today = new Date().toISOString().split("T")[0];
  return { title: "", description: "", type: "task", start_date: today, end_date: "", priority: "normal" };
}

export function AgendaView({ department, canEdit = true, title = "Agenda" }: {
  department: string;
  canEdit?: boolean;
  title?: string;
}) {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["agenda", department],
    queryFn: async () => {
      let q = db
        .from("agenda_events")
        .select("*, profiles(full_name)")
        .order("start_date", { ascending: true });
      if (department !== "all") q = q.eq("department", department);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        ...e,
        creator_name: e.profiles?.full_name ?? "—",
      }));
    },
  });

  const saveEvent = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Non authentifié");
      if (editingId) {
        const { error } = await db.from("agenda_events").update({
          ...form,
          end_date: form.end_date || null,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from("agenda_events").insert({
          ...form,
          department,
          created_by: uid,
          status: "planifie",
          end_date: form.end_date || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Événement mis à jour" : "Événement ajouté");
      qc.invalidateQueries({ queryKey: ["agenda", department] });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("agenda_events").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agenda", department] }),
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("agenda_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Événement supprimé");
      qc.invalidateQueries({ queryKey: ["agenda", department] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  function openEdit(ev: AgendaEvent) {
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      type: ev.type,
      start_date: ev.start_date,
      end_date: ev.end_date ?? "",
      priority: ev.priority,
    });
    setEditingId(ev.id);
    setShowForm(true);
  }

  const displayed = filterStatus === "all"
    ? events
    : events.filter((e: AgendaEvent) => e.status === filterStatus);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = events.filter((e: AgendaEvent) => e.start_date >= today && e.status === "planifie").length;
  const overdue = events.filter((e: AgendaEvent) => e.start_date < today && e.status === "planifie").length;

  return (
    <div>
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: events.length, color: "text-foreground" },
          { label: "À venir", value: upcoming, color: "text-blue-600" },
          { label: "En retard", value: overdue, color: "text-red-600" },
          { label: "Terminés", value: events.filter((e: AgendaEvent) => e.status === "termine").length, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canEdit && (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }}
          >
            <Plus className="mr-2 size-4" /> Ajouter un événement
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <CalendarDays className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun événement dans l'agenda.</p>
          {canEdit && (
            <Button size="sm" className="mt-4" onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }}>
              <Plus className="mr-2 size-4" /> Créer le premier événement
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((ev: AgendaEvent) => {
            const prio = PRIORITIES.find((p) => p.value === ev.priority);
            const stat = STATUSES.find((s) => s.value === ev.status);
            const StatIcon = stat?.icon ?? Clock;
            const isLate = ev.start_date < today && ev.status === "planifie";

            return (
              <div
                key={ev.id}
                className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                  isLate ? "border-red-200 bg-red-50/40" : "border-border bg-card"
                }`}
              >
                {/* Date badge */}
                <div className="flex shrink-0 flex-col items-center rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-center min-w-[52px]">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {new Date(ev.start_date + "T12:00:00").toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                  <span className="text-xl font-bold leading-tight text-foreground">
                    {new Date(ev.start_date + "T12:00:00").getDate()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{ev.title}</span>
                    {isLate && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">En retard</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${prio?.color ?? "bg-muted text-muted-foreground"}`}>
                      <Flag className="inline size-2.5 mr-0.5" />{prio?.label ?? ev.priority}
                    </span>
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {EVENT_TYPES.find((t) => t.value === ev.type)?.label ?? ev.type}
                    </span>
                  </div>
                  {ev.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <StatIcon className={`size-3 ${stat?.color ?? ""}`} />
                    <span>{stat?.label ?? ev.status}</span>
                    {ev.end_date && ev.end_date !== ev.start_date && (
                      <span className="ml-2">→ {new Date(ev.end_date + "T12:00:00").toLocaleDateString("fr-FR")}</span>
                    )}
                    <span className="ml-2">· Par {ev.creator_name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Select
                    value={ev.status}
                    onValueChange={(v) => updateStatus.mutate({ id: ev.id, status: v })}
                  >
                    <SelectTrigger className="h-7 text-[10px] w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(ev)}>
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(ev.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Titre de l'événement" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priorité</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date de début *</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date de fin</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Détails, participants, lieu..." className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annuler</Button>
            <Button
              disabled={!form.title.trim() || !form.start_date || saveEvent.isPending}
              onClick={() => saveEvent.mutate()}
            >
              {saveEvent.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Supprimer cet événement ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={() => { if (deleteId) deleteEvent.mutate(deleteId); }}
        loading={deleteEvent.isPending}
      />

      {/* Reminder banner */}
      {overdue > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Bell className="size-4 shrink-0 text-amber-600" />
          <span><strong>{overdue}</strong> événement{overdue > 1 ? "s" : ""} planifié{overdue > 1 ? "s" : ""} en retard — pensez à mettre à jour les statuts.</span>
        </div>
      )}
    </div>
  );
}
