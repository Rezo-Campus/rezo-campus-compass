import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Loader2, Ban, ShieldCheck, X, Plus, School, Camera, User, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type Role = AppRole;

const ALL_ROLES: Role[] = ["etudiant", "conseiller", "admin", "comptable", "chef_projet", "commercial", "rh", "ecole", "secretaire", "aadf"];

const ROLE_LABELS: Record<Role, string> = {
  etudiant:    "Étudiant",
  conseiller:  "Conseiller",
  admin:       "Admin",
  comptable:   "Comptable",
  chef_projet: "Chef de projet",
  commercial:  "Commercial",
  rh:          "Ressources Humaines",
  ecole:       "Établissement",
  secretaire:  "Secrétaire Particulière",
  aadf:        "AADF",
};

const ROLE_COLORS: Record<string, string> = {
  admin:       "bg-red-100 text-red-700",
  conseiller:  "bg-purple-100 text-purple-700",
  comptable:   "bg-blue-100 text-blue-700",
  chef_projet: "bg-orange-100 text-orange-700",
  commercial:  "bg-cyan-100 text-cyan-700",
  rh:          "bg-pink-100 text-pink-700",
  aadf:        "bg-yellow-100 text-yellow-700",
  secretaire:  "bg-indigo-100 text-indigo-700",
  ecole:       "bg-teal-100 text-teal-700",
  etudiant:    "bg-green-100 text-green-700",
};

type UserRow = {
  id: string; email: string; full_name: string | null; phone: string | null;
  photo_url: string | null; created_at: string; blocked_at: string | null;
  school_id: string | null; roles: Role[];
};

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  component: AdminUsers,
});

