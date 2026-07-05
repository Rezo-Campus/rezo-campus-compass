import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Loader2, School, ChevronDown, ChevronRight, ChevronLeft,
  Check, Plus, Globe, Mail, Phone, Layers, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/ecoles")({
  component: EtudiantEcoles,
});

/* ── Couleurs par domaine ── */
const DOMAIN_COLOR: Record<string, string> = {
  "Informatique":             "bg-blue-100   text-blue-700   border-blue-300",
  "Sciences":                 "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Ingénierie & Technologie": "bg-orange-100  text-orange-700  border-orange-300",
  "Commerce & Gestion":       "bg-amber-100   text-amber-700   border-amber-300",
  "Droit":                    "bg-violet-100  text-violet-700  border-violet-300",
  "Santé":                    "bg-rose-100    text-rose-700    border-rose-300",
  "Arts & Design":            "bg-pink-100    text-pink-700    border-pink-300",
  "Sciences Humaines":        "bg-teal-100    text-teal-700    border-teal-300",
  "Éducation":                "bg-lime-100    text-lime-700    border-lime-300",
  "Lettres":                  "bg-cyan-100    text-cyan-700    border-cyan-300",
  "Autre":                    "bg-slate-100   text-slate-700   border-slate-300",
};
const DEFAULT_DOMAIN_COLOR = "bg-muted text-muted-foreground border-border";

const LEVEL_COLOR: Record<string, string> = {
  "BTS":               "bg-sky-100 text-sky-700",
  "BTS (Bac+2)":       "bg-sky-100 text-sky-700",
  "BUT":               "bg-sky-100 text-sky-700",
  "BUT (Bac+3)":       "bg-sky-100 text-sky-700",
  "Classe prépa":      "bg-violet-100 text-violet-700",
  "Licence":           "bg-blue-100 text-blue-700",
  "Licence Pro":       "bg-blue-100 text-blue-700",
  "Licence (Bac+3)":   "bg-blue-100 text-blue-700",
  "Bachelor":          "bg-blue-100 text-blue-700",
  "MBA":               "bg-amber-100 text-amber-700",
  "Master":            "bg-emerald-100 text-emerald-700",
  "Master (Bac+5)":    "bg-emerald-100 text-emerald-700",
  "Mastère spécialisé":"bg-emerald-100 text-emerald-700",
  "Doctorat":          "bg-rose-100 text-rose-700",
  "Doctorat (Bac+8)":  "bg-rose-100 text-rose-700",
};

type SchoolType = {
  id: string; name: string; logo_url: string | null;
  city: string | null; country: string | null;
  website: string | null; email: string | null; phone: string | null;
  description: string | null;
};

type ProgramType = {
  id: string; school_id: string; name: string;
  description: string | null; domain: string | null; level: string | null;
  duration: string | null; language: string | null; tuition_fee: number | null;
};

