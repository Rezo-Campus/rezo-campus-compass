import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/rh/personnel")({
  component: RhPersonnel,
});

const MAX_CV_SIZE = 1.5 * 1024 * 1024; // 1.5 Mo

const DEPARTMENTS = [
  "Sites & Logiciels",
  "Automatisation",
  "Accompagnement étudiant",
  "Marketing & Commercial",
  "Comptabilité",
  "Projets IT",
  "Ressources Humaines",
  "Général",
];

const STATUSES = [
  { value: "actif", label: "Actif" },
  { value: "conge", label: "En congé" },
  { value: "inactif", label: "Inactif" },
];

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-green-100 text-green-700",
  conge: "bg-amber-100 text-amber-700",
  inactif: "bg-gray-100 text-gray-500",
};

type Personnel = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  hire_date: string | null;
  department: string;
  last_diploma: string | null;
  mission: string | null;
  cv_path: string | null;
  status: string;
  created_at: string;
};

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
  birth_date: "",
  hire_date: "",
  department: DEPARTMENTS[0],
  last_diploma: "",
  mission: "",
  status: "actif",
};

function RhPersonnel() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingCvPath, setExistingCvPath] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setcvUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: personnel = [], isLoading } = useQuery({
    queryKey: ["personnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personnel")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Personnel[];
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setExistingCvPath(null);
    setForm(emptyForm);
    setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Nom complet requis");
      if (!form.department) throw new Error("Département requis");

      if (cvFile && cvFile.size > MAX_CV_SIZE) {
        throw new Error("Le CV dépasse la taille maximale de 1,5 Mo");
      }

      const id = editingId ?? crypto.randomUUID();
      let cv_path: string | null = existingCvPath ?? null;

      if (cvFile) {
        setcvUploading(true);
        const ext = cvFile.name.split(".").pop() ?? "pdf";
        const path = `${id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("cvs")
          .upload(path, cvFile, { upsert: true });
        setcvUploading(false);
        if (uploadError) throw new Error(`Erreur upload CV : ${uploadError.message}`);
        cv_path = path;
      }

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        birth_date: form.birth_date || null,
        hire_date: form.hire_date || null,
        department: form.department,
        last_diploma: form.last_diploma || null,
        mission: form.mission || null,
        cv_path,
        status: form.status,
        created_by: auth?.user?.id ?? null,
      };

      if (editingId) {
        const { error } = await supabase.from("personnel").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("personnel").insert({ ...payload, id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Agent modifié" : "Agent enregistré");
      closeDialog();
      qc.invalidateQueries({ queryKey: ["personnel"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (p: Personnel) => {
      if (p.cv_path) {
        await supabase.storage.from("cvs").remove([p.cv_path]);
      }
      const { error } = await supabase.from("personnel").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agent supprimé");
      qc.invalidateQueries({ queryKey: ["personnel"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const openEdit = (p: Personnel) => {
    setForm({
      full_name: p.full_name,
      email: p.email ?? "",
      phone: p.phone ?? "",
      address: p.address ?? "",
      birth_date: p.birth_date ?? "",
      hire_date: p.hire_date ?? "",
      department: p.department,
      last_diploma: p.last_diploma ?? "",
      mission: p.mission ?? "",
      status: p.status,
    });
    setExistingCvPath(p.cv_path);
    setEditingId(p.id);
    setOpen(true);
  };

  const getCvUrl = (path: string) => {
    const { data } = supabase.storage.from("cvs").getPublicUrl(path);
    return data.publicUrl;
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_CV_SIZE) {
      toast.error("Fichier trop lourd", { description: "Le CV ne doit pas dépasser 1,5 Mo." });
      e.target.value = "";
      return;
    }
    setCvFile(file);
  };

  return (
    <>
      <PageHeader
        eyebrow="Ressources Humaines"
        title="Gestion du personnel"
        description="Enregistrez et gérez les agents : informations, diplôme, mission et CV."
      />

      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" /> Enregistrer un agent</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Modifier l'agent" : "Enregistrer un nouvel agent"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}
              className="space-y-4"
            >
              {/* Informations personnelles */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Informations personnelles
                </p>
                <div className="space-y-1.5">
                  <Label>Nom complet *</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Prénom et Nom"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Adresse de résidence"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date de naissance</Label>
                    <Input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date d'embauche</Label>
                    <Input
                      type="date"
                      value={form.hire_date}
                      onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Poste */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Poste & Compétences
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Département *</Label>
                    <Select
                      value={form.department}
                      onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Statut</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Dernier diplôme</Label>
                  <Input
                    value={form.last_diploma}
                    onChange={(e) => setForm((f) => ({ ...f, last_diploma: e.target.value }))}
                    placeholder="Ex : Licence en Informatique, Master RH…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mission / Prérogatives</Label>
                  <Textarea
                    rows={3}
                    value={form.mission}
                    onChange={(e) => setForm((f) => ({ ...f, mission: e.target.value }))}
                    placeholder="Décrivez les missions et responsabilités de l'agent…"
                  />
                </div>
              </div>

              {/* CV */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Curriculum Vitae
                </p>
                {existingCvPath && !cvFile && (
                  <a
                    href={getCvUrl(existingCvPath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Download className="size-3.5" /> CV actuel (télécharger)
                  </a>
                )}
                <div className="space-y-1">
                  <Label htmlFor="cv-upload">
                    {existingCvPath ? "Remplacer le CV" : "Joindre un CV"}
                    <span className="ml-1 text-muted-foreground font-normal">(PDF, DOC — max 1,5 Mo)</span>
                  </Label>
                  <Input
                    id="cv-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={onFileChange}
                    className="cursor-pointer"
                  />
                  {cvFile && (
                    <p className="text-xs text-muted-foreground">
                      {cvFile.name} — {(cvFile.size / 1024).toFixed(0)} Ko
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={save.isPending || cvUploading}>
                {(save.isPending || cvUploading) && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {cvUploading ? "Upload du CV…" : editingId ? "Enregistrer" : "Créer l'agent"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Panel title={`${personnel.length} agent${personnel.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : personnel.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun agent enregistré.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Dernier diplôme</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>CV</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnel.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.email && <span>{p.email}</span>}
                      {p.phone && <span className="ml-2">{p.phone}</span>}
                    </div>
                    {p.mission && (
                      <div className="mt-0.5 max-w-xs truncate text-xs italic text-muted-foreground">
                        {p.mission}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{p.department}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.last_diploma ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${STATUS_COLORS[p.status]}`}
                    >
                      {STATUSES.find((s) => s.value === p.status)?.label ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.cv_path ? (
                      <a
                        href={getCvUrl(p.cv_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="size-3.5" /> CV
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        title="Modifier"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => del.mutate(p)}
                        disabled={del.isPending}
                        title="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
