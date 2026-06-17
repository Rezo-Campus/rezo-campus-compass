import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Pencil, Trash2, School } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/ecole/formations")({
  component: EcoleFormations,
});

type Program = {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  domain: string | null;
  level: string | null;
  duration: string | null;
  language: string | null;
  tuition_fee: number | null;
  requirements: string | null;
};

const DOMAINS = ["Sciences", "Ingénierie & Technologie", "Commerce & Gestion", "Droit", "Santé", "Arts & Design", "Sciences Humaines", "Éducation", "Autre"];
const LEVELS = ["Technicien", "Technicien Spécialisé", "BTS (Bac+2)", "BUT (Bac+3)", "Licence (Bac+3)", "Master (Bac+5)", "MBA", "Mastère spécialisé", "Doctorat (Bac+8)"];
const LANGUAGES = ["Français", "Anglais", "Bilingue (Fr/En)", "Espagnol", "Autre"];

const EMPTY_PROGRAM = {
  name: "", description: "", domain: "", level: "", duration: "",
  language: "Français", tuition_fee: "" as string | number, requirements: "",
};

function EcoleFormations() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const schoolId = auth?.profile?.school_id ?? null;

  const [programDialog, setProgramDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState<typeof EMPTY_PROGRAM>({ ...EMPTY_PROGRAM });

  const { data: schoolInfo } = useQuery({
    enabled: !!schoolId,
    queryKey: ["ecole-formations-school", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, logo_url")
        .eq("id", schoolId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: programs = [], isLoading } = useQuery({
    enabled: !!schoolId,
    queryKey: ["ecole-formations", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_programs")
        .select("*")
        .eq("school_id", schoolId!)
        .order("name");
      if (error) throw error;
      return data as Program[];
    },
  });

  function openAdd() {
    setEditingProgram(null);
    setProgramForm({ ...EMPTY_PROGRAM });
    setProgramDialog(true);
  }

  function openEdit(p: Program) {
    setEditingProgram(p);
    setProgramForm({
      name: p.name,
      description: p.description ?? "",
      domain: p.domain ?? "",
      level: p.level ?? "",
      duration: p.duration ?? "",
      language: p.language ?? "Français",
      tuition_fee: p.tuition_fee ?? "",
      requirements: p.requirements ?? "",
    });
    setProgramDialog(true);
  }

  const saveProgram = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error("Aucun établissement affecté à votre compte.");
      if (!programForm.name.trim()) throw new Error("Le nom de la formation est obligatoire.");
      const payload = {
        school_id: schoolId,
        name: programForm.name,
        description: programForm.description || null,
        domain: programForm.domain || null,
        level: programForm.level || null,
        duration: programForm.duration || null,
        language: programForm.language || null,
        tuition_fee: programForm.tuition_fee ? Number(programForm.tuition_fee) : null,
        requirements: programForm.requirements || null,
      };
      if (editingProgram) {
        const { error } = await supabase.from("school_programs").update(payload).eq("id", editingProgram.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_programs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProgram ? "Formation mise à jour" : "Formation ajoutée");
      qc.invalidateQueries({ queryKey: ["ecole-formations", schoolId] });
      setProgramDialog(false);
      setEditingProgram(null);
      setProgramForm({ ...EMPTY_PROGRAM });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteProgram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("school_programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formation supprimée");
      qc.invalidateQueries({ queryKey: ["ecole-formations", schoolId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  if (!schoolId) {
    return (
      <>
        <PageHeader eyebrow="Espace École" title="Formations" description="" />
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <School className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun établissement affecté à votre compte.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Espace École"
        title={schoolInfo?.name ? `Formations — ${schoolInfo.name}` : "Formations"}
        description="Gérez l'ensemble des formations proposées par votre établissement."
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" /> Ajouter une formation
        </Button>
      </div>

      <Panel title={`${programs.length} formation${programs.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : programs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucune formation enregistrée pour votre établissement.
          </div>
        ) : (
          <ul className="space-y-2">
            {programs.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {p.domain && <span className="rounded bg-muted px-1.5">{p.domain}</span>}
                    {p.level && <span className="rounded bg-muted px-1.5">{p.level}</span>}
                    {p.duration && <span>{p.duration}</span>}
                    {p.language && <span>{p.language}</span>}
                    {p.tuition_fee != null && (
                      <span>{p.tuition_fee.toLocaleString("fr-FR")} €/an</span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setPendingDeleteId(p.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Program Dialog */}
      <Dialog open={programDialog} onOpenChange={setProgramDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgram ? "Modifier la formation" : "Ajouter une formation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom de la formation *</Label>
              <Input value={programForm.name} onChange={(e) => setProgramForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex. Master Intelligence Artificielle" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea rows={2} value={programForm.description} onChange={(e) => setProgramForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brève description de la formation" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Domaine</Label>
                <Select value={programForm.domain} onValueChange={(v) => setProgramForm((f) => ({ ...f, domain: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Niveau</Label>
                <Select value={programForm.level} onValueChange={(v) => setProgramForm((f) => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Durée</Label>
                <Input value={programForm.duration} onChange={(e) => setProgramForm((f) => ({ ...f, duration: e.target.value }))} placeholder="ex. 2 ans" />
              </div>
              <div className="grid gap-2">
                <Label>Langue</Label>
                <Select value={programForm.language} onValueChange={(v) => setProgramForm((f) => ({ ...f, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Frais de scolarité annuels (€)</Label>
              <Input type="number" min={0} value={programForm.tuition_fee} onChange={(e) => setProgramForm((f) => ({ ...f, tuition_fee: e.target.value }))} placeholder="ex. 8000" />
            </div>
            <div className="grid gap-2">
              <Label>Prérequis</Label>
              <Textarea rows={2} value={programForm.requirements} onChange={(e) => setProgramForm((f) => ({ ...f, requirements: e.target.value }))} placeholder="Conditions d'admission, diplômes requis..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgramDialog(false)}>Annuler</Button>
            <Button
              disabled={!programForm.name || saveProgram.isPending}
              onClick={() => saveProgram.mutate()}
            >
              {saveProgram.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingProgram ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer cette formation ?"
        description="Cette formation sera définitivement supprimée de votre établissement."
        onConfirm={() => {
          if (pendingDeleteId) deleteProgram.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={deleteProgram.isPending}
      />
    </>
  );
}