function EtudiantEcoles() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();

  /* ── Navigation à 3 niveaux : Ville → École → Domaine ── */
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  /* ── Données ── */
  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["student-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data as SchoolType[];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["school-programs", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_programs").select("*")
        .eq("school_id", expandedId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data as ProgramType[];
    },
  });

  const { data: myApplications = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["my-applications", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_applications").select("program_id").eq("student_id", uid!);
      if (error) throw error;
      return data.map((a) => a.program_id);
    },
  });

  /* ── Liste des villes ── */
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const s of schools) {
      if (s.city) set.add(s.city);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [schools]);

  /* ── Écoles de la ville sélectionnée ── */
  const schoolsInCity = useMemo(() => {
    if (!selectedCity) return [];
    return schools.filter((s) => s.city === selectedCity);
  }, [schools, selectedCity]);

  /* ── Filtrage par recherche ── */
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return schoolsInCity;
    const q = schoolSearch.toLowerCase();
    return schoolsInCity.filter((s) => s.name.toLowerCase().includes(q));
  }, [schoolsInCity, schoolSearch]);

  /* ── Domaines de l'école dépliée ── */
  const domainGroups = useMemo(() => {
    const map = new Map<string, ProgramType[]>();
    for (const p of programs) {
      const key = p.domain ?? "Autre";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [programs]);

  /* ── Formations du domaine sélectionné ── */
  const domainPrograms = useMemo(() => {
    if (!selectedDomain) return [];
    return programs.filter((p) => (p.domain ?? "Autre") === selectedDomain);
  }, [programs, selectedDomain]);

  /* ── Mutations ── */
  const addToCart = useMutation({
    mutationFn: async ({ programId, schoolId }: { programId: string; schoolId: string }) => {
      const { error } = await supabase.from("student_applications").insert({
        student_id: uid!, program_id: programId, school_id: schoolId, status: "selection",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formation ajoutée à votre dossier");
      qc.invalidateQueries({ queryKey: ["my-applications", uid] });
      qc.invalidateQueries({ queryKey: ["my-candidatures", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  function handleSelectCity(city: string) {
    setSelectedCity(city);
    setExpandedId(null);
    setSelectedDomain(null);
    setSchoolSearch("");
  }

  function handleBackToCity() {
    setSelectedCity(null);
    setExpandedId(null);
    setSelectedDomain(null);
    setSchoolSearch("");
  }

  function handleExpandSchool(schoolId: string) {
    if (expandedId === schoolId) {
      setExpandedId(null);
      setSelectedDomain(null);
    } else {
      setExpandedId(schoolId);
      setSelectedDomain(null);
    }
  }

  /* ══════════════════════════════════════════════
     RENDU
  ══════════════════════════════════════════════ */

  return (
    <>
      <PageHeader
        eyebrow="Écoles & formations"
        title="Explorer les établissements"
        description="Choisissez une ville, sélectionnez un établissement puis ajoutez des formations à votre dossier."
      />

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : schools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Aucun établissement partenaire disponible pour le moment.
        </div>
      ) : (
        <>
          {/* ── ÉTAPE 1 : Sélection de la ville ── */}
          {!selectedCity && (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                <p className="text-sm font-semibold">Choisissez une ville</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {cities.map((city) => {
                  const count = schools.filter((s) => s.city === city).length;
                  return (
                    <button
                      key={city}
                      onClick={() => handleSelectCity(city)}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                        <MapPin className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{city}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {count} école{count > 1 ? "s" : ""}
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-40 transition group-hover:opacity-80" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── ÉTAPE 2 : Écoles de la ville ── */}
          {selectedCity && (
            <>
              {/* Fil d'Ariane + retour */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBackToCity}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted"
                >
                  <ChevronLeft className="size-4" /> Toutes les villes
                </button>
                <ChevronRight className="size-3.5 text-muted-foreground" />
                <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                  <MapPin className="size-3.5" /> {selectedCity}
                </span>
              </div>

              {/* Étiquette étape */}
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                <p className="text-sm font-semibold">Sélectionnez un établissement</p>
              </div>

              {/* Recherche d'école */}
              <div className="mb-4">
                <Input
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  placeholder={`Rechercher dans les écoles de ${selectedCity}...`}
                  className="max-w-sm"
                />
              </div>

              {filteredSchools.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  Aucun établissement trouvé.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSchools.map((s) => {
                    const isExpanded = expandedId === s.id;

                    return (
                      <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-card">

                        {/* En-tête école */}
                        <button
                          className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-muted/30"
                          onClick={() => handleExpandSchool(s.id)}
                        >
                          {s.logo_url ? (
                            <img src={s.logo_url} alt={s.name}
                              className="size-14 shrink-0 rounded-xl border border-border bg-white object-contain p-1" />
                          ) : (
                            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-primary/10 text-primary">
                              <School className="size-7" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base">{s.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {[s.city, s.country].filter(Boolean).join(", ")}
                            </div>
                            {s.description && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{s.description}</p>
                            )}
                            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {s.email && <span className="flex items-center gap-1"><Mail className="size-3" />{s.email}</span>}
                              {s.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{s.phone}</span>}
                              {s.website && <span className="flex items-center gap-1"><Globe className="size-3" />{s.website}</span>}
                            </div>
                          </div>
                          <div className="shrink-0 text-muted-foreground">
                            {isExpanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                          </div>
                        </button>

                        {/* Contenu déplié */}
                        {isExpanded && (
                          <div className="border-t border-border bg-muted/10">

                            {/* ── ÉTAPE 3 : Choix du domaine ── */}
                            {!selectedDomain && (
                              <div className="p-5">
                                <div className="mb-4 flex items-center gap-2">
                                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                                  <p className="text-sm font-semibold">Choisissez un domaine</p>
                                </div>
                                {domainGroups.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Aucune formation disponible pour cet établissement.</p>
                                ) : (
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {domainGroups.map(([domain, progs]) => {
                                      const color = DOMAIN_COLOR[domain] ?? DEFAULT_DOMAIN_COLOR;
                                      return (
                                        <button
                                          key={domain}
                                          onClick={() => setSelectedDomain(domain)}
                                          className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition hover:shadow-md ${color}`}
                                        >
                                          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/70">
                                            <Layers className="size-5" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="font-bold text-sm">{domain}</div>
                                            <div className="mt-1 text-[11px] font-medium opacity-80">
                                              {progs.length} formation{progs.length > 1 ? "s" : ""}
                                            </div>
                                          </div>
                                          <ChevronRight className="size-4 shrink-0 opacity-40 transition group-hover:opacity-80" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ── ÉTAPE 4 : Formations du domaine ── */}
                            {selectedDomain && (
                              <div className="p-5">
                                {/* Fil d'Ariane domaine */}
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => setSelectedDomain(null)}
                                    className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
                                  >
                                    <ChevronLeft className="size-3.5" /> Changer de domaine
                                  </button>
                                  <ChevronRight className="size-3.5 text-muted-foreground" />
                                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${DOMAIN_COLOR[selectedDomain] ?? DEFAULT_DOMAIN_COLOR}`}>
                                    {selectedDomain}
                                  </span>
                                </div>

                                <div className="mb-4 flex items-center gap-2">
                                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
                                  <p className="text-sm font-semibold">Sélectionnez une formation</p>
                                </div>

                                {domainPrograms.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Aucune formation pour ce domaine.</p>
                                ) : (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {domainPrograms.map((p) => {
                                      const inCart = myApplications.includes(p.id);
                                      const levelColor = LEVEL_COLOR[p.level ?? ""] ?? "bg-muted text-muted-foreground";
                                      return (
                                        <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
                                          <div>
                                            <div className="font-semibold text-sm">{p.name}</div>
                                            {p.description && (
                                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {p.level && (
                                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${levelColor}`}>
                                                {p.level}
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
                                          <Button
                                            size="sm"
                                            variant={inCart ? "outline" : "default"}
                                            className={inCart ? "text-green-600 border-green-300 bg-green-50 hover:bg-green-100" : ""}
                                            disabled={inCart || addToCart.isPending}
                                            onClick={() => !inCart && addToCart.mutate({ programId: p.id, schoolId: s.id })}
                                          >
                                            {inCart ? (
                                              <><Check className="mr-1.5 size-3.5" /> Dans mon dossier</>
                                            ) : (
                                              <><Plus className="mr-1.5 size-3.5" /> Ajouter à mon dossier</>
                                            )}
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
