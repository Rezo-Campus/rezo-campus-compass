import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight,
  CheckSquare, FileText, Lightbulb, CheckCircle2,
} from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/projets/liste")({
  component: ProjetsListe,
});

/* ─── Constantes ────────────────────────────────────────────────────────── */

const BRANCHES = [
  { value: "sites_logiciels", label: "Sites & Logiciels" },
  { value: "automatisation", label: "Automatisation" },
  { value: "accompagnement", label: "Accompagnement" },
  { value: "autre", label: "Autre" },
];
const STATUSES = [
  { value: "planifie", label: "Planifié" },
  { value: "en_cours", label: "En cours" },
  { value: "livre", label: "Livré" },
  { value: "suspendu", label: "Suspendu" },
  { value: "archive", label: "Archivé" },
];
const PRIORITIES = [
  { value: "basse", label: "Basse" },
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "urgente", label: "Urgente" },
];
const TASK_STATUSES = [
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "bloque", label: "Bloqué" },
];
const FEATURE_PRIORITIES = [
  { value: "critique", label: "Critique" },
  { value: "haute", label: "Haute" },
  { value: "normale", label: "Normale" },
  { value: "basse", label: "Basse" },
];
const FEATURE_STATUSES = [
  { value: "brouillon", label: "Brouillon" },
  { value: "specifie", label: "Spécifié" },
  { value: "en_dev", label: "En développement" },
  { value: "en_test", label: "En test" },
  { value: "livre", label: "Livré" },
  { value: "rejete", label: "Rejeté" },
];

const STATUS_COLORS: Record<string, string> = {
  planifie: "bg-blue-100 text-blue-700",
  en_cours: "bg-yellow-100 text-yellow-700",
  livre: "bg-green-100 text-green-700",
  suspendu: "bg-orange-100 text-orange-700",
  archive: "bg-gray-100 text-gray-600",
};
const PRIORITY_BADGE: Record<string, string> = {
  basse: "bg-gray-100 text-gray-500",
  normale: "bg-blue-50 text-blue-600",
  haute: "bg-orange-100 text-orange-600",
  urgente: "bg-red-100 text-red-600",
  critique: "bg-red-100 text-red-700",
};
const TASK_STATUS_COLORS: Record<string, string> = {
  a_faire: "bg-gray-100 text-gray-500",
  en_cours: "bg-yellow-100 text-yellow-700",
  termine: "bg-green-100 text-green-700",
  bloque: "bg-red-100 text-red-500",
};
const FEATURE_STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-gray-100 text-gray-500",
  specifie: "bg-blue-100 text-blue-700",
  en_dev: "bg-yellow-100 text-yellow-700",
  en_test: "bg-purple-100 text-purple-700",
  livre: "bg-green-100 text-green-700",
  rejete: "bg-red-100 text-red-500",
};

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Project = {
  id: string; name: string; description: string | null; client: string | null;
  branch: string; status: string; priority: string;
  start_date: string | null; end_date: string | null; budget: number | null;
  objectives: string | null; target_audience: string | null;
  tech_constraints: string | null; r_and_d_notes: string | null;
  validated_spec: boolean;
  created_by: string | null; created_at: string; updated_at: string;
};
type Task = {
  id: string; project_id: string; title: string; description: string | null;
  status: string; assigned_to: string | null; due_date: string | null;
  created_at: string; updated_at: string;
};
type Feature = {
  id: string; project_id: string; title: string; description: string | null;
  acceptance_criteria: string | null; priority: string; status: string;
  r_and_d_comment: string | null; estimated_hours: number | null;
  created_at: string; updated_at: string;
};

/* ─── Valeurs initiales des formulaires ─────────────────────────────────── */

const emptyProject = {
  name: "", description: "", client: "", branch: "sites_logiciels",
  status: "planifie", priority: "normale", start_date: "", end_date: "", budget: "",
  objectives: "", target_audience: "", tech_constraints: "", r_and_d_notes: "",
  validated_spec: false,
};
const emptyTask = { title: "", description: "", status: "a_faire", due_date: "" };
const emptyFeature = {
  title: "", description: "", acceptance_criteria: "",
  priority: "normale", status: "brouillon", r_and_d_comment: "", estimated_hours: "",
};

