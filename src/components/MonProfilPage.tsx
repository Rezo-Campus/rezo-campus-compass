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

function resizeToBase64(file: File, maxPx = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function MonProfilPage() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["own-profile", uid],
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

  const effectiveName = name ?? profile?.full_name ?? "";
  const effectivePhone = phone ?? profile?.phone ?? "";
  const effectivePhoto = previewUrl ?? profile?.photo_url ?? null;

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const dataUrl = await resizeToBase64(file, 300);
      const { error } = await supabase.from("profiles").update({ photo_url: dataUrl }).eq("id", uid!);
      if (error) throw error;
      setPreviewUrl(dataUrl);
      toast.success("Photo mise à jour");
      qc.invalidateQueries({ queryKey: ["own-profile", uid] });
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
      qc.invalidateQueries({ queryKey: ["own-profile", uid] });
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
