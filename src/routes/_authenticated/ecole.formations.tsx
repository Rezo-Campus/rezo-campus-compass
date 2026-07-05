import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Loader2, Plus, Pencil, Trash2, School, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

const DOMAINS = [
  "Administration & Support",
  "Administration des Affaires",
  "Agriculture",
  "Architecture",
  "Arts & Design",
  "Assistanat de Direction",
  "Audit & Contrôle de Gestion",
  "Audiovisuel",
  "Autre",
  "Banque & Assurance",
  "BTP & Génie Civil",
  "Beauté & Esthétique",
  "Climatisation & Froid",
  "Commerce & Gestion",
  "Communication & Médias",
  "Community Management",
  "Comptabilité & Finance",
  "Coiffure",
  "Cuisine & Pâtisserie",
  "Cybersécurité",
  "Développement Personnel",
  "Développement Web & Mobile",
  "Design Graphique",
  "Diplomatie",
  "Droit",
  "Éducation",
  "Électricité",
  "Électronique",
  "Élevage",
  "Énergie",
  "Environnement & Développement Durable",
  "Entrepreneuriat",
  "Formation des Enseignants",
  "Gestion des Entreprises",
  "Gestion de Projet",
  "Import-Export",
  "Ingénierie & Technologie",
  "Informatique",
  "Intelligence Artificielle & Data Science",
  "Langues Étrangères",
  "Leadership",
  "Lettres",
  "Logistique & Supply Chain",
  "Logistique & Transport",
  "Maintenance Industrielle",
  "Management",
  "Marketing",
  "Marketing Digital",
  "Médecine",
  "Mécanique",
  "Mode & Stylisme",
  "Musique",
  "Nutrition",
  "Petite Enfance",
  "Pharmacie",
  "Photographie",
  "Plomberie",
  "Psychologie",
  "Réseaux & Télécommunications",
  "Relations Internationales",
  "Ressources Humaines",
  "Restauration",
  "Santé",
  "Sciences",
  "Sciences Humaines",
  "Sciences Politiques",
  "Secrétariat & Bureautique",
  "Sécurité & Défense",
  "Service Client & Relation Client",
  "Soudure",
  "Sport & Éducation Physique",
  "Support Administratif",
  "Tourisme & Hôtellerie",
  "Traduction & Interprétation",
  "Transport & Transit",
  "Vente & Négociation Commerciale"
];
const LEVELS = ["Classe prépa", "Technicien", "Technicien Spécialisé", "Bachelor", "Licence (Bac+3)", "Master (Bac+5)", "Doctorat (Bac+8)", "BTS (Bac+2)", "MBA", "Mastère spécialisé",];
const LANGUAGES = ["Français", "Anglais", "Bilingue (Fr/En)", "Espagnol", "Autre"];

const DOMAIN_COLOR: Record<string, string> = {
  "Informatique":              "bg-blue-50   border-blue-200   text-blue-800",
  "Sciences":                  "bg-emerald-50 border-emerald-200 text-emerald-800",
  "Ingénierie & Technologie":  "bg-orange-50  border-orange-200  text-orange-800",
  "Commerce & Gestion":        "bg-amber-50   border-amber-200   text-amber-800",
  "Droit":                     "bg-violet-50  border-violet-200  text-violet-800",
  "Santé":                     "bg-rose-50    border-rose-200    text-rose-800",
  "Arts & Design":             "bg-pink-50    border-pink-200    text-pink-800",
  "Sciences Humaines":         "bg-teal-50    border-teal-200    text-teal-800",
  "Éducation":                 "bg-lime-50    border-lime-200    text-lime-800",
  "Lettres":                   "bg-cyan-50    border-cyan-200    text-cyan-800",
  "Autre":                     "bg-slate-50   border-slate-200   text-slate-800",
  "Sans domaine":              "bg-muted      border-border      text-muted-foreground",
};

