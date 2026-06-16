import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, GraduationCap, ChevronDown, ChevronRight, FileText,
  Download, Mail, Phone, User, Search,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/secretaire/etudiants")({
  component: SecretaireEtudiants,
});

const DOC_TYPE_LABELS: Record<string, string> = {
  identite: "Pièce d'identité",
  diplome: "Diplôme",
  releve_notes: "Relevé de notes",
  lettre_motivation: "Lettre de motivation",
  cv: "Curriculum Vitae",
  autre: "Autre document",
};

const DOC_STATUS_COLORS: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-700",
  valide: "bg-green-100 text-green-700",
  rejete: "bg-red-100 text-red-700",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  rejete: "Rejeté",
};

const APP_STATUS_COLORS: Record<string, string> = {
  selection: "bg-gray-100 text-gray-700",
  soumis: "bg-blue-100 text-blue-700",
  valide: "bg-green-100 text-green-700",
  accepte: "bg-emerald-100 text-emerald-700",
  refuse: "bg-red-100 text-red-700",
};

const APP_STATUS_LABELS: Record<string, string> = {
  selection: "En sélection",
  soumis: "Soumis",
  valide: "Validé",
  accepte: "Accepté",
  refuse: "Refusé",
};

function SecretaireEtudiants() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  /* ── Tous les profils étudiants ── */
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["secretaire-students"],
    queryFn: async () => {
      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "etudiant");
      if (roleErr) throw roleErr;

      const studentIds = roleRows.map((r) => r.user_id);
      if (!studentIds.length) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, photo_url")
        .in("id", studentIds)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Dossier de l'étudiant sélectionné ── */
  const { data: dossier, isLoading: dossierLoading } = useQuery({
    enabled: !!expandedId,
    queryKey: ["secretaire-dossier", expandedId],
    queryFn: async () => {
      const [docsRes, appsRes] = await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .eq("student_id", expandedId!)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("student_applications")
          .select("*, school:school_id(name), program:program_id(name, level)")
          .eq("student_id", expandedId!)
          .order("created_at", { ascending: false }),
      ]);
      if (docsRes.error) throw docsRes.error;
      if (appsRes.error) throw appsRes.error;
      return { docs: docsRes.data ?? [], apps: appsRes.data ?? [] };
    },
  });

  async function downloadDoc(path: string) {
    const { data, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 3600);
    if (error || !data) { toast.error("Lien indisponible"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.full_name ?? "").toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader
        eyebrow="Secrétariat"
        title="Profils étudiants"
        description="Consultez les profils et dossiers de tous les étudiants (lecture seule)."
      />

      {/* Recherche */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher par nom ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Panel title={`${filtered.length} étudiant${filtered.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <GraduationCap className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            {search ? "Aucun étudiant correspondant à la recherche." : "Aucun étudiant enregistré."}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => {
              const isExpanded = expandedId === s.id;
              return (
                <li key={s.id} className="rounded-xl border border-border overflow-hidden">
                  {/* En-tête étudiant */}
                  <div className="flex items-center gap-4 p-4">
                    {s.photo_url ? (
                      <img
                        src={s.photo_url}
                        alt={s.full_name ?? ""}
                        className="size-11 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary border border-border">
                        <GraduationCap className="size-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{s.full_name || "—"}</div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                        {s.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3" /> {s.email}
                          </span>
                        )}
                        {s.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" /> {s.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      {isExpanded ? (
                        <><ChevronDown className="size-3.5" /> Masquer</>
                      ) : (
                        <><ChevronRight className="size-3.5" /> Voir le dossier</>
                      )}
                    </button>
                  </div>

                  {/* Dossier étendu */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 p-4 space-y-5">
                      {dossierLoading ? (
                        <Loader2 className="mx-auto size-4 animate-spin text-primary" />
                      ) : (
                        <>
                          {/* Informations personnelles */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Informations personnelles
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                <User className="size-4 shrink-0 text-muted-foreground" />
                                <span>{s.full_name || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                <Mail className="size-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">{s.email || "—"}</span>
                              </div>
                              {s.phone && (
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                                  <span>{s.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Documents */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Documents ({dossier?.docs.length ?? 0})
                            </h4>
                            {!dossier?.docs.length ? (
                              <p className="text-xs text-muted-foreground">Aucun document téléversé.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {dossier.docs.map((d) => (
                                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{d.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {DOC_TYPE_LABELS[d.type] ?? d.type}
                                        {" · "}{new Date(d.uploaded_at).toLocaleDateString("fr-FR")}
                                      </div>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${DOC_STATUS_COLORS[d.status] ?? "bg-muted"}`}>
                                      {DOC_STATUS_LABELS[d.status] ?? d.status}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="shrink-0"
                                      onClick={() => downloadDoc(d.storage_path)}
                                    >
                                      <Download className="size-3.5" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Candidatures */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Candidatures ({dossier?.apps.length ?? 0})
                            </h4>
                            {!dossier?.apps.length ? (
                              <p className="text-xs text-muted-foreground">Aucune candidature.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {dossier.apps.map((a) => (
                                  <li key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium">
                                        {(a.program as { name?: string } | null)?.name ?? "—"}
                                        {(a.program as { level?: string } | null)?.level && (
                                          <span className="ml-1 text-xs text-muted-foreground">
                                            · {(a.program as { level?: string }).level}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {(a.school as { name?: string } | null)?.name ?? "—"}
                                      </div>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${APP_STATUS_COLORS[a.status] ?? "bg-muted"}`}>
                                      {APP_STATUS_LABELS[a.status] ?? a.status}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
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
