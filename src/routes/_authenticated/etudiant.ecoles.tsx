import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, School, ChevronDown, ChevronRight, Check, Plus, Globe, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/ecoles")({
  component: EtudiantEcoles,
});

type SchoolType = {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
};

type ProgramType = {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  domain: string | null;
  level: string | null;
  duration: string | null;
  language: string | null;
  tuition_fee: number | null;
};

function EtudiantEcoles() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["student-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as SchoolType[];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["school-programs", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_programs")
        .select("*")
        .eq("school_id", expandedId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as ProgramType[];
    },
  });

  const { data: myApplications = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["my-applications", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_applications")
        .select("program_id")
        .eq("student_id", uid!);
      if (error) throw error;
      return data.map((a) => a.program_id);
    },
  });

  const addToCart = useMutation({
    mutationFn: async ({ programId, schoolId }: { programId: string; schoolId: string }) => {
      const { error } = await supabase.from("student_applications").insert({
        student_id: uid!,
        program_id: programId,
        school_id: schoolId,
        status: "selection",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formation ajoutée à vos candidatures");
      qc.invalidateQueries({ queryKey: ["my-applications", uid] });
      qc.invalidateQueries({ queryKey: ["my-candidatures", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

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
        description="Parcourez nos établissements partenaires et ajoutez des formations à votre panier de candidatures."
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
            return (
              <div key={s.id} className="rounded-xl border border-border overflow-hidden bg-card">
                <button
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                >
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      className="size-14 rounded-xl object-contain border border-border bg-white p-1"
                    />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-border">
                      <School className="size-7" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base">{s.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {[s.city, s.country].filter(Boolean).join(", ")}
                    </div>
                    {s.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {s.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />{s.email}
                        </span>
                      )}
                      {s.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />{s.phone}
                        </span>
                      )}
                      {s.website && (
                        <span className="flex items-center gap-1">
                          <Globe className="size-3" />{s.website}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    <h4 className="mb-3 text-sm font-semibold">
                      Formations proposées ({schoolPrograms.length})
                    </h4>
                    {schoolPrograms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune formation disponible pour cet établissement.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {schoolPrograms.map((p) => {
                          const inCart = myApplications.includes(p.id);
                          return (
                            <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm">{p.name}</div>
                                  {p.description && (
                                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {p.domain && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">{p.domain}</span>
                                )}
                                {p.level && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{p.level}</span>
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
                                  <><Check className="mr-1.5 size-3.5" /> Dans mes candidatures</>
                                ) : (
                                  <><Plus className="mr-1.5 size-3.5" /> Ajouter au panier</>
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
            );
          })}
        </div>
      )}
    </>
  );
}
