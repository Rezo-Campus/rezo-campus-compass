import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Loader2, Camera, User, Upload, FileText, Info, Save, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/profil")({
  component: EtudiantProfil,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_ID_DOC_BYTES = 5 * 1024 * 1024;

const ID_TYPES = [
  "Carte nationale d'identité",
  "Passeport",
  "Titre de séjour",
  "Carte de résident permanent",
  "Carte consulaire",
  "Autre",
];

const GENDERS = ["Masculin", "Féminin", "Autre"];

const COUNTRIES = [
  "Congo (Brazzaville)",
  "Maroc",
  "France",
  "République Démocratique du Congo",
  "Sénégal",
  "Côte d'Ivoire",
  "Cameroun",
  "Gabon",
  "Guinée",
  "Mali",
  "Burkina Faso",
  "Bénin",
  "Togo",
  "Niger",
  "Tunisie",
  "Algérie",
  "Belgique",
  "Canada",
  "Espagne",
  "Portugal",
  "Autres",
];

type ProfileData = {
  id: string;
  full_name: string | null;
  email: string | null;
  photo_url: string | null;
  last_name: string | null;
  first_name: string | null;
  other_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  birth_country: string | null;
  birth_city: string | null;
  nationality: string | null;
  id_type: string | null;
  id_number: string | null;
  id_expiry: string | null;
  id_issuing_country: string | null;
  has_handicap: boolean;
  address: string | null;
  postal_code: string | null;
  region: string | null;
  city: string | null;
  phone: string | null;
  phone_mobile: string | null;
  id_document_path: string | null;
};

type ProfileForm = Omit<ProfileData, "id" | "full_name" | "email" | "photo_url">;

function empty(): ProfileForm {
  return {
    last_name: "", first_name: "", other_name: "",
    gender: "", date_of_birth: "",
    birth_country: "", birth_city: "", nationality: "",
    id_type: "", id_number: "", id_expiry: "", id_issuing_country: "",
    has_handicap: false,
    address: "", postal_code: "", region: "", city: "",
    phone: "", phone_mobile: "", id_document_path: null,
  };
}

/* ══════════════════════════════════════════════════════════════ */

