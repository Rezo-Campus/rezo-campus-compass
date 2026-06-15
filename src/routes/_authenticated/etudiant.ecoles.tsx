import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, School, ChevronDown, ChevronRight, ChevronLeft,
  Check, Plus, Globe, Mail, Phone, GraduationCap,
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

/* ── Ordre des parcours du plus petit au plus grand ── */
const LEVEL_ORDER = [
  "Technicien",
  "Technicien Spécialisé",
  "BTS",
  "BTS (Bac+2)",
  "BUT",
  "BUT (Bac+3)",
  "Classe prépa",
  "Licence",
  "Licence Pro",
  "Licence (Bac+3)",
  "Bachelor",
  "MBA",
  "Master",
  "Master (Bac+5)",
  "Mastère spécialisé",
  "Doctorat",
  "Doctorat (Bac+8)",
];

const LEVEL_COLOR: Record<string, string> = {
  "Technicien": "bg-slate-100 text-slate-700 border-slate-300",
  "Technicien Spécialisé": "bg-slate-100 text-slate-700 border-slate-300",
  "BTS": "bg-sky-100 text-sky-700 border-sky-300",
  "BTS (Bac+2)": "bg-sky-100 text-sky-700 border-sky-300",
  "BUT": "bg-sky-100 text-sky-700 border-sky-300",
  "BUT (Bac+3)": "bg-sky-100 text-sky-700 border-sky-300",
  "Classe prépa": "bg-violet-100 text-violet-700 border-violet-300",
  "Licence": "bg-blue-100 text-blue-700 border-blue-300",
  "Licence Pro": "bg-blue-100 text-blue-700 border-blue-300",
  "Licence (Bac+3)": "bg-blue-100 text-blue-700 border-blue-300",
  "Bachelor": "bg-blue-100 text-blue-700 border-blue-300",
  "MBA": "bg-amber-100 text-amber-700 border-amber-300",
  "Master": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Master (Bac+5)": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Mastère spécialisé": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Doctorat": "bg-rose-100 text-rose-700 border-rose-300",
  "Doctorat (Bac+8)": "bg-rose-100 text-rose-700 border-rose-300",
};

const DEFAULT_LEVEL_COLOR = "bg-muted text-muted-foreground border-border";

function levelHint(level: string): string {
  const l = level.toLowerCase();
  if (l.startsWith("technicien") && !l.includes("spécialisé") && !l.includes("specialise")) return "Sans baccalauréat";
  if (l.includes("technicien spécialisé") || l.includes("bts") || l.includes("but")) return "Bac requis · Bac+2";
  if (l.includes("classe prépa")) return "Bac requis · Prépa";
  if (l.includes("licence") || l.includes("bachelor")) return "Bac requis · Bac+3";
  if (l === "mba") return "Bac+3 requis · Bac+5";
  if (l.includes("master") || l.includes("mastère")) return "Licence requise · Bac+5";
  if (l.includes("doctorat")) return "Master requis · Bac+8";
  return "";
}

function sortLevels(levels: string[]): string[] {
  return [...levels].sort((a, b) => {
    const ia = LEVEL_ORDER.indexOf(a);
    const ib = LEVEL_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "fr");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

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
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

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

  function handleExpandSchool(schoolId: string) {
    if (expandedId === schoolId) {
      setExpandedId(null);
      setSelectedLevel(null);
    } else {
      setExpandedId(schoolId);
      setSelectedLevel(null);
    }
  }

  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.city ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.country ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        eyebrow="Écoles & formations"
        title="Explorer les établissements"
        description="Choisissez une école, sélectionnez votre parcours puis ajoutez des formations à votre dossier."
      />

      <div className="mb-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une école, ville, pays..."
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {search ? "Aucun établissement ne correspond à votre recherche." : "Aucun établissement partenaire disponible pour le moment."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isExpanded = expandedId === s.id;
            const schoolPrograms = isExpanded ? programs.filter((p) => p.school_id === s.id) : [];
            const availableLevels = sortLevels([...new Set(schoolPrograms.map((p) => p.level ?? "Autre"))]);
            const levelPrograms = selectedLevel
              ? schoolPrograms.filter((p) => (p.level ?? "Autre") === selectedLevel)
              : [];

            return (
              <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-card">

                {/* ── En-tête école ── */}
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

                {/* ── Contenu déplié ── */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/10">

                    {/* ÉTAPE 1 — Choix du parcours */}
                    {!selectedLevel && (
                      <div className="p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                          <p className="text-sm font-semibold">Choisissez votre parcours</p>
                        </div>
                        {availableLevels.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Aucune formation disponible pour cet établissement.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {availableLevels.map((level) => {
                              const count = schoolPrograms.filter((p) => (p.level ?? "Autre") === level).length;
                              const color = LEVEL_COLOR[level] ?? DEFAULT_LEVEL_COLOR;
                              const hint = levelHint(level);
                              return (
                                <button
                                  key={level}
                                  onClick={() => setSelectedLevel(level)}
                                  className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition hover:shadow-md ${color}`}
                                >
                                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/70">
                                    <GraduationCap className="size-5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-sm">{level}</div>
                                    {hint && <div className="text-[10px] opacity-70">{hint}</div>}
                                    <div className="mt-1 text-[11px] font-medium opacity-80">
                                      {count} formation{count > 1 ? "s" : ""}
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

                    {/* ÉTAPE 2 — Formations du parcours */}
                    {selectedLevel && (
                      <div className="p-5">
                        {/* Navigation retour */}
                        <div className="mb-4 flex items-center gap-2">
                          <button
                            onClick={() => setSelectedLevel(null)}
                            className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
                          >
                            <ChevronLeft className="size-3.5" /> Changer de parcours
                          </button>
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${LEVEL_COLOR[selectedLevel] ?? DEFAULT_LEVEL_COLOR}`}>
                            {selectedLevel}
                          </span>
                        </div>

                        <div className="mb-4 flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                          <p className="text-sm font-semibold">
                            Sélectionnez une formation à ajouter à votre dossier
                          </p>
                        </div>

                        {levelPrograms.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Aucune formation pour ce parcours.</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {levelPrograms.map((p) => {
                              const inCart = myApplications.includes(p.id);
                              return (
                                <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
                                  <div>
                                    <div className="font-semibold text-sm">{p.name}</div>
                                    {p.description && (
                                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {p.domain && (
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{p.domain}</span>
                                    )}
                                    {p.duration && (
                                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{p.duration}</span>
                                    )}
                                    {p.language && (
                                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{p.language}</span>
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
  );
}
