import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Plus, CalendarDays, Users, MapPin, Clock, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
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
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aadf/reunions")({
  component: AadfReunions,
});

const db = supabase as any;

const DEPT_OPTIONS = [
  { value: "commercial",   label: "Marketing & Commerce" },
  { value: "rh",           label: "RH" },
  { value: "projets",      label: "Management de Projet" },
  { value: "comptabilite", label: "Finance" },
  { value: "secretaire",   label: "Secrétariat" },
  { value: "aadf",         label: "AADF" },
  { value: "admin",        label: "Administration" },
];

function AadfReunions() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    departments: "aadf",
  });

  const { data: reunions = [], isLoading } = useQuery({
    queryKey: ["aadf-reunions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("agenda_events")
        .select("*")
        .eq("type", "meeting")
        .eq("department", "aadf")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createReunion = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Non authentifié");
      const { error } = await db.from("agenda_events").insert({
        department: "aadf",
        created_by: uid,
        title: form.title,
        description: form.description || null,
        type: "meeting",
        priority: "normal",
        status: "planifie",
        start_date: form.date,
        location: form.location || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Réunion planifiée");
      qc.invalidateQueries({ queryKey: ["aadf-reunions"] });
      setShowNew(false);
      setForm({ title: "", description: "", date: "", time: "", location: "", departments: "aadf" });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteReunion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("agenda_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Réunion supprimée");
      qc.invalidateQueries({ queryKey: ["aadf-reunions"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="AADF"
        title="Réunions"
        description="Planifiez et suivez les réunions inter-départements."
      />
      <Panel
        title="Réunions planifiées"
        action={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="mr-2 size-4" /> Planifier
          </Button>
        }
      >
        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : reunions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucune réunion planifiée.
          </div>
        ) : (
          <ul className="space-y-2">
            {reunions.map((r: any) => (
              <li key={r.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-[10px] font-semibold uppercase">
                    {new Date(r.start_date + "T12:00:00").toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {new Date(r.start_date + "T12:00:00").getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{r.title}</div>
                  {r.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {r.location && (
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {r.location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(r.start_date + "T12:00:00").toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteReunion.mutate(r.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={showNew} onOpenChange={(o) => { if (!o) setShowNew(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle réunion</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Heure</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Lieu</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Salle, lien visio..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button disabled={!form.title.trim() || !form.date || createReunion.isPending} onClick={() => createReunion.mutate()}>
              {createReunion.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Planifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
