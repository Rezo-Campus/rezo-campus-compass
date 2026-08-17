import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Loader2, Camera, User, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/profil")({
  component: AdminProfil,
});

function AdminProfil() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["admin-own-profile", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, photo_url, created_at")
        .eq("id", uid!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* Initialise les champs depuis le profil chargé (une seule fois) */
  const effectiveName = name ?? profile?.full_name ?? "";
  const effectivePhone = phone ?? profile?.phone ?? "";
  const effectivePhoto = previewUrl ?? profile?.photo_url ?? null;

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${uid}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from("student-documents")
        .getPublicUrl(path);
      await supabase.from("profiles").update({ photo_url: publicUrl }).eq("id", uid!);
      setPreviewUrl(publicUrl);
      toast.success("Photo mise à jour");
      qc.invalidateQueries({ queryKey: ["admin-own-profile", uid] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: unknown) {
      toast.error("Erreur upload", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: effectiveName.trim() || null, phone: effectivePhone.trim() || null })
        .eq("id", uid!);
      if (error) throw error;
      toast.success("Profil enregistré");
      qc.invalidateQueries({ queryKey: ["admin-own-profile", uid] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: unknown) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Compte" title="Mon profil" description="Modifiez votre photo, nom et numéro de téléphone." />

      <div className="mx-auto max-w-md">
        <Panel>
          {/* Photo */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b border-border mb-6">
            <div className="relative">
              {effectivePhoto ? (
                <img
                  src={effectivePhoto}
                  alt="avatar"
                  className="size-24 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center border-2 border-border">
                  <User className="size-10" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition disabled:opacity-60"
              >
                {uploading
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Camera className="size-3.5" />}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }}
            />
            <p className="text-xs text-muted-foreground">Cliquez sur l'icône caméra pour changer la photo</p>
          </div>

          {/* Champs */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Email (non modifiable)</Label>
              <Input value={profile?.email ?? ""} disabled className="mt-1 bg-muted/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nom complet</Label>
              <Input
                className="mt-1"
                value={effectiveName}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prénom Nom"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Téléphone</Label>
              <Input
                className="mt-1"
                value={effectivePhone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+242 06 000 00 00"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Inscrit le</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          <Button className="mt-6 w-full gap-2" onClick={save} disabled={saving}>
            {saving
              ? <Loader2 className="size-4 animate-spin" />
              : <Save className="size-4" />}
            Enregistrer les modifications
          </Button>
        </Panel>
      </div>
    </>
  );
}
