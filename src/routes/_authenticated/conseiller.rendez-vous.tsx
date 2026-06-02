import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { RdvRow } from "./etudiant.rendez-vous";

export const Route = createFileRoute("/_authenticated/conseiller/rendez-vous")({
  component: RdvConseiller,
});

export function RdvConseiller() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const isAdmin = auth?.role === "admin";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: rdvs = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["rdv-conseiller", uid, isAdmin],
    queryFn: async () => {
      let q = supabase.from("appointments").select("*").order("scheduled_at", { ascending: false });
      if (!isAdmin) q = q.eq("advisor_id", uid!);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["my-students-simple", uid, isAdmin],
    queryFn: async () => {
      let q = supabase.from("student_files").select("student_id");
      if (!isAdmin) q = q.eq("advisor_id", uid!);
      const { data: files } = await q;
      const ids = (files ?? []).map((f) => f.student_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      return profs ?? [];
    },
  });

  const [form, setForm] = useState({
    student_id: "",
    scheduled_at: "",
    duration_min: 30,
    location: "",
    notes: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.student_id || !form.scheduled_at) throw new Error("Étudiant et date requis");
      const { error } = await supabase.from("appointments").insert({
        student_id: form.student_id,
        advisor_id: uid!,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_min: form.duration_min,
        location: form.location || null,
        notes: form.notes || null,
        created_by: uid!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rendez-vous créé");
      setOpen(false);
      setForm({ student_id: "", scheduled_at: "", duration_min: 30, location: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["rdv-conseiller"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const upcoming = rdvs.filter((r) => new Date(r.scheduled_at) >= new Date() && r.status === "programme");
  const past = rdvs.filter((r) => !upcoming.includes(r));

  return (
    <>
      <PageHeader
        eyebrow="Rendez-vous"
        title="Planification"
        description="Créez et suivez les rendez-vous avec vos étudiants."
      />

      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" /> Nouveau RDV</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Planifier un rendez-vous</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Étudiant</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm((f) => ({ ...f, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un étudiant" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>
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
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Créer le rendez-vous
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Panel title={`À venir (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3">{upcoming.map((r) => <RdvRow key={r.id} r={r} />)}</ul>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title={`Historique (${past.length})`}>
          {past.length === 0 ? <Empty /> : <ul className="space-y-3">{past.map((r) => <RdvRow key={r.id} r={r} />)}</ul>}
        </Panel>
      </div>
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