/* ─── Panneau profil — pur React, pas de Portal/Radix ────────── */
function ProfilePanel({
  user, onClose,
}: {
  user: UserRow; onClose: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.photo_url);
  const [saving, setSaving] = useState(false);

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ photo_url: publicUrl }).eq("id", user.id);
      setPreviewUrl(publicUrl);
      toast.success("Photo mise à jour");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: unknown) {
      toast.error("Erreur upload", { description: (e as Error).message });
    } finally { setUploading(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles")
        .update({ full_name: name.trim() || null, phone: phone.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profil enregistré");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
    } catch (e: unknown) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally { setSaving(false); }
  }

  return (
    /* Fond semi-transparent + panneau */
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)", cursor: "pointer",
        }}
      />

      {/* Panneau */}
      <div
        style={{
          position: "relative", zIndex: 1,
          width: "420px", maxWidth: "100vw",
          backgroundColor: "var(--background, #fff)",
          height: "100%", overflowY: "auto",
          padding: "24px", display: "flex", flexDirection: "column", gap: "20px",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Profil utilisateur</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Photo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            {previewUrl ? (
              <img src={previewUrl} alt="avatar"
                style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
            ) : (
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                backgroundColor: "#ede9fe", color: "#7c3aed",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <User style={{ width: 40, height: 40 }} />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 32, height: 32, borderRadius: "50%",
                backgroundColor: "#7c3aed", color: "#fff",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              {uploading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Camera style={{ width: 14, height: 14 }} />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Cliquez sur l'icône caméra pour changer la photo</p>
        </div>

        {/* Champs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label style={{ fontSize: 12, color: "#94a3b8" }}>Email (non modifiable)</Label>
            <Input value={user.email} disabled className="mt-1" />
          </div>
          <div>
            <Label style={{ fontSize: 12, color: "#94a3b8" }}>Nom complet</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" />
          </div>
          <div>
            <Label style={{ fontSize: 12, color: "#94a3b8" }}>Téléphone</Label>
            <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+242 06 000 00 00" />
          </div>

          {/* Rôles — lecture seule */}
          <div>
            <Label style={{ fontSize: 12, color: "#94a3b8" }}>Rôle(s) — géré depuis la liste</Label>
            <div style={{
              marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6,
              padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0",
              minHeight: 38, background: "#f8fafc",
            }}>
              {user.roles.length === 0 ? (
                <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Aucun rôle attribué</span>
              ) : user.roles.map((r) => (
                <span key={r} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[r] ?? "bg-gray-100 text-gray-700"}`}>
                  {ROLE_LABELS[r] ?? r}
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label style={{ fontSize: 12, color: "#94a3b8" }}>Inscrit le</Label>
            <p style={{ marginTop: 4, fontSize: 14, color: "#64748b" }}>
              {new Date(user.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <Button variant="outline" style={{ flex: 1 }} onClick={onClose}>Annuler</Button>
          <Button style={{ flex: 1 }} onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 animate-spin" style={{ width: 14, height: 14 }} /> : <Save className="mr-2" style={{ width: 14, height: 14 }} />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────── */
function AdminUsers() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const currentUserId = auth?.user?.id;

  const [profileUser, setProfileUser] = useState<UserRow | null>(null);
  const [pendingEcole, setPendingEcole] = useState<{ userId: string } | null>(null);
  const [schoolPickId, setSchoolPickId] = useState("");
  const [assigningSchool, setAssigningSchool] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, photo_url, created_at, blocked_at, school_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roleRows } = await (supabase as any).from("user_roles").select("user_id, role");
      return profs.map((p: any) => ({
        ...p,
        roles: ((roleRows ?? []) as { user_id: string; role: string }[])
          .filter((r) => r.user_id === p.id)
          .map((r) => r.role as Role),
      })) as UserRow[];
    },
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["schools-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await (supabase as any).from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rôle ajouté");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["auth-session"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await (supabase as any)
        .from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
      if (role === "ecole") {
        await supabase.from("profiles").update({ school_id: null }).eq("id", userId);
      }
    },
    onSuccess: () => {
      toast.success("Rôle retiré");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["auth-session"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const { error } = await supabase.from("profiles")
        .update({ blocked_at: block ? new Date().toISOString() : null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { block }) => {
      toast.success(block ? "Compte bloqué" : "Compte débloqué");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function confirmEcoleAssignment() {
    if (!pendingEcole || !schoolPickId) return;
    setAssigningSchool(true);
    try {
      await (supabase as any).from("user_roles").upsert(
        { user_id: pendingEcole.userId, role: "ecole" },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );
      await supabase.from("profiles").update({ school_id: schoolPickId }).eq("id", pendingEcole.userId);
      toast.success("Rôle Établissement attribué");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["auth-session"] });
      setPendingEcole(null);
      setSchoolPickId("");
    } catch (e: unknown) {
      toast.error("Erreur", { description: (e as Error).message });
    } finally { setAssigningSchool(false); }
  }

  async function changeSchool(userId: string, schoolId: string) {
    const { error } = await supabase.from("profiles").update({ school_id: schoolId }).eq("id", userId);
    if (error) { toast.error("Erreur", { description: error.message }); return; }
    toast.success("École modifiée");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  const pending = rows.filter((r) => !r.roles.length && !r.blocked_at).length;
  const blocked = rows.filter((r) => r.blocked_at).length;

  return (
    <div style={{ position: "relative" }}>
      <PageHeader
        eyebrow="Utilisateurs"
        title="Gestion des comptes"
        description="Cliquez sur un nom pour modifier le profil."
      />
      <Panel
        title={`${rows.length} compte${rows.length > 1 ? "s" : ""}`}
        description={[
          pending > 0 ? `${pending} en attente` : "",
          blocked > 0 ? `${blocked} bloqué${blocked > 1 ? "s" : ""}` : "",
        ].filter(Boolean).join(" · ") || undefined}
      >
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <Loader2 className="animate-spin text-primary" style={{ width: 24, height: 24 }} />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun utilisateur inscrit.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Rôles actuels</TableHead>
                <TableHead>Ajouter un rôle</TableHead>
                <TableHead className="text-right">Accès</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const available = ALL_ROLES.filter((r) => !u.roles.includes(r));
                const assignedSchool = u.roles.includes("ecole")
                  ? schools.find((s) => s.id === u.school_id) : null;

                /* initiales avatar */
                const initials = (u.full_name || "?")
                  .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

                return (
                  <TableRow key={u.id} className={u.blocked_at ? "opacity-60 bg-destructive/5" : ""}>

                    {/* ── Nom cliquable ── */}
                    <TableCell>
                      <div
                        onClick={() => setProfileUser(u)}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}
                      >
                        {u.photo_url ? (
                          <img src={u.photo_url} alt={u.full_name ?? ""}
                            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #e2e8f0" }} />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                            backgroundColor: "#ede9fe", color: "#7c3aed",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 600,
                          }}>
                            {initials}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 500, color: "inherit" }}
                            className="hover:text-primary hover:underline underline-offset-2">
                            {u.full_name || <em style={{ color: "#94a3b8" }}>Sans nom</em>}
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{u.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.blocked_at && (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="w-3 h-3" /> Bloqué
                          </Badge>
                        )}
                        {u.roles.length === 0 && !u.blocked_at && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            En attente
                          </Badge>
                        )}
                        {u.roles.map((r: Role) => (
                          <span key={r} className="inline-flex items-center gap-1">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[r] ?? "bg-muted"}`}>
                              {r === "ecole" && <School className="w-3 h-3" />}
                              {ROLE_LABELS[r]}
                              {u.id !== currentUserId && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeRole.mutate({ userId: u.id, role: r }); }}
                                  disabled={removeRole.isPending}
                                  className="ml-0.5 rounded-sm opacity-70 transition hover:opacity-100 hover:text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                            {r === "ecole" && (
                              assignedSchool ? (
                                <Select value={u.school_id ?? ""} onValueChange={(v) => changeSchool(u.id, v)}>
                                  <SelectTrigger className="h-6 w-auto gap-1 border-dashed px-2 text-xs text-muted-foreground">
                                    <SelectValue placeholder="Choisir une école" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {schools.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setPendingEcole({ userId: u.id }); setSchoolPickId(""); }}
                                  className="rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700 hover:bg-amber-200"
                                >
                                  Affecter une école
                                </button>
                              )
                            )}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      {!u.blocked_at && u.id !== currentUserId && available.length > 0 && (
                        <Select value="" onValueChange={(v) => {
                          if (v === "ecole") { setPendingEcole({ userId: u.id }); setSchoolPickId(""); }
                          else addRole.mutate({ userId: u.id, role: v as Role });
                        }}>
                          <SelectTrigger className="w-[160px]">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Plus className="w-3 h-3" /> Ajouter…
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {available.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {u.id !== currentUserId ? (
                        <Button
                          size="sm"
                          variant={u.blocked_at ? "outline" : "ghost"}
                          className={u.blocked_at
                            ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                            : "text-destructive hover:text-destructive hover:bg-destructive/10"}
                          onClick={(e) => { e.stopPropagation(); toggleBlock.mutate({ userId: u.id, block: !u.blocked_at }); }}
                          disabled={toggleBlock.isPending}
                        >
                          {u.blocked_at
                            ? <><ShieldCheck className="mr-1 w-4 h-4" /> Débloquer</>
                            : <><Ban className="mr-1 w-4 h-4" /> Bloquer</>}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Vous</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* ── Panneau profil (fixed, pur CSS, z-index 9999) ── */}
      {profileUser !== null && (
        <ProfilePanel
          key={profileUser.id}
          user={profileUser}
          onClose={() => setProfileUser(null)}
        />
      )}

      {/* ── Dialog affectation école ── */}
      <Dialog open={!!pendingEcole} onOpenChange={(o) => { if (!o) setPendingEcole(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="w-5 h-5" /> Affecter un établissement
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sélectionnez l'école dont cet utilisateur est le responsable.
          </p>
          <Select value={schoolPickId} onValueChange={setSchoolPickId}>
            <SelectTrigger><SelectValue placeholder="Choisir une école…" /></SelectTrigger>
            <SelectContent>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingEcole(null)}>Annuler</Button>
            <Button disabled={!schoolPickId || assigningSchool} onClick={confirmEcoleAssignment}>
              {assigningSchool && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Attribuer le rôle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