type ActiveTab = "specs" | "features" | "tasks";

/* ─── Composant principal ────────────────────────────────────────────────── */

function ProjetsListe() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();

  /* Projet */
  const [openProject, setOpenProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState(emptyProject);

  /* Expansion + onglets */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, ActiveTab>>({});
  const getTab = (id: string): ActiveTab => activeTabs[id] ?? "features";
  const setTab = (id: string, tab: ActiveTab) =>
    setActiveTabs((prev) => ({ ...prev, [id]: tab }));

  /* Filtre */
  const [filterStatus, setFilterStatus] = useState("tous");

  /* Tâches */
  const [taskForms, setTaskForms] = useState<Record<string, typeof emptyTask>>({});
  const [addingTask, setAddingTask] = useState<string | null>(null);

  /* Fonctionnalités */
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [activeFeatureProjectId, setActiveFeatureProjectId] = useState<string | null>(null);
  const [featureForm, setFeatureForm] = useState(emptyFeature);

  /* ── Queries ── */

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: tasks = [] } = useQuery({
    enabled: !!expandedId,
    queryKey: ["tasks", expandedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks").select("*")
        .eq("project_id", expandedId!).order("created_at");
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: features = [] } = useQuery({
    enabled: !!expandedId,
    queryKey: ["features", expandedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_features").select("*")
        .eq("project_id", expandedId!).order("created_at");
      if (error) throw error;
      return data as Feature[];
    },
  });

  /* ── Mutations — Projets ── */

  const saveProject = useMutation({
    mutationFn: async () => {
      if (!projectForm.name.trim()) throw new Error("Le nom du projet est requis");
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description || null,
        client: projectForm.client || null,
        branch: projectForm.branch,
        status: projectForm.status,
        priority: projectForm.priority,
        start_date: projectForm.start_date || null,
        end_date: projectForm.end_date || null,
        budget: projectForm.budget ? Number(projectForm.budget) : null,
        objectives: projectForm.objectives || null,
        target_audience: projectForm.target_audience || null,
        tech_constraints: projectForm.tech_constraints || null,
        r_and_d_notes: projectForm.r_and_d_notes || null,
        validated_spec: projectForm.validated_spec,
        created_by: auth?.user?.id ?? null,
      };
      if (editingProject) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editingProject);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProject ? "Projet modifié" : "Projet créé");
      setOpenProject(false);
      setEditingProject(null);
      setProjectForm(emptyProject);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projet supprimé");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  /* ── Mutations — Tâches ── */

  const saveTask = useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      const tf = taskForms[projectId] ?? emptyTask;
      if (!tf.title.trim()) throw new Error("Titre requis");
      const { error } = await supabase.from("project_tasks").insert({
        project_id: projectId,
        title: tf.title.trim(),
        description: tf.description || null,
        status: tf.status,
        due_date: tf.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      toast.success("Tâche ajoutée");
      setAddingTask(null);
      setTaskForms((f) => ({ ...f, [projectId]: emptyTask }));
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status, projectId }: { taskId: string; status: string; projectId: string }) => {
      const { error } = await supabase.from("project_tasks").update({ status }).eq("id", taskId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteTask = useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  /* ── Mutations — Fonctionnalités ── */

  const saveFeature = useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      if (!featureForm.title.trim()) throw new Error("Titre requis");
      const payload = {
        project_id: projectId,
        title: featureForm.title.trim(),
        description: featureForm.description || null,
        acceptance_criteria: featureForm.acceptance_criteria || null,
        priority: featureForm.priority,
        status: featureForm.status,
        r_and_d_comment: featureForm.r_and_d_comment || null,
        estimated_hours: featureForm.estimated_hours ? Number(featureForm.estimated_hours) : null,
      };
      if (editingFeatureId) {
        const { error } = await supabase.from("project_features").update(payload).eq("id", editingFeatureId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_features").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, { projectId }) => {
      toast.success(editingFeatureId ? "Fonctionnalité modifiée" : "Fonctionnalité ajoutée");
      setFeatureDialogOpen(false);
      setEditingFeatureId(null);
      setFeatureForm(emptyFeature);
      qc.invalidateQueries({ queryKey: ["features", projectId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const updateFeatureStatus = useMutation({
    mutationFn: async ({ featureId, status, projectId }: { featureId: string; status: string; projectId: string }) => {
      const { error } = await supabase.from("project_features").update({ status }).eq("id", featureId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => qc.invalidateQueries({ queryKey: ["features", projectId] }),
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteFeature = useMutation({
    mutationFn: async ({ featureId, projectId }: { featureId: string; projectId: string }) => {
      const { error } = await supabase.from("project_features").delete().eq("id", featureId);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      toast.success("Fonctionnalité supprimée");
      qc.invalidateQueries({ queryKey: ["features", projectId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  /* ── Handlers ── */

  const openEditProject = (p: Project) => {
    setProjectForm({
      name: p.name, description: p.description ?? "", client: p.client ?? "",
      branch: p.branch, status: p.status, priority: p.priority,
      start_date: p.start_date ?? "", end_date: p.end_date ?? "",
      budget: p.budget ? String(p.budget) : "",
      objectives: p.objectives ?? "", target_audience: p.target_audience ?? "",
      tech_constraints: p.tech_constraints ?? "", r_and_d_notes: p.r_and_d_notes ?? "",
      validated_spec: p.validated_spec ?? false,
    });
    setEditingProject(p.id);
    setOpenProject(true);
  };

  const openNewFeature = (projectId: string) => {
    setActiveFeatureProjectId(projectId);
    setEditingFeatureId(null);
    setFeatureForm(emptyFeature);
    setFeatureDialogOpen(true);
  };

  const openEditFeature = (f: Feature, projectId: string) => {
    setFeatureForm({
      title: f.title, description: f.description ?? "",
      acceptance_criteria: f.acceptance_criteria ?? "",
      priority: f.priority, status: f.status,
      r_and_d_comment: f.r_and_d_comment ?? "",
      estimated_hours: f.estimated_hours ? String(f.estimated_hours) : "",
    });
    setActiveFeatureProjectId(projectId);
    setEditingFeatureId(f.id);
    setFeatureDialogOpen(true);
  };

  const filtered = filterStatus === "tous" ? projects : projects.filter((p) => p.status === filterStatus);

  /* ── JSX ── */

  return (
    <>
      <PageHeader
        eyebrow="Projets"
        title="Liste des projets"
        description="Cahier des charges, fonctionnalités et suivi de réalisation."
      />

      {/* Barre de filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {/* Dialog Projet */}
          <Dialog open={openProject} onOpenChange={(v) => {
            if (!v) { setOpenProject(false); setEditingProject(null); setProjectForm(emptyProject); }
            else setOpenProject(true);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 size-4" /> Nouveau projet</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProject ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e: FormEvent) => { e.preventDefault(); saveProject.mutate(); }} className="space-y-5">

                {/* Section : Informations générales */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Informations générales
                  </p>
                  <div className="space-y-1.5">
                    <Label>Nom du projet *</Label>
                    <Input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Client / Commanditaire</Label>
                    <Input value={projectForm.client} onChange={(e) => setProjectForm((f) => ({ ...f, client: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Branche</Label>
                      <Select value={projectForm.branch} onValueChange={(v) => setProjectForm((f) => ({ ...f, branch: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Priorité</Label>
                      <Select value={projectForm.priority} onValueChange={(v) => setProjectForm((f) => ({ ...f, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Statut</Label>
                      <Select value={projectForm.status} onValueChange={(v) => setProjectForm((f) => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Budget (FCFA)</Label>
                      <Input type="number" min={0} value={projectForm.budget} onChange={(e) => setProjectForm((f) => ({ ...f, budget: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Date début</Label>
                      <Input type="date" value={projectForm.start_date} onChange={(e) => setProjectForm((f) => ({ ...f, start_date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date livraison</Label>
                      <Input type="date" value={projectForm.end_date} onChange={(e) => setProjectForm((f) => ({ ...f, end_date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description générale</Label>
                    <Textarea rows={2} value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>

                {/* Section : Cahier des charges */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cahier des charges
                  </p>
                  <div className="space-y-1.5">
                    <Label>Objectifs du projet</Label>
                    <Textarea rows={3} value={projectForm.objectives}
                      onChange={(e) => setProjectForm((f) => ({ ...f, objectives: e.target.value }))}
                      placeholder="Quel problème ce projet résout-il ? Quels résultats sont attendus ?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Audience cible</Label>
                    <Input value={projectForm.target_audience}
                      onChange={(e) => setProjectForm((f) => ({ ...f, target_audience: e.target.value }))}
                      placeholder="Qui utilisera ce projet ?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contraintes techniques</Label>
                    <Textarea rows={2} value={projectForm.tech_constraints}
                      onChange={(e) => setProjectForm((f) => ({ ...f, tech_constraints: e.target.value }))}
                      placeholder="Technologies imposées, intégrations requises, normes à respecter…" />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={projectForm.validated_spec}
                      onChange={(e) => setProjectForm((f) => ({ ...f, validated_spec: e.target.checked }))}
                      className="size-4 accent-primary"
                    />
                    <span className="text-sm font-medium">Cahier des charges validé — prêt pour l'équipe R&D</span>
                  </label>
                </div>

                {/* Section : Notes R&D */}
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Retour de l'équipe R&D
                  </p>
                  <div className="space-y-1.5">
                    <Label>Notes techniques R&D</Label>
                    <Textarea rows={3} value={projectForm.r_and_d_notes}
                      onChange={(e) => setProjectForm((f) => ({ ...f, r_and_d_notes: e.target.value }))}
                      placeholder="Approche technique retenue, points d'attention, estimations globales…" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={saveProject.isPending}>
                  {saveProject.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingProject ? "Enregistrer" : "Créer le projet"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dialog Fonctionnalité */}
      <Dialog open={featureDialogOpen} onOpenChange={(v) => {
        if (!v) { setFeatureDialogOpen(false); setEditingFeatureId(null); setFeatureForm(emptyFeature); }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFeatureId ? "Modifier la fonctionnalité" : "Nouvelle fonctionnalité"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (activeFeatureProjectId) saveFeature.mutate({ projectId: activeFeatureProjectId });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Titre de la fonctionnalité *</Label>
              <Input
                value={featureForm.title}
                onChange={(e) => setFeatureForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex : Authentification utilisateur, Tableau de bord…"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={featureForm.description}
                onChange={(e) => setFeatureForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez en détail le comportement attendu de cette fonctionnalité…" />
            </div>
            <div className="space-y-1.5">
              <Label>Critères d'acceptation</Label>
              <Textarea rows={2} value={featureForm.acceptance_criteria}
                onChange={(e) => setFeatureForm((f) => ({ ...f, acceptance_criteria: e.target.value }))}
                placeholder="Comment saura-t-on que cette fonctionnalité est terminée ?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={featureForm.priority} onValueChange={(v) => setFeatureForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FEATURE_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={featureForm.status} onValueChange={(v) => setFeatureForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FEATURE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Section R&D */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
              <p className="text-xs font-semibold text-amber-700">Retour de l'équipe R&D</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Estimation (heures)</Label>
                  <Input type="number" min={0} step={0.5}
                    value={featureForm.estimated_hours}
                    onChange={(e) => setFeatureForm((f) => ({ ...f, estimated_hours: e.target.value }))}
                    placeholder="Ex : 8" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Commentaire technique</Label>
                <Textarea rows={2} value={featureForm.r_and_d_comment}
                  onChange={(e) => setFeatureForm((f) => ({ ...f, r_and_d_comment: e.target.value }))}
                  placeholder="Approche technique, dépendances, risques…" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saveFeature.isPending}>
              {saveFeature.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingFeatureId ? "Enregistrer" : "Ajouter la fonctionnalité"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Liste des projets */}
      <Panel title={`${filtered.length} projet${filtered.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun projet.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => {
              const expanded = expandedId === p.id;
              const tab = getTab(p.id);
              const projectTasks = expanded ? tasks : [];
              const projectFeatures = expanded ? features : [];
              const tf = taskForms[p.id] ?? emptyTask;

              return (
                <li key={p.id} className="rounded-xl border border-border overflow-hidden">
                  {/* Ligne de résumé */}
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expanded
                        ? <ChevronDown className="size-4" />
                        : <ChevronRight className="size-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{p.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status]}`}>
                          {STATUSES.find((s) => s.value === p.status)?.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[p.priority]}`}>
                          {PRIORITIES.find((s) => s.value === p.priority)?.label}
                        </span>
                        {p.validated_spec && (
                          <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                            <CheckCircle2 className="size-3" /> Spec validée
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {p.client && <span>{p.client}</span>}
                        {p.end_date && <span>Livraison : {new Date(p.end_date).toLocaleDateString("fr-FR")}</span>}
                        {p.budget && <span>Budget : {p.budget.toLocaleString("fr-FR")} FCFA</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditProject(p)} title="Modifier">
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => deleteProject.mutate(p.id)}
                        disabled={deleteProject.isPending}
                        title="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Contenu déplié */}
                  {expanded && (
                    <div className="border-t border-border">
                      {/* Barre d'onglets */}
                      <div className="flex border-b border-border bg-muted/20 px-3">
                        {([
                          { key: "specs" as ActiveTab, label: "Cahier des charges", icon: FileText },
                          { key: "features" as ActiveTab, label: "Fonctionnalités", icon: Lightbulb, count: projectFeatures.length },
                          { key: "tasks" as ActiveTab, label: "Tâches R&D", icon: CheckSquare, count: projectTasks.length },
                        ]).map((t) => (
                          <button
                            key={t.key}
                            onClick={() => setTab(p.id, t.key)}
                            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-medium transition ${
                              tab === t.key
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <t.icon className="size-3.5" />
                            {t.label}
                            {t.count !== undefined && t.count > 0 && (
                              <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                                {t.count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="bg-muted/10 p-3">

                        {/* ── Onglet : Cahier des charges ── */}
                        {tab === "specs" && (
                          <div className="space-y-3">
                            <div className="flex justify-end">
                              <Button size="sm" variant="outline" onClick={() => openEditProject(p)}>
                                <Pencil className="mr-1.5 size-3.5" /> Modifier
                              </Button>
                            </div>

                            {!p.objectives && !p.tech_constraints && !p.target_audience && !p.description && !p.r_and_d_notes ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <p>Aucun cahier des charges rédigé.</p>
                                <Button size="sm" variant="outline" className="mt-2" onClick={() => openEditProject(p)}>
                                  Rédiger le cahier des charges
                                </Button>
                              </div>
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {p.objectives && (
                                  <div className="rounded-lg border border-border bg-background p-3">
                                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Objectifs</div>
                                    <p className="text-sm whitespace-pre-wrap">{p.objectives}</p>
                                  </div>
                                )}
                                {p.target_audience && (
                                  <div className="rounded-lg border border-border bg-background p-3">
                                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Audience cible</div>
                                    <p className="text-sm">{p.target_audience}</p>
                                  </div>
                                )}
                                {p.tech_constraints && (
                                  <div className="rounded-lg border border-border bg-background p-3">
                                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Contraintes techniques</div>
                                    <p className="text-sm whitespace-pre-wrap">{p.tech_constraints}</p>
                                  </div>
                                )}
                                {p.description && (
                                  <div className="rounded-lg border border-border bg-background p-3">
                                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Description générale</div>
                                    <p className="text-sm">{p.description}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {p.r_and_d_notes && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <div className="mb-1 text-xs font-semibold text-amber-700">💬 Notes de l'équipe R&D</div>
                                <p className="text-sm whitespace-pre-wrap text-amber-800">{p.r_and_d_notes}</p>
                              </div>
                            )}

                            <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                              p.validated_spec
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-border text-muted-foreground"
                            }`}>
                              <CheckCircle2 className={`size-4 ${p.validated_spec ? "text-green-500" : "text-gray-300"}`} />
                              {p.validated_spec
                                ? "Cahier des charges validé — transmis à l'équipe R&D"
                                : "Cahier des charges en cours de rédaction"}
                            </div>
                          </div>
                        )}

                        {/* ── Onglet : Fonctionnalités ── */}
                        {tab === "features" && (
                          <div className="space-y-2">
                            {projectFeatures.length === 0 ? (
                              <p className="py-2 text-xs text-muted-foreground">Aucune fonctionnalité définie.</p>
                            ) : (
                              projectFeatures.map((f) => (
                                <div key={f.id} className="rounded-lg border border-border bg-background p-3">
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-sm font-medium">{f.title}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FEATURE_STATUS_COLORS[f.status]}`}>
                                          {FEATURE_STATUSES.find((s) => s.value === f.status)?.label}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[f.priority]}`}>
                                          {FEATURE_PRIORITIES.find((s) => s.value === f.priority)?.label}
                                        </span>
                                      </div>
                                      {f.description && (
                                        <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                                      )}
                                      {f.acceptance_criteria && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                          <span className="font-medium">✓ Critères : </span>
                                          {f.acceptance_criteria}
                                        </div>
                                      )}
                                      {(f.r_and_d_comment || f.estimated_hours) && (
                                        <div className="mt-1.5 flex items-start gap-2 rounded border border-amber-100 bg-amber-50 px-2 py-1">
                                          <span className="shrink-0 text-[10px] font-semibold text-amber-600">R&D</span>
                                          <div className="text-xs text-amber-700">
                                            {f.estimated_hours && <span>⏱ {f.estimated_hours}h</span>}
                                            {f.r_and_d_comment && (
                                              <span className={f.estimated_hours ? "ml-2 italic" : "italic"}>
                                                {f.r_and_d_comment}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                      <Select
                                        value={f.status}
                                        onValueChange={(v) => updateFeatureStatus.mutate({ featureId: f.id, status: v, projectId: p.id })}
                                      >
                                        <SelectTrigger className="h-6 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {FEATURE_STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <button
                                        onClick={() => openEditFeature(f, p.id)}
                                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        title="Modifier"
                                      >
                                        <Pencil className="size-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteFeature.mutate({ featureId: f.id, projectId: p.id })}
                                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                            <button
                              onClick={() => openNewFeature(p.id)}
                              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <Plus className="size-3.5" /> Ajouter une fonctionnalité
                            </button>
                          </div>
                        )}

                        {/* ── Onglet : Tâches R&D ── */}
                        {tab === "tasks" && (
                          <div>
                            {projectTasks.length === 0 ? (
                              <p className="py-2 text-xs text-muted-foreground">Aucune tâche.</p>
                            ) : (
                              <ul className="mb-3 space-y-1.5">
                                {projectTasks.map((t) => (
                                  <li key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                                    <Select
                                      value={t.status}
                                      onValueChange={(v) => updateTaskStatus.mutate({ taskId: t.id, status: v, projectId: p.id })}
                                    >
                                      <SelectTrigger className="h-6 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {TASK_STATUSES.map((s) => (
                                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <span className="flex-1 text-sm">{t.title}</span>
                                    {t.due_date && (
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(t.due_date).toLocaleDateString("fr-FR")}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => deleteTask.mutate({ taskId: t.id, projectId: p.id })}
                                      className="text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {addingTask === p.id ? (
                              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-2">
                                <Input
                                  className="h-8 flex-1 min-w-[160px] text-sm"
                                  placeholder="Titre de la tâche…"
                                  value={tf.title}
                                  onChange={(e) => setTaskForms((f) => ({ ...f, [p.id]: { ...tf, title: e.target.value } }))}
                                />
                                <Input
                                  type="date"
                                  className="h-8 w-36 text-sm"
                                  value={tf.due_date}
                                  onChange={(e) => setTaskForms((f) => ({ ...f, [p.id]: { ...tf, due_date: e.target.value } }))}
                                />
                                <Button size="sm" onClick={() => saveTask.mutate({ projectId: p.id })} disabled={saveTask.isPending}>
                                  {saveTask.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Ajouter"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setAddingTask(null)}>Annuler</Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddingTask(p.id)}
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                <Plus className="size-3.5" /> Ajouter une tâche
                              </button>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