const DOMAIN_BADGE: Record<string, string> = {
  "Informatique":              "bg-blue-100   text-blue-700",
  "Sciences":                  "bg-emerald-100 text-emerald-700",
  "Ingénierie & Technologie":  "bg-orange-100  text-orange-700",
  "Commerce & Gestion":        "bg-amber-100   text-amber-700",
  "Droit":                     "bg-violet-100  text-violet-700",
  "Santé":                     "bg-rose-100    text-rose-700",
  "Arts & Design":             "bg-pink-100    text-pink-700",
  "Sciences Humaines":         "bg-teal-100    text-teal-700",
  "Éducation":                 "bg-lime-100    text-lime-700",
  "Lettres":                   "bg-cyan-100    text-cyan-700",
  "Autre":                     "bg-slate-100   text-slate-700",
};

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
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());

  const { data: schoolInfo } = useQuery({
    enabled: !!schoolId,
    queryKey: ["ecole-formations-school", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("id, name, logo_url").eq("id", schoolId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: programs = [], isLoading } = useQuery({
    enabled: !!schoolId,
    queryKey: ["ecole-formations", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_programs").select("*").eq("school_id", schoolId!).order("name");
      if (error) throw error;
      return data as Program[];
    },
  });

  /* ── Regroupement par domaine ── */
  const domainGroups = useMemo(() => {
    const map = new Map<string, Program[]>();
    for (const p of programs) {
      const key = p.domain ?? "Sans domaine";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [programs]);

  function toggleDomain(domain: string) {
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

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
        description="Gérez l'ensemble des formations proposées par votre établissement, classées par domaine."
      />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {programs.length} formation{programs.length > 1 ? "s" : ""} · {domainGroups.length} domaine{domainGroups.length > 1 ? "s" : ""}
        </p>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" /> Ajouter une formation
        </Button>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          <Layers className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          Aucune formation enregistrée. Commencez par en ajouter une.
        </div>
      ) : (
        <div className="space-y-4">
          {domainGroups.map(([domain, progs]) => {
            const isCollapsed = collapsedDomains.has(domain);
            const colorClass = DOMAIN_COLOR[domain] ?? DOMAIN_COLOR["Sans domaine"];
            const badgeClass = DOMAIN_BADGE[domain] ?? "bg-muted text-muted-foreground";

            return (
              <div key={domain} className={`overflow-hidden rounded-xl border ${colorClass}`}>
                {/* ── En-tête domaine ── */}
                <button
                  type="button"
                  onClick={() => toggleDomain(domain)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:brightness-95"
                >
                  <div className={`grid size-9 shrink-0 place-items-center rounded-lg bg-white/60`}>
                    <Layers className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base">{domain}</div>
                    <div className="text-xs opacity-70">
                      {progs.length} formation{progs.length > 1 ? "s" : ""}
                    </div>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="size-5 shrink-0 opacity-50" />
                  ) : (
                    <ChevronDown className="size-5 shrink-0 opacity-50" />
                  )}
                </button>

                {/* ── Liste des formations du domaine ── */}
                {!isCollapsed && (
                  <div className="border-t border-white/40 bg-white/50 px-4 py-3">
                    <ul className="space-y-2">
                      {progs.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 rounded-xl border border-white/70 bg-white px-4 py-3 shadow-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground">{p.name}</div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {p.level && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                  {p.level}
                                </span>
                              )}
                              {p.domain && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                                  {p.domain}
                                </span>
                              )}
                              {p.duration && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {p.duration}
                                </span>
                              )}
                              {p.language && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {p.language}
                                </span>
                              )}
                              {p.tuition_fee != null && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {p.tuition_fee.toLocaleString("fr-FR")} €/an
                                </span>
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Formulaire ── */}
      <Dialog open={programDialog} onOpenChange={setProgramDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgram ? "Modifier la formation" : "Ajouter une formation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom de la formation *</Label>
              <Input
                value={programForm.name}
                onChange={(e) => setProgramForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ex. Master Intelligence Artificielle"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={programForm.description}
                onChange={(e) => setProgramForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brève description de la formation"
              />
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
                <Input
                  value={programForm.duration}
                  onChange={(e) => setProgramForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="ex. 2 ans"
                />
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
              <Input
                type="number"
                min={0}
                value={programForm.tuition_fee}
                onChange={(e) => setProgramForm((f) => ({ ...f, tuition_fee: e.target.value }))}
                placeholder="ex. 8000"
              />
            </div>
            <div className="grid gap-2">
              <Label>Prérequis</Label>
              <Textarea
                rows={2}
                value={programForm.requirements}
                onChange={(e) => setProgramForm((f) => ({ ...f, requirements: e.target.value }))}
                placeholder="Conditions d'admission, diplômes requis..."
              />
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
