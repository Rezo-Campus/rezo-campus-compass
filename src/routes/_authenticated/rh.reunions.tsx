import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Pencil, Trash2, MapPin, Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MonthCalendar } from "@/components/MonthCalendar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/rh/reunions")({
  component: MeetingsCalendar,
});

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

const STATUS_LABELS: Record<string, string> = {
  programmee: "Programmée",
  terminee: "Terminée",
  annulee: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  programmee: "bg-blue-100 text-blue-700",
  terminee: "bg-green-100 text-green-700",
  annulee: "bg-red-100 text-red-700",
};

const emptyForm = { title: "", scheduled_at: "", duration_min: 60, location: "", agenda: "", notes: "" };

export function MeetingsCalendar() {
  const { data: auth } = useAuth();
  const canManage = auth?.role === "admin" || auth?.role === "rh";
  const qc = useQueryClient();

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  function resetAndClose() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openNew(day?: Date) {
    setEditingId(null);
    const base = day ?? new Date();
    base.setHours(9, 0, 0, 0);
    const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({ ...emptyForm, scheduled_at: local });
    setFormOpen(true);
  }

  function openEdit(m: Meeting) {
    const dt = new Date(m.scheduled_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      title: m.title,
      scheduled_at: local,
      duration_min: m.duration_min,
      location: m.location ?? "",
      agenda: m.agenda ?? "",
      notes: m.notes ?? "",
    });
    setEditingId(m.id);
    setDetailMeeting(null);
    setFormOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.scheduled_at) throw new Error("Titre et date requis");
      const payload = {
        title: form.title.trim(),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_min: form.duration_min,
        location: form.location || null,
        agenda: form.agenda || null,
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from("meetings").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("meetings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Réunion modifiée" : "Réunion planifiée");
      resetAndClose();
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Réunion supprimée");
      setDetailMeeting(null);
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Réunions"
        title="Calendrier des réunions"
        description={
          canManage
            ? "Planifiez les réunions et leur ordre du jour, visibles par tous les départements."
            : "Consultez les réunions planifiées. Cliquez sur une réunion pour voir l'ordre du jour."
        }
      />

      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => openNew()}>
            <Plus className="mr-2 size-4" /> Nouvelle réunion
          </Button>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-primary" />
      ) : (
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          events={meetings}
          onDayClick={canManage ? (day) => openNew(day) : undefined}
          renderEvent={(m) => (
            <button
              key={m.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setDetailMeeting(m); }}
              className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium transition hover:opacity-80 ${STATUS_COLORS[m.status] ?? "bg-muted"}`}
              title={`${m.title}${m.location ? " · " + m.location : ""}`}
            >
              {m.title}
            </button>
          )}
        />
      )}

      {/* Liste à venir (lecture rapide, complément du calendrier) */}
      <div className="mt-6">
        <Panel title="Prochaines réunions">
          {meetings.filter((m) => new Date(m.scheduled_at) >= new Date() && m.status === "programmee").length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune réunion à venir.</p>
          ) : (
            <ul className="space-y-2">
              {meetings
                .filter((m) => new Date(m.scheduled_at) >= new Date() && m.status === "programmee")
                .slice(0, 6)
                .map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setDetailMeeting(m)}
                      className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-left transition hover:bg-muted/30"
                    >
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <CalendarDays className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{m.title}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(m.scheduled_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                          {m.location && (
                            <span className="flex items-center gap-1"><MapPin className="size-3" /> {m.location}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Dialog formulaire */}
      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la réunion" : "Planifier une réunion"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre de la réunion *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex. Réunion budgétaire trimestrielle"
                required
              />
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
                  type="number" min={10} max={480}
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
                placeholder="Salle de réunion, Google Meet, ..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ordre du jour</Label>
              <Textarea
                rows={4}
                value={form.agenda}
                onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
                placeholder={"1. Point 1\n2. Point 2\n3. Point 3..."}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes complémentaires</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Enregistrer les modifications" : "Planifier la réunion"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog détail */}
      <Dialog open={detailMeeting !== null} onOpenChange={(v) => { if (!v) setDetailMeeting(null); }}>
        <DialogContent>
          {detailMeeting && (
            <>
              <DialogHeader>
                <DialogTitle>{detailMeeting.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[detailMeeting.status] ?? "bg-muted"}`}>
                    {STATUS_LABELS[detailMeeting.status] ?? detailMeeting.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {new Date(detailMeeting.scheduled_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                    {" · "}{detailMeeting.duration_min} min
                  </span>
                  {detailMeeting.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {detailMeeting.location}
                    </span>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ordre du jour</p>
                  {detailMeeting.agenda ? (
                    <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm">
                      {detailMeeting.agenda}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun ordre du jour renseigné.</p>
                  )}
                </div>

                {detailMeeting.notes && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{detailMeeting.notes}</p>
                  </div>
                )}

                {canManage && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => openEdit(detailMeeting)}>
                      <Pencil className="mr-1.5 size-3.5" /> Modifier
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId(detailMeeting.id)}
                    >
                      <Trash2 className="mr-1.5 size-3.5" /> Supprimer
                    </Button>
                  </DialogFooter>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer cette réunion ?"
        description="Cette action est irréversible. La réunion sera définitivement supprimée."
        onConfirm={() => {
          if (pendingDeleteId) deleteMeeting.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={deleteMeeting.isPending}
      />
    </>
  );
}
