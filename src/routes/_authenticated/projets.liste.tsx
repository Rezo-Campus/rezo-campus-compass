import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, CheckSquare } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/projets/liste")({
  component: ProjetsListe,
});

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
};
const TASK_STATUS_COLORS: Record<string, string> = {
  a_faire: "bg-gray-100 text-gray-500",
  en_cours: "bg-yellow-100 text-yellow-700",
  termine: "bg-green-100 text-green-700",
  bloque: "bg-red-100 text-red-500",
};

type Project = { id: string; name: string; description: string | null; client: string | null; branch: string; status: string; priority: string; start_date: string | null; end_date: string | null; budget: number | null; created_by: string | null; created_at: string; updated_at: string };
type Task = { id: string; project_id: string; title: string; description: string | null; status: string; assigned_to: string | null; due_date: string | null; created_at: string; updated_at: string };

const emptyProject = { name: "", description: "", client: "", branch: "sites_logiciels", status: "planifie", priority: "normale", start_date: "", end_date: "", budget: "" };
const emptyTask = { title: "", description: "", status: "a_faire", due_date: "" };

function ProjetsListe() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [openProject, setOpenProject] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("tous");
  const [taskForms, setTaskForms] = useState<Record<string, typeof emptyTask>>({});
  const [addingTask, setAddingTask] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: tasks = [] } = useQuery({
    enabled: !!expandedId,
    queryKey: ["tasks", expandedId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_tasks").select("*").eq("project_id", expandedId!).order("created_at");
      if (error) throw error;
      return data as Task[];
    },
  });

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

  const openEdit = (p: Project) => {
    setProjectForm({ name: p.name, description: p.description ?? "", client: p.client ?? "", branch: p.branch, status: p.status, priority: p.priority, start_date: p.start_date ?? "", end_date: p.end_date ?? "", budget: p.budget ? String(p.budget) : "" });
    setEditingProject(p.id);
    setOpenProject(true);
  };

  const filtered = filterStatus === "tous" ? projects : projects.filter((p) => p.status === filterStatus);

  return (
    <>
      <PageHeader
        eyebrow="Projets"
        title="Liste des projets"
        description="Créez, suivez et gérez tous les projets Rézo Campus."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Dialog open={openProject} onOpenChange={(v) => { if (!v) { setOpenProject(false); setEditingProject(null); setProjectForm(emptyProject); } else setOpenProject(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 size-4" /> Nouveau projet</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProject ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e: FormEvent) => { e.preventDefault(); saveProject.mutate(); }} className="space-y-4">
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
                  <Label>Description</Label>
                  <Textarea rows={2} value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} />
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
              const projectTasks = expanded ? tasks : [];
              const tf = taskForms[p.id] ?? emptyTask;
              return (
                <li key={p.id} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <button onClick={() => setExpandedId(expanded ? null : p.id)} className="text-muted-foreground hover:text-foreground">
                      {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{p.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status]}`}>{STATUSES.find((s) => s.value === p.status)?.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[p.priority]}`}>{PRIORITIES.find((s) => s.value === p.priority)?.label}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {p.client && <span>{p.client}</span>}
                        {p.end_date && <span>Livraison : {new Date(p.end_date).toLocaleDateString("fr-FR")}</span>}
                        {p.budget && <span>Budget : {p.budget.toLocaleString("fr-FR")} FCFA</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Modifier"><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteProject.mutate(p.id)} disabled={deleteProject.isPending} title="Supprimer"><Trash2 className="size-4" /></Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckSquare className="size-4 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tâches</span>
                      </div>
                      {projectTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground mb-2">Aucune tâche.</p>
                      ) : (
                        <ul className="mb-3 space-y-1.5">
                          {projectTasks.map((t) => (
                            <li key={t.id} className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2">
                              <Select value={t.status} onValueChange={(v) => updateTaskStatus.mutate({ taskId: t.id, status: v, projectId: p.id })}>
                                <SelectTrigger className="h-6 w-[110px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <span className="flex-1 text-sm">{t.title}</span>
                              {t.due_date && <span className="text-xs text-muted-foreground">{new Date(t.due_date).toLocaleDateString("fr-FR")}</span>}
                              <button onClick={() => deleteTask.mutate({ taskId: t.id, projectId: p.id })} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
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
                        <button onClick={() => setAddingTask(p.id)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <Plus className="size-3.5" /> Ajouter une tâche
                        </button>
                      )}
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
