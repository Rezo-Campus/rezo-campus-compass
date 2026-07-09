import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Loader2, MapPin, Video, Clock, Calendar, CheckCircle2,
  User, Mail, Phone, StickyNote, LogIn, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/entretien/$sessionId")({
  component: BookingPage,
});

type Session = {
  id: string;
  title: string;
  position: string;
  description: string | null;
  is_active: boolean;
};

type Slot = {
  id: string;
  starts_at: string;
  duration_min: number;
  mode: string;
  location: string | null;
  is_booked: boolean;
};

type BookingForm = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const DURATIONS: Record<number, string> = {
  15: "15 min", 20: "20 min", 30: "30 min", 45: "45 min",
  60: "1h", 90: "1h30", 120: "2h",
};

function slotLabel(slot: Slot) {
  const d = new Date(slot.starts_at);
  const day = d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return { day, time };
}

/* ══════════════════════════════════════════════════════════════ */

function BookingPage() {
  const { sessionId } = Route.useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  /* State */
  const [step, setStep] = useState<"slots" | "form" | "done">("slots");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState<BookingForm>({ name: "", email: "", phone: "", notes: "" });
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string } | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  /* Detect Google session on mount / after OAuth redirect */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        const name = meta?.full_name ?? meta?.name ?? "";
        const email = session.user.email ?? "";
        setGoogleUser({ name, email });
        setForm((f) => ({
          ...f,
          name: f.name || name,
          email: f.email || email,
        }));
      }
    });
  }, []);

  /* Queries */
  const { data: session, isLoading: loadingSession, error: sessionError } = useQuery({
    queryKey: ["booking-session", sessionId],
    queryFn: async () => {
      const { data, error } = await db
        .from("interview_sessions")
        .select("id, title, position, description, is_active")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data as Session;
    },
  });

  const { data: slots = [], isLoading: loadingSlots, refetch: refetchSlots } = useQuery({
    queryKey: ["booking-slots", sessionId],
    queryFn: async () => {
      const { data, error } = await db
        .from("interview_slots")
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_booked", false)
        .order("starts_at");
      if (error) throw error;
      return data as Slot[];
    },
  });

  /* Mutations */
  const book = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error("Aucun créneau sélectionné.");
      if (!form.name.trim()) throw new Error("Votre nom est obligatoire.");
      if (!form.email.trim()) throw new Error("Votre adresse e-mail est obligatoire.");

      /* 1. Insérer la réservation */
      const { error: bookErr } = await db.from("interview_bookings").insert({
        slot_id: selectedSlot.id,
        session_id: sessionId,
        applicant_name: form.name,
        applicant_email: form.email,
        applicant_phone: form.phone || null,
        google_uid: googleUser ? (await supabase.auth.getUser()).data.user?.id ?? null : null,
        notes: form.notes || null,
      });
      if (bookErr) throw bookErr;

      /* 2. Marquer le créneau comme réservé */
      const { error: slotErr } = await db
        .from("interview_slots")
        .update({ is_booked: true })
        .eq("id", selectedSlot.id);
      if (slotErr) throw slotErr;
    },
    onSuccess: () => {
      setStep("done");
      refetchSlots();
    },
    onError: (e: Error) => {
      if (e.message.includes("unique")) {
        alert("Vous avez déjà réservé un entretien pour cette session.");
      } else {
        alert("Erreur : " + e.message);
      }
    },
  });

  async function signInWithGoogle() {
    setSigningIn(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  }

  /* ── Chargement / erreurs ── */
  const isLoading = loadingSession || loadingSlots;

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (sessionError || !session) {
    return (
      <PageWrapper>
        <div className="rounded-xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          Session introuvable ou lien invalide.
        </div>
      </PageWrapper>
    );
  }

  if (!session.is_active) {
    return (
      <PageWrapper session={session}>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-10 text-center">
          <p className="font-semibold text-amber-800">Cette session d'entretien est fermée.</p>
          <p className="mt-1 text-sm text-amber-600">Les réservations ne sont plus acceptées.</p>
        </div>
      </PageWrapper>
    );
  }

  /* ══════════════════════════════════════════
     ÉTAPE CONFIRMATION
  ══════════════════════════════════════════ */
  if (step === "done" && selectedSlot) {
    const { day, time } = slotLabel(selectedSlot);
    return (
      <PageWrapper session={session}>
        <div className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 size-14 text-green-500" />
          <h2 className="text-xl font-bold text-green-800 mb-2">Entretien confirmé !</h2>
          <p className="text-green-700 font-medium mb-1">Bonjour {form.name},</p>
          <p className="text-green-700 text-sm mb-6">
            Votre entretien pour le poste de <strong>{session.position}</strong> est confirmé.
          </p>

          <div className="rounded-xl border border-green-200 bg-white p-5 text-left space-y-3">
            <Detail icon={<Calendar className="size-4 text-green-600" />} label="Date" value={day} />
            <Detail icon={<Clock className="size-4 text-green-600" />} label="Heure" value={`${time} · ${DURATIONS[selectedSlot.duration_min] ?? `${selectedSlot.duration_min} min`}`} />
            <Detail
              icon={selectedSlot.mode === "en_ligne" ? <Video className="size-4 text-blue-600" /> : <MapPin className="size-4 text-amber-600" />}
              label={selectedSlot.mode === "en_ligne" ? "Lien de connexion" : "Lieu"}
              value={selectedSlot.location ?? "—"}
              isLink={selectedSlot.mode === "en_ligne"}
            />
          </div>

          {selectedSlot.mode === "en_ligne" && (
            <p className="mt-4 text-xs text-green-600">
              Notez bien ce lien de connexion. Rejoignez la réunion quelques minutes avant l'heure prévue.
            </p>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Prenez note de ces informations. Un rappel vous sera éventuellement envoyé par e-mail.
          </p>
        </div>
      </PageWrapper>
    );
  }

  /* ══════════════════════════════════════════
     ÉTAPE FORMULAIRE
  ══════════════════════════════════════════ */
  if (step === "form" && selectedSlot) {
    const { day, time } = slotLabel(selectedSlot);
    return (
      <PageWrapper session={session}>
        {/* Créneau sélectionné */}
        <div className="mx-auto max-w-lg">
          <button
            onClick={() => { setStep("slots"); setSelectedSlot(null); }}
            className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ChevronLeft className="size-4" /> Changer de créneau
          </button>

          <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${selectedSlot.mode === "en_ligne" ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}`}>
            <div className={`grid size-10 shrink-0 place-items-center rounded-full ${selectedSlot.mode === "en_ligne" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
              {selectedSlot.mode === "en_ligne" ? <Video className="size-5" /> : <MapPin className="size-5" />}
            </div>
            <div>
              <div className="font-semibold text-sm capitalize">{day}</div>
              <div className="text-sm">
                {time} · {DURATIONS[selectedSlot.duration_min] ?? `${selectedSlot.duration_min} min`} ·{" "}
                {selectedSlot.mode === "en_ligne" ? "En ligne" : "Présentiel"}
              </div>
            </div>
          </div>

          {/* Google sign-in */}
          {!googleUser && (
            <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Connectez-vous avec Google pour pré-remplir vos informations
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={signInWithGoogle}
                disabled={signingIn}
              >
                {signingIn ? <Loader2 className="size-4 animate-spin" /> : (
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continuer avec Google
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                ou remplissez le formulaire manuellement ci-dessous
              </p>
            </div>
          )}

          {googleUser && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              Connecté en tant que <strong>{googleUser.name}</strong>
            </div>
          )}

          {/* Formulaire */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><User className="size-3.5" /> Nom complet *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Prénom et Nom"
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Mail className="size-3.5" /> Adresse e-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="vous@exemple.com"
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><Phone className="size-3.5" /> Téléphone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+242 06 ..."
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><StickyNote className="size-3.5" /> Note ou message (facultatif)</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Toute information utile pour le RH..."
              />
            </div>
          </div>

          <Button
            className="mt-6 w-full"
            size="lg"
            disabled={!form.name || !form.email || book.isPending}
            onClick={() => book.mutate()}
          >
            {book.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
            Confirmer ma réservation
          </Button>
        </div>
      </PageWrapper>
    );
  }

  /* ══════════════════════════════════════════
     ÉTAPE CRÉNEAUX
  ══════════════════════════════════════════ */

  /* Grouper par jour */
  const slotsByDay = slots.reduce<Record<string, Slot[]>>((acc, sl) => {
    const key = new Date(sl.starts_at).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(sl);
    return acc;
  }, {});

  return (
    <PageWrapper session={session}>
      <div className="mx-auto max-w-2xl">
        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
            <Calendar className="mx-auto mb-4 size-10 text-muted-foreground/30" />
            Aucun créneau disponible pour le moment. Revenez plus tard.
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-muted-foreground text-center">
              Choisissez un créneau disponible pour votre entretien
            </p>
            <div className="space-y-6">
              {Object.entries(slotsByDay).map(([day, daySlots]) => (
                <div key={day}>
                  <div className="mb-2 flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold capitalize">{day}</h3>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {daySlots.map((sl) => (
                      <button
                        key={sl.id}
                        onClick={() => { setSelectedSlot(sl); setStep("form"); }}
                        className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
                      >
                        <div className={`grid size-10 shrink-0 place-items-center rounded-full transition ${sl.mode === "en_ligne" ? "bg-blue-100 text-blue-600 group-hover:bg-blue-200" : "bg-amber-100 text-amber-600 group-hover:bg-amber-200"}`}>
                          {sl.mode === "en_ligne" ? <Video className="size-5" /> : <MapPin className="size-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold">
                            {new Date(sl.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {DURATIONS[sl.duration_min] ?? `${sl.duration_min} min`}
                            {" · "}
                            {sl.mode === "en_ligne" ? "En ligne" : "Présentiel"}
                          </div>
                        </div>
                        <ChevronLeft className="size-4 rotate-180 text-muted-foreground opacity-40 transition group-hover:opacity-80" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}

/* ── Composants utilitaires ── */

function PageWrapper({ children, session }: { children: React.ReactNode; session?: Session }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Rézo Campus */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <img src="/1.png" alt="Rézo Campus" className="h-10 object-contain" />
          {session && (
            <div className="flex-1 min-w-0 border-l border-border pl-4">
              <div className="text-sm font-semibold truncate">{session.title}</div>
              <div className="text-xs text-muted-foreground truncate">Poste : {session.position}</div>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {session?.description && (
          <div className="mb-6 rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
            {session.description}
          </div>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Rézo Campus · campusrezo@gmail.com · Brazzaville, République du Congo
      </footer>
    </div>
  );
}

function Detail({ icon, label, value, isLink }: { icon: React.ReactNode; label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 underline break-all">
            {value}
          </a>
        ) : (
          <div className="text-sm font-medium capitalize">{value}</div>
        )}
      </div>
    </div>
  );
}