function EtudiantProfil() {
  const { data: auth, refetch: refetchAuth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();

  const photoRef = useRef<HTMLInputElement>(null);
  const idDocRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [form, setForm] = useState<ProfileForm>(empty());
  const [initialized, setInitialized] = useState(false);

  const { data: profile, isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["student-profile-v2", uid],
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("*").eq("id", uid).single();
      if (error) throw error;
      return data as ProfileData;
    },
  });

  if (profile && !initialized) {
    setForm({
      last_name: profile.last_name ?? "",
      first_name: profile.first_name ?? "",
      other_name: profile.other_name ?? "",
      gender: profile.gender ?? "",
      date_of_birth: profile.date_of_birth ?? "",
      birth_country: profile.birth_country ?? "",
      birth_city: profile.birth_city ?? "",
      nationality: profile.nationality ?? "",
      id_type: profile.id_type ?? "",
      id_number: profile.id_number ?? "",
      id_expiry: profile.id_expiry ?? "",
      id_issuing_country: profile.id_issuing_country ?? "",
      has_handicap: profile.has_handicap ?? false,
      address: profile.address ?? "",
      postal_code: profile.postal_code ?? "",
      region: profile.region ?? "",
      city: profile.city ?? "",
      phone: profile.phone ?? "",
      phone_mobile: profile.phone_mobile ?? "",
      id_document_path: profile.id_document_path ?? null,
    });
    setInitialized(true);
  }

  function set<K extends keyof ProfileForm>(key: K, val: ProfileForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("profiles").update({
        ...form,
        full_name: `${form.first_name} ${form.last_name}`.trim() || null,
      }).eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil enregistré");
      qc.invalidateQueries({ queryKey: ["student-profile-v2", uid] });
      qc.invalidateQueries({ queryKey: ["auth-session"] });
      refetchAuth();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function handlePhotoUpload(file: File) {
    if (!uid) return;
    if (file.size > MAX_PHOTO_BYTES) { toast.error("Photo trop lourde", { description: "Max. 2 Mo." }); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${uid}.${ext}`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      await db.from("profiles").update({ photo_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq("id", uid);
      toast.success("Photo mise à jour");
      qc.invalidateQueries({ queryKey: ["student-profile-v2", uid] });
      refetchAuth();
    } catch (e: unknown) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally { setUploading(false); }
  }

  async function handleIdDocUpload(file: File) {
    if (!uid) return;
    if (file.size > MAX_ID_DOC_BYTES) { toast.error("Fichier trop lourd", { description: "Max. 5 Mo." }); return; }
    setUploadingDoc(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${uid}/identity/id_card.${ext}`;
      const { error: upErr } = await supabase.storage.from("student-documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      await db.from("profiles").update({ id_document_path: path }).eq("id", uid);
      set("id_document_path", path);
      toast.success("Pièce d'identité téléversée");
      qc.invalidateQueries({ queryKey: ["student-profile-v2", uid] });
    } catch (e: unknown) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally { setUploadingDoc(false); }
  }

  async function viewIdDoc() {
    if (!form.id_document_path) return;
    const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(form.id_document_path, 120);
    if (error) { toast.error("Erreur d'accès"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  return (
    <>
      <PageHeader
        eyebrow="Mon profil"
        title="Informations personnelles"
        description="Complétez votre profil pour permettre à votre conseiller de mieux vous accompagner."
      />

      <div className="space-y-6">

        {/* ═══════════════════════════════════
            SECTION 1 — IDENTITÉ
        ═══════════════════════════════════ */}
        <Section title="Identité" subtitle="Informations d'état civil">
          {/* Alerte pièce d'identité manquante */}
          {!form.id_document_path && (
            <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>Vous devez joindre une photocopie de votre pièce d'identité (voir section ci-dessous).</span>
            </div>
          )}

          <div className="flex flex-col gap-8 p-6 md:flex-row">
            {/* ── Photo grande ── */}
            <div className="flex shrink-0 flex-col items-center gap-3 md:w-44">
              <div className="relative">
                {profile?.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt="Photo de profil"
                    className="size-40 rounded-2xl border-2 border-border object-cover shadow"
                  />
                ) : (
                  <div className="grid size-40 place-items-center rounded-2xl border-2 border-dashed border-border bg-muted text-muted-foreground">
                    <div className="text-center">
                      <User className="mx-auto mb-2 size-14 opacity-25" />
                      <p className="text-[10px]">Aucune photo</p>
                    </div>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40">
                    <Loader2 className="size-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => photoRef.current?.click()} disabled={uploading}>
                <Camera className="mr-1.5 size-3.5" />
                {profile?.photo_url ? "Changer" : "Ajouter la photo"}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">JPG, PNG · max. 2 Mo</p>
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }} />
            </div>

            {/* ── Grille identité ── */}
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <F label="Nom de famille *">
                <Input value={form.last_name ?? ""} onChange={e => set("last_name", e.target.value)}
                  placeholder="LOUBELO-PEMBA" className="uppercase placeholder:normal-case" />
              </F>
              <F label="Prénom(s) *">
                <Input value={form.first_name ?? ""} onChange={e => set("first_name", e.target.value)} placeholder="Vinette-De-Paul" />
              </F>
              <F label="Autre nom (patronyme)">
                <Input value={form.other_name ?? ""} onChange={e => set("other_name", e.target.value)} placeholder="Nom d'épouse, etc." />
              </F>
              <F label="Sexe">
                <Select value={form.gender ?? ""} onValueChange={v => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Date de naissance">
                <Input type="date" value={form.date_of_birth ?? ""} onChange={e => set("date_of_birth", e.target.value)} />
              </F>
              <F label="Type de pièce d'identité">
                <Select value={form.id_type ?? ""} onValueChange={v => set("id_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Pays de naissance">
                <Select value={form.birth_country ?? ""} onValueChange={v => set("birth_country", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Numéro de pièce d'identité">
                <Input value={form.id_number ?? ""} onChange={e => set("id_number", e.target.value)}
                  placeholder="D010310E" className="font-mono tracking-widest" />
              </F>
              <F label="Lieu de naissance">
                <Input value={form.birth_city ?? ""} onChange={e => set("birth_city", e.target.value)} placeholder="Pointe Noire" />
              </F>
              <F label="Pays de délivrance de la pièce">
                <Select value={form.id_issuing_country ?? ""} onValueChange={v => set("id_issuing_country", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Nationalité">
                <Select value={form.nationality ?? ""} onValueChange={v => set("nationality", v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Date limite de validité de la pièce">
                <Input type="date" value={form.id_expiry ?? ""} onChange={e => set("id_expiry", e.target.value)} />
              </F>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <input type="checkbox" id="handicap" checked={form.has_handicap ?? false}
                    onChange={e => set("has_handicap", e.target.checked)}
                    className="size-4 cursor-pointer accent-primary" />
                  <label htmlFor="handicap" className="cursor-pointer select-none text-sm">
                    Je suis en situation de handicap
                  </label>
                </div>
              </div>
            </div>
          </div>

          <SectionFooter onSave={() => save.mutate()} pending={save.isPending} />
        </Section>

        {/* ═══════════════════════════════════
            SECTION 2 — COORDONNÉES
        ═══════════════════════════════════ */}
        <Section title="Coordonnées" subtitle="Adresse postale et téléphones">
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <F label="Adresse" className="sm:col-span-2">
              <Input value={form.address ?? ""} onChange={e => set("address", e.target.value)} placeholder="444 Bd de la Grande Ceinture" />
            </F>
            <F label="Province / État / Région">
              <Input value={form.region ?? ""} onChange={e => set("region", e.target.value)} placeholder="Région de Casablanca" />
            </F>
            <F label="Ville">
              <Input value={form.city ?? ""} onChange={e => set("city", e.target.value)} placeholder="Casablanca" />
            </F>
            <F label="Code postal">
              <Input value={form.postal_code ?? ""} onChange={e => set("postal_code", e.target.value)} placeholder="20250" />
            </F>
            <F label="N° de téléphone fixe">
              <Input type="tel" value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} placeholder="+212 617725867" />
            </F>
            <F label="N° de téléphone portable" className="sm:col-span-2">
              <Input type="tel" value={form.phone_mobile ?? ""} onChange={e => set("phone_mobile", e.target.value)} placeholder="+242 06 000 0000" />
            </F>
          </div>
          <SectionFooter onSave={() => save.mutate()} pending={save.isPending} />
        </Section>

        {/* ═══════════════════════════════════
            SECTION 3 — PIÈCE D'IDENTITÉ
        ═══════════════════════════════════ */}
        <Section title="Pièce d'identité" subtitle="Photocopie recto-verso obligatoire">
          <div className="p-6">
            {form.id_document_path ? (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-green-50/60 p-5 dark:border-green-800 dark:bg-green-950/30">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400">
                  <FileText className="size-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">Document téléversé ✓</p>
                  <p className="text-xs text-green-600 dark:text-green-500">Votre pièce d'identité a été envoyée avec succès.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={viewIdDoc}>
                    <Eye className="mr-1.5 size-3.5" /> Consulter
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => idDocRef.current?.click()} disabled={uploadingDoc}>
                    {uploadingDoc ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
                    Remplacer
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border p-12 text-center transition hover:border-primary/40 hover:bg-muted/20"
                onClick={() => idDocRef.current?.click()}
              >
                <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Cliquer pour téléverser</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">PDF, JPG ou PNG · recto-verso · max. 5 Mo</p>
                </div>
                {uploadingDoc && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="size-4 animate-spin" /> Envoi en cours...
                  </div>
                )}
              </div>
            )}
            <input ref={idDocRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIdDocUpload(f); e.target.value = ""; }} />
          </div>
        </Section>

      </div>
    </>
  );
}

/* ── Composants utilitaires ── */

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function SectionFooter({ onSave, pending }: { onSave: () => void; pending: boolean }) {
  return (
    <div className="flex justify-end border-t border-border px-6 py-4">
      <Button onClick={onSave} disabled={pending}>
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
        Enregistrer
      </Button>
    </div>
  );
}

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
