import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Plus, Copy, Check, ChevronDown, ChevronRight,
  MapPin, Video, Users, Link2, Trash2, CalendarDays,
  Clock, ToggleLeft, Pencil, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/rh/entretiens")({
  component: RhEntretiens,
});

/* ── Types ── */
type InterviewSession = {
  id: string;
  title: string;
  position: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type InterviewSlot = {
  id: string;
  session_id: string;
  starts_at: string;
  duration_min: number;
  mode: string;
  location: string | null;
  is_booked: boolean;
};

type InterviewBooking = {
  id: string;
  slot_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  notes: string | null;
  created_at: string;
};

const DURATIONS = [
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 heure" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2 heures" },
];

const EMPTY_SESSION = { title: "", position: "", description: "" };
const EMPTY_SLOT = { date: "", time: "", duration_min: "30", mode: "presentiel", location: "" };

function fmt(dt: string) {
  return new Date(dt).toLocaleString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtShort(dt: string) {
  return new Date(dt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ══════════════════════════════════════════════════════════════ */

function RhEntretiens() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "creneaux" | "candidats">>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* Dialogs */
  const [sessionDialog, setSessionDialog] = useState(false);
  const [slotDialog, setSlotDialog] = useState<string | null>(null); // sessionId
  const [pendingDeleteSlot, setPendingDeleteSlot] = useState<string | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<string | null>(null);

  /* Forms */
  const [sessionForm, setSessionForm] = useState({ ...EMPTY_SESSION });
  const [slotForm, setSlotForm] = useState({ ...EMPTY_SLOT });

  /* ── Queries ── */
  const { data: sessions = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["rh-sessions", uid],
    queryFn: async () => {
      const { data, error } = await db
        .from("interview_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as InterviewSession[];
    },
  });

  const { data: expandedData } = useQuery({
    enabled: !!expandedId,
    queryKey: ["rh-session-detail", expandedId],
    queryFn: async () => {
      const [slotsRes, bookingsRes] = await Promise.all([
        db.from("interview_slots").select("*").eq("session_id", expandedId!).order("starts_at"),
        db.from("interview_bookings").select("*").eq("session_id", expandedId!).order("created_at", { ascending: false }),
      ]);
      return {
        slots: (slotsRes.data ?? []) as InterviewSlot[],
        bookings: (bookingsRes.data ?? []) as InterviewBooking[],
      };
    },
  });

  /* ── Mutations ── */
  const createSession = useMutation({
    mutationFn: async () => {
      if (!sessionForm.title || !sessionForm.position) throw new Error("Titre et poste obligatoires.");
      const { error } = await db.from("interview_sessions").insert({
        title: sessionForm.title,
        position: sessionForm.position,
        description: sessionForm.description || null,
        created_by: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session créée");
      qc.invalidateQueries({ queryKey: ["rh-sessions"] });
      setSessionDialog(false);
      setSessionForm({ ...EMPTY_SESSION });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await db.from("interview_sessions").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh-sessions"] }),
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("interview_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session supprimée");
      qc.invalidateQueries({ queryKey: ["rh-sessions"] });
      if (expandedId === pendingDeleteSession) setExpandedId(null);
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const createSlot = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!slotForm.date || !slotForm.time) throw new Error("Date et heure obligatoires.");
      if (!slotForm.location) throw new Error(slotForm.mode === "en_ligne" ? "Le lien de réunion est obligatoire." : "L'adresse est obligatoire.");
      const startsAt = new Date(`${slotForm.date}T${slotForm.time}:00`).toISOString();
      const { error } = await db.from("interview_slots").insert({
        session_id: sessionId,
        starts_at: startsAt,
        duration_min: Number(slotForm.duration_min),
        mode: slotForm.mode,
        location: slotForm.location,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Créneau ajouté");
      qc.invalidateQueries({ queryKey: ["rh-session-detail", expandedId] });
      setSlotDialog(null);
      setSlotForm({ ...EMPTY_SLOT });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("interview_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Créneau supprimé");
      qc.invalidateQueries({ queryKey: ["rh-session-detail", expandedId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  /* ── Helpers ── */
  function bookingUrl(sessionId: string) {
    return `${window.location.origin}/entretien/${sessionId}`;
  }

  async function copyLink(sessionId: string) {
    await navigator.clipboard.writeText(bookingUrl(sessionId));
    setCopiedId(sessionId);
    toast.success("Lien copié !");
    setTimeout(() => setCopiedId(null), 2000);
  }

  function tabOf(sessionId: string): "creneaux" | "candidats" {
    return activeTab[sessionId] ?? "creneaux";
  }

  /* ══════════════════════════════════════════════════════════════
     RENDU
  ══════════════════════════════════════════════════════════════ */

  return (
    <>
      <PageHeader
        eyebrow="Ressources Humaines"
        title="Entretiens de recrutement"
        description="Créez des sessions, définissez vos créneaux et envoyez le lien aux candidats."
      />

      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setSessionForm({ ...EMPTY_SESSION }); setSessionDialog(true); }}>
          <Plus className="mr-2 size-4" /> Nouvelle session
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          <CalendarDays className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          Aucune session d'entretien. Créez-en une pour générer un lien de réservation.
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const isExpanded = expandedId === s.id;
            const tab = tabOf(s.id);
            const slots = expandedData?.slots ?? [];
            const bookings = expandedData?.bookings ?? [];

            return (
              <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">

                {/* ── En-tête session ── */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : s.id);
                    }}
                  >
                    <div className={`grid size-10 shrink-0 place-items-center rounded-full ${s.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Users className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{s.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                          {s.is_active ? "Active" : "Fermée"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">Poste : {s.position}</div>
                      <div className="text-xs text-muted-foreground">Créée le {fmtShort(s.created_at)}</div>
                    </div>
                    {isExpanded ? <ChevronDown className="size-5 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-5 shrink-0 text-muted-foreground" />}
                  </button>

                  {/* Actions rapides */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyLink(s.id)}>
                      {copiedId === s.id ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                      <span className="hidden sm:inline">Lien</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => toggleActive.mutate({ id: s.id, active: !s.is_active })}
                      title={s.is_active ? "Fermer la session" : "Rouvrir la session"}
                    >
                      <ToggleLeft className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteSession(s.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* ── Lien partageable ── */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                      <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-xs text-muted-foreground font-mono">
                        {bookingUrl(s.id)}
                      </span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => copyLink(s.id)}>
                        {copiedId === s.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                      </Button>
                      <a href={bookingUrl(s.id)} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          <ExternalLink className="size-3" />
                        </Button>
                      </a>
                    </div>
                    {s.description && (
                      <p className="mt-2 text-xs text-muted-foreground italic">{s.description}</p>
                    )}
                  </div>
                )}

                {/* ── Onglets ── */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Tabs header */}
                    <div className="flex border-b border-border">
                      <button
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition ${tab === "creneaux" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setActiveTab((t) => ({ ...t, [s.id]: "creneaux" }))}
                      >
                        <Clock className="size-3.5" /> Créneaux
                        {isExpanded && expandedId === s.id && (
                          <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">
                            {slots.filter((sl) => !sl.is_booked).length}/{slots.length}
                          </span>
                        )}
                      </button>
                      <button
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition ${tab === "candidats" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setActiveTab((t) => ({ ...t, [s.id]: "candidats" }))}
                      >
                        <Users className="size-3.5" /> Candidats
                        {bookings.length > 0 && (
                          <span className="ml-1 rounded-full bg-primary/10 text-primary px-1.5 text-[10px] font-semibold">
                            {bookings.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* ── Tab Créneaux ── */}
                    {tab === "creneaux" && (
                      <div className="p-4">
                        <div className="mb-3 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => { setSlotForm({ ...EMPTY_SLOT }); setSlotDialog(s.id); }}
                          >
                            <Plus className="mr-1.5 size-3.5" /> Ajouter un créneau
                          </Button>
                        </div>
                        {slots.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                            Aucun créneau. Ajoutez vos disponibilités pour générer des réservations.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border bg-muted/40">
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Heure</th>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Durée</th>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Mode</th>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Lieu / Lien</th>
                                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Statut</th>
                                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {slots.map((sl) => (
                                  <tr
                                    key={sl.id}
                                    className={`transition-colors ${sl.is_booked ? "bg-green-50/40" : "hover:bg-muted/20"}`}
                                  >
                                    <td className="px-4 py-3 text-sm font-semibold capitalize whitespace-nowrap">
                                      {new Date(sl.starts_at).toLocaleDateString("fr-FR", {
                                        weekday: "short", day: "2-digit", month: "short", year: "numeric",
                                      })}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">
                                      {new Date(sl.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                                      {DURATIONS.find((d) => d.value === String(sl.duration_min))?.label ?? `${sl.duration_min} min`}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${sl.mode === "en_ligne" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                        {sl.mode === "en_ligne" ? <Video className="size-3" /> : <MapPin className="size-3" />}
                                        {sl.mode === "en_ligne" ? "En ligne" : "Présentiel"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 max-w-[200px]">
                                      {sl.mode === "en_ligne" && sl.location ? (
                                        <a
                                          href={sl.location}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800 truncate block max-w-[180px]"
                                          title={sl.location}
                                        >
                                          {sl.location}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-muted-foreground truncate block max-w-[180px]" title={sl.location ?? ""}>
                                          {sl.location ?? "—"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {sl.is_booked ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 whitespace-nowrap">
                                          ✓ Réservé
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
                                          Disponible
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      {!sl.is_booked && (
                                        <button
                                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                                          title="Supprimer ce créneau"
                                          onClick={() => setPendingDeleteSlot(sl.id)}
                                        >
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Tab Candidats ── */}
                    {tab === "candidats" && (
                      <div className="p-4">
                        {bookings.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                            Aucune réservation reçue pour le moment.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {bookings.map((b) => {
                              const slot = slots.find((sl) => sl.id === b.slot_id);
                              return (
                                <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                                    <Users className="size-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm">{b.applicant_name}</div>
                                    <div className="text-xs text-muted-foreground">{b.applicant_email}</div>
                                    {b.applicant_phone && (
                                      <div className="text-xs text-muted-foreground">{b.applicant_phone}</div>
                                    )}
                                  </div>
                                  {slot && (
                                    <div className="text-right shrink-0">
                                      <div className="text-xs font-semibold text-primary">
                                        {new Date(slot.starts_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(slot.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                        {" · "}
                                        {slot.mode === "en_ligne" ? "En ligne" : "Présentiel"}
                                      </div>
                                    </div>
                                  )}
                                  {b.notes && (
                                    <div className="w-full rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground italic">
                                      Note : {b.notes}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ Dialog : Nouvelle session ══ */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle session d'entretien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Titre de la session *</Label>
              <Input
                value={sessionForm.title}
                onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="ex. Recrutement Assistant Admin & Finance"
              />
            </div>
            <div className="grid gap-2">
              <Label>Poste proposé *</Label>
              <Input
                value={sessionForm.position}
                onChange={(e) => setSessionForm((f) => ({ ...f, position: e.target.value }))}
                placeholder="ex. Assistant(e) en Administration et Finance"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description / instructions pour le candidat</Label>
              <Textarea
                rows={3}
                value={sessionForm.description}
                onChange={(e) => setSessionForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Merci de venir avec votre CV et vos diplômes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialog(false)}>Annuler</Button>
            <Button
              disabled={!sessionForm.title || !sessionForm.position || createSession.isPending}
              onClick={() => createSession.mutate()}
            >
              {createSession.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Créer la session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Dialog : Ajouter un créneau ══ */}
      <Dialog open={!!slotDialog} onOpenChange={(o) => { if (!o) setSlotDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un créneau</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={slotForm.date}
                  onChange={(e) => setSlotForm((f) => ({ ...f, date: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="grid gap-2">
                <Label>Heure *</Label>
                <Input
                  type="time"
                  value={slotForm.time}
                  onChange={(e) => setSlotForm((f) => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Durée</Label>
              <Select value={slotForm.duration_min} onValueChange={(v) => setSlotForm((f) => ({ ...f, duration_min: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Mode</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition ${slotForm.mode === "presentiel" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setSlotForm((f) => ({ ...f, mode: "presentiel", location: "" }))}
                >
                  <MapPin className="size-3.5" /> Présentiel
                </button>
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition ${slotForm.mode === "en_ligne" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setSlotForm((f) => ({ ...f, mode: "en_ligne", location: "" }))}
                >
                  <Video className="size-3.5" /> En ligne
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{slotForm.mode === "en_ligne" ? "Lien de réunion (Zoom, Meet, Teams…) *" : "Adresse *"}</Label>
              <Input
                value={slotForm.location}
                onChange={(e) => setSlotForm((f) => ({ ...f, location: e.target.value }))}
                placeholder={slotForm.mode === "en_ligne" ? "https://meet.google.com/..." : "Avenue de l'OUA, Brazzaville"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotDialog(null)}>Annuler</Button>
            <Button
              disabled={!slotForm.date || !slotForm.time || !slotForm.location || createSlot.isPending}
              onClick={() => slotDialog && createSlot.mutate(slotDialog)}
            >
              {createSlot.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Ajouter le créneau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Confirm dialogs ══ */}
      <ConfirmDialog
        open={!!pendingDeleteSlot}
        onOpenChange={(o) => { if (!o) setPendingDeleteSlot(null); }}
        title="Supprimer ce créneau ?"
        description="Il sera définitivement supprimé."
        onConfirm={() => { if (pendingDeleteSlot) deleteSlot.mutate(pendingDeleteSlot); setPendingDeleteSlot(null); }}
        loading={deleteSlot.isPending}
      />
      <ConfirmDialog
        open={!!pendingDeleteSession}
        onOpenChange={(o) => { if (!o) setPendingDeleteSession(null); }}
        title="Supprimer cette session ?"
        description="Tous les créneaux et réservations seront supprimés définitivement."
        onConfirm={() => { if (pendingDeleteSession) deleteSession.mutate(pendingDeleteSession); setPendingDeleteSession(null); }}
        loading={deleteSession.isPending}
      />
    </>
  );
}
