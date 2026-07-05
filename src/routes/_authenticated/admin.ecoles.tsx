import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Globe, School, Download } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { PARTNER_SCHOOLS } from "@/data/partner-schools";
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

export const Route = createFileRoute("/_authenticated/admin/ecoles")({
  component: AdminEcoles,
});

type School = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  is_active: boolean;
};

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
  is_active: boolean;
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
const LEVELS = ["Classe prépa", "Technicien", "Technicien Spécialisé", "Bachelor", "Licence (Bac+3)", "Master (Bac+5)", "Doctorat (Bac+8)", "BTS (Bac+2)", "MBA", "Mastère spécialisé"];
const LANGUAGES = ["Français", "Anglais", "Bilingue (Fr/En)", "Espagnol", "Autre"];

const EMPTY_SCHOOL: Omit<School, "id" | "is_active"> = {
  name: "", logo_url: "", address: "", city: "", country: "",
  website: "", email: "", phone: "", description: "",
};
const EMPTY_PROGRAM = {
  name: "", description: "", domain: "", level: "", duration: "",
  language: "Français", tuition_fee: "" as string | number, requirements: "",
};

function AdminEcoles() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const [importing, setImporting] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [schoolDialog, setSchoolDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolForm, setSchoolForm] = useState<typeof EMPTY_SCHOOL>({ ...EMPTY_SCHOOL });

  const [programDialog, setProgramDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [pendingDeleteSchool, setPendingDeleteSchool] = useState<string | null>(null);
  const [pendingDeleteProgram, setPendingDeleteProgram] = useState<{ id: string; schoolId: string } | null>(null);
  const [programForm, setProgramForm] = useState<typeof EMPTY_PROGRAM>({ ...EMPTY_PROGRAM });

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("*").order("name");
      if (error) throw error;
      return data as School[];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-programs", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_programs")
        .select("*")
        .eq("school_id", expandedId!)
        .order("name");
      if (error) throw error;
      return data as Program[];
    },
  });

  const saveSchool = useMutation({
    mutationFn: async (form: typeof EMPTY_SCHOOL & { id?: string }) => {
      const payload = {
        name: form.name,
        logo_url: form.logo_url || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        website: form.website || null,
        email: form.email || null,
        phone: form.phone || null,
        description: form.description || null,
        created_by: uid,
      };
      if (form.id) {
        const { error } = await supabase.from("schools").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("schools").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingSchool ? "École mise à jour" : "École ajoutée");
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
      setSchoolDialog(false);
      setEditingSchool(null);
      setSchoolForm({ ...EMPTY_SCHOOL });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteSchool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("École supprimée");
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const saveProgram = useMutation({
    mutationFn: async (form: typeof EMPTY_PROGRAM & { id?: string; school_id: string }) => {
      const payload = {
        school_id: form.school_id,
        name: form.name,
        description: form.description || null,
        domain: form.domain || null,
        level: form.level || null,
        duration: form.duration || null,
        language: form.language || null,
        tuition_fee: form.tuition_fee ? Number(form.tuition_fee) : null,
        requirements: form.requirements || null,
      };
      if (form.id) {
        const { error } = await supabase.from("school_programs").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("school_programs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProgram ? "Formation mise à jour" : "Formation ajoutée");
      qc.invalidateQueries({ queryKey: ["admin-programs", activeSchoolId] });
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
      qc.invalidateQueries({ queryKey: ["admin-programs", activeSchoolId] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  async function importPartners() {
    if (importing) return;
    setImporting(true);
    let schoolsAdded = 0;
    let programsAdded = 0;
    try {
      for (const seed of PARTNER_SCHOOLS) {
        const { data: existing } = await supabase
          .from("schools")
          .select("id")
          .eq("name", seed.name)
          .maybeSingle();

        let schoolId: string;
        if (existing) {
          schoolId = existing.id;
        } else {
          const { data: inserted, error } = await supabase
            .from("schools")
            .insert({
              name: seed.name,
              logo_url: seed.logo_url ?? null,
              address: seed.address ?? null,
              city: seed.city ?? null,
              country: seed.country ?? null,
              website: seed.website ?? null,
              email: seed.email ?? null,
              phone: seed.phone ?? null,
              description: seed.description ?? null,
              created_by: uid,
            })
            .select("id")
            .single();
          if (error) throw error;
          schoolId = inserted.id;
          schoolsAdded++;
        }

        for (const prog of seed.programs) {
          const { data: existingProg } = await supabase
            .from("school_programs")
            .select("id")
            .eq("school_id", schoolId)
            .eq("name", prog.name)
            .maybeSingle();

          if (!existingProg) {
            const { error } = await supabase.from("school_programs").insert({
              school_id: schoolId,
              name: prog.name,
              description: prog.description ?? null,
              domain: prog.domain ?? null,
              level: prog.level ?? null,
              duration: prog.duration ?? null,
              language: prog.language ?? "Français",
              requirements: prog.requirements ?? null,
            });
            if (error) throw error;
            programsAdded++;
          }
        }
      }
      toast.success("Import terminé", {
        description: `${schoolsAdded} école${schoolsAdded > 1 ? "s" : ""} et ${programsAdded} formation${programsAdded > 1 ? "s" : ""} ajoutées.`,
      });
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
    } catch (e: unknown) {
      toast.error("Erreur lors de l'import", { description: (e as Error).message });
    } finally {
      setImporting(false);
    }
  }

  function openAddSchool() {
    setEditingSchool(null);
    setSchoolForm({ ...EMPTY_SCHOOL });
    setSchoolDialog(true);
  }

  function openEditSchool(s: School) {
    setEditingSchool(s);
    setSchoolForm({
      name: s.name, logo_url: s.logo_url ?? "", address: s.address ?? "",
      city: s.city ?? "", country: s.country ?? "", website: s.website ?? "",
      email: s.email ?? "", phone: s.phone ?? "", description: s.description ?? "",
    });
    setSchoolDialog(true);
  }

  function openAddProgram(schoolId: string) {
    setEditingProgram(null);
    setActiveSchoolId(schoolId);
    setProgramForm({ ...EMPTY_PROGRAM });
    setProgramDialog(true);
  }

  function openEditProgram(p: Program) {
    setEditingProgram(p);
    setActiveSchoolId(p.school_id);
    setProgramForm({
      name: p.name, description: p.description ?? "", domain: p.domain ?? "",
      level: p.level ?? "", duration: p.duration ?? "", language: p.language ?? "Français",
      tuition_fee: p.tuition_fee ?? "", requirements: p.requirements ?? "",
    });
    setProgramDialog(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Gestion des écoles"
        description="Gérez les établissements partenaires et leurs formations."
      />

      <Panel
        title={`${schools.length} établissement${schools.length > 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={importPartners}
              disabled={importing}
              title="Importer les écoles partenaires Rézo Campus"
            >
              {importing ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Download className="mr-1 size-4" />
              )}
              {importing ? "Import en cours…" : "Importer les partenaires"}
            </Button>
            <Button size="sm" onClick={openAddSchool}>
              <Plus className="mr-1 size-4" /> Ajouter une école
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : schools.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun établissement partenaire. Ajoutez-en un pour commencer.
          </div>
        ) : (
          <ul className="space-y-2">
            {schools.map((s) => {
              const isExpanded = expandedId === s.id;
              const schoolPrograms = isExpanded ? programs : [];
              return (
                <li key={s.id} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="size-10 rounded-lg object-contain border border-border" />
                    ) : (
                      <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <School className="size-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[s.city, s.country].filter(Boolean).join(", ")}
                        {s.website && (
                          <span className="ml-2 inline-flex items-center gap-0.5">
                            <Globe className="size-3" />
                            {s.website}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEditSchool(s)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setPendingDeleteSchool(s.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold">
                          Formations ({schoolPrograms.length})
                        </h4>
                        <Button size="sm" variant="outline" onClick={() => openAddProgram(s.id)}>
                          <Plus className="mr-1 size-3" /> Ajouter une formation
                        </Button>
                      </div>
                      {schoolPrograms.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune formation enregistrée.</p>
                      ) : (
                        <ul className="space-y-2">
                          {schoolPrograms.map((p) => (
                            <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
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
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button size="sm" variant="ghost" onClick={() => openEditProgram(p)}>
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setPendingDeleteProgram({ id: p.id, schoolId: p.school_id })}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* School Dialog */}
      <Dialog open={schoolDialog} onOpenChange={setSchoolDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSchool ? "Modifier l'école" : "Ajouter une école"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom de l'établissement *</Label>
              <Input value={schoolForm.name} onChange={(e) => setSchoolForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom de l'école" />
            </div>
            <div className="grid gap-2">
              <Label>URL du logo</Label>
              <Input value={schoolForm.logo_url ?? ""} onChange={(e) => setSchoolForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Ville</Label>
                <Input value={schoolForm.city ?? ""} onChange={(e) => setSchoolForm((f) => ({ ...f, city: e.target.value }))} placeholder="Paris" />
              </div>
              <div className="grid gap-2">
                <Label>Pays</Label>
                <Input value={schoolForm.country ?? ""} onChange={(e) => setSchoolForm((f) => ({ ...f, country: e.target.value }))} placeholder="France" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Adresse</Label>
              <Input value={schoolForm.address ?? ""} onChange={(e) => setSchoolForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 rue de l'École" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={schoolForm.email ?? ""} onChange={(e) => setSchoolForm((f) => ({ ...f, email: e.target.value }))} placeholder="contact@ecole.fr" />
              </div>
              <div className="grid gap-2">
                <Label>Téléphone</Label>
                <Input value={schoolForm.phone ?? ""} onChange={(e) => setSchoolForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+33 1 23 45 67 89" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Site web</Label>
              <Input value={schoolForm.website ?? ""} onChange={(e) => setSchoolForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://ecole.fr" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea rows={3} value={schoolForm.description ?? ""} onChange={(e) => setSchoolForm((f) => ({ ...f, description: e.target.value }))} placeholder="Présentation de l'établissement..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchoolDialog(false)}>Annuler</Button>
            <Button
              disabled={!schoolForm.name || saveSchool.isPending}
              onClick={() => saveSchool.mutate({ ...schoolForm, ...(editingSchool ? { id: editingSchool.id } : {}) })}
            >
              {saveSchool.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingSchool ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              disabled={!programForm.name || !activeSchoolId || saveProgram.isPending}
              onClick={() =>
                saveProgram.mutate({
                  ...programForm,
                  school_id: activeSchoolId!,
                  ...(editingProgram ? { id: editingProgram.id } : {}),
                })
              }
            >
              {saveProgram.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingProgram ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteSchool !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteSchool(null); }}
        title="Supprimer cet établissement ?"
        description="L'établissement et toutes ses formations seront définitivement supprimés."
        onConfirm={() => {
          if (pendingDeleteSchool) deleteSchool.mutate(pendingDeleteSchool);
          setPendingDeleteSchool(null);
        }}
        loading={deleteSchool.isPending}
      />

      <ConfirmDialog
        open={pendingDeleteProgram !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteProgram(null); }}
        title="Supprimer cette formation ?"
        description="Cette formation sera définitivement supprimée de l'établissement."
        onConfirm={() => {
          if (pendingDeleteProgram) {
            setActiveSchoolId(pendingDeleteProgram.schoolId);
            deleteProgram.mutate(pendingDeleteProgram.id);
          }
          setPendingDeleteProgram(null);
        }}
        loading={deleteProgram.isPending}
      />
    </>
  );
}
