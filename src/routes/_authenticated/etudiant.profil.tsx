import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Loader2, Camera, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/profil")({
  component: EtudiantProfil,
});

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB

function EtudiantProfil() {
  const { data: auth, refetch: refetchAuth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["student-profile", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, photo_url")
        .eq("id", uid!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
    setInitialized(true);
  }

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name || null, phone: form.phone || null })
        .eq("id", uid!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      qc.invalidateQueries({ queryKey: ["student-profile", uid] });
      qc.invalidateQueries({ queryKey: ["auth-session"] });
      refetchAuth();
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function handlePhotoUpload(file: File) {
    if (!uid) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo trop lourde", { description: "La photo ne doit pas dépasser 2 Mo." });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${uid}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ photo_url: photoUrl })
        .eq("id", uid);
      if (dbErr) throw dbErr;

      toast.success("Photo mise à jour");
      qc.invalidateQueries({ queryKey: ["student-profile", uid] });
      qc.invalidateQueries({ queryKey: ["auth-session"] });
      refetchAuth();
    } catch (e: unknown) {
      toast.error("Erreur lors de l'upload", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Mon profil"
        title="Informations personnelles"
        description="Complétez votre profil pour permettre à votre conseiller de mieux vous accompagner."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Photo section */}
        <Panel title="Photo de profil">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt="Photo de profil"
                  className="size-28 rounded-full object-cover border-4 border-border"
                />
              ) : (
                <div className="grid size-28 place-items-center rounded-full bg-primary/10 text-primary border-4 border-border">
                  <User className="size-12" />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
                  <Loader2 className="size-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="mr-2 size-4" />
              {profile?.photo_url ? "Changer la photo" : "Ajouter une photo"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              JPG, PNG ou WEBP · max. 2 Mo
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoUpload(f);
                e.target.value = "";
              }}
            />
          </div>
        </Panel>

        {/* Info form */}
        <div className="lg:col-span-2">
          <Panel title="Coordonnées">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Adresse e-mail</Label>
                <Input value={profile?.email ?? ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">L'adresse e-mail ne peut pas être modifiée ici.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Votre nom et prénom"
                  className={!form.full_name ? "border-red-300 focus-visible:ring-red-400" : ""}
                />
                {!form.full_name && (
                  <p className="text-xs text-red-500">Ce champ est requis pour votre dossier.</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  className={!form.phone ? "border-red-300 focus-visible:ring-red-400" : ""}
                />
                {!form.phone && (
                  <p className="text-xs text-red-500">Ce champ est requis pour votre dossier.</p>
                )}
              </div>
            </div>
            <div className="mt-6">
              <Button
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending || !form.full_name}
              >
                {saveProfile.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
