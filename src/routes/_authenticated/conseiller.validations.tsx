import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Loader2, FileText, Download, CheckCircle2, XCircle, Archive, Clock,
  GraduationCap, FolderCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "./etudiant.documents";

export const Route = createFileRoute("/_authenticated/conseiller/validations")({
  component: Validations,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const DIPLOMA_LABELS: Record<string, string> = {
  bac: "Baccalauréat (BAC)", bts: "BTS", dts: "DTS",
  licence_gen: "Licence Générale", licence_pro: "Licence Professionnelle",
  master_pro: "Master Professionnel", master_rec: "Master Recherche",
  master_sp: "Master Spécialisé", deug: "DEUG / DEUST",
  doctorat: "Doctorat", autre: "Autre diplôme",
};

export function Validations() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rejections, setRejections] = useState<Record<string, string>>({});
  const [showArchive, setShowArchive] = useState(false);
  const [view, setView] = useState<"documents" | "dossiers" | "parcours">("dossiers");
  const [fraisRecus, setFraisRecus] = useState<Record<string, boolean>>({});

  /* ── Documents ── */
  const { data: docs = [], isLoading: docsLoading } = useQuery({
    enabled: !!uid && view === "documents",
    queryKey: ["docs", showArchive],
    queryFn: async () => {
      let q = supabase
        .from("documents")
        .select("*")
        .order("uploaded_at", { ascending: false });
      q = showArchive
        ? q.in("status", ["valide", "rejete"] as const)
        : q.eq("status", "en_attente");
      const { data, error } = await q;
      if (error) throw error;
      const sids = [...new Set(data.map((d) => d.student_id))];
      if (!sids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, photo_url")
        .in("id", sids);
      return data.map((d) => ({ ...d, profile: profs?.find((p) => p.id === d.student_id) }));
    },
  });

  const docsByStudent = useMemo(() => {
    const map = new Map<string, { profile?: typeof docs[number]["profile"]; items: typeof docs }>();
    for (const d of docs) {
      const key = d.student_id;
      if (!map.has(key)) map.set(key, { profile: d.profile, items: [] });
      map.get(key)!.items.push(d);
    }
    return [...map.values()];
  }, [docs]);

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "valide" | "rejete" }) => {
      const { error } = await supabase
        .from("documents")
        .update({ status, notes: notes[id] || null, reviewed_by: uid!, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Document traité"); qc.invalidateQueries({ queryKey: ["docs"] }); },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const download = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Lien indisponible");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  /* ── Dossiers ── */
  const { data: dossiers = [], isLoading: dossiersLoading } = useQuery({
    enabled: !!uid && view === "dossiers",
    queryKey: ["pending-dossiers", showArchive],
    queryFn: async () => {
      const statuses = showArchive ? ["valide", "refuse"] : ["soumis"];
      const { data, error } = await supabase
        .from("student_applications")
        .select("*")
        .in("status", statuses)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data.length) return [];

      const studentIds = [...new Set(data.map((a) => a.student_id))];
      const programIds = [...new Set(data.map((a) => a.program_id))];
      const schoolIds = [...new Set(data.map((a) => a.school_id))];

      const [profiles, programs, schools] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone").in("id", studentIds),
        supabase.from("school_programs").select("id, name, level, domain").in("id", programIds),
        supabase.from("schools").select("id, name").in("id", schoolIds),
      ]);

      return studentIds.map((sid) => ({
        student: profiles.data?.find((p) => p.id === sid),
        apps: data
          .filter((a) => a.student_id === sid)
          .map((a) => ({
            ...a,
            program: programs.data?.find((p) => p.id === a.program_id),
            school: schools.data?.find((s) => s.id === a.school_id),
          })),
      }));
    },
  });

  const reviewDossier = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: "valide" | "refuse" }) => {
      const { data: updated, error } = await supabase
        .from("student_applications")
        .update({ status, frais_inscription_recus: !!fraisRecus[studentId] })
        .eq("student_id", studentId)
        .eq("status", "soumis")
        .select();
      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error("Aucune candidature mise à jour. Il manque probablement une politique RLS UPDATE sur student_applications — exécutez le SQL fourni dans Supabase.");
      }
      return updated;
    },
    onSuccess: (_, { status }) => {
      toast.success(status === "valide" ? "Dossier validé — visible par l'école" : "Dossier refusé");
      qc.invalidateQueries({ queryKey: ["pending-dossiers"] });
      qc.invalidateQueries({ queryKey: ["ecole-applications"] });
      qc.invalidateQueries({ queryKey: ["ecole-pending-count"] });
    },
    onError: (e: Error) => toast.error("Erreur de validation", { description: e.message }),
  });

  /* ── Parcours scolaire (academic_records) ── */
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    enabled: !!uid && view === "parcours",
    queryKey: ["pending-records", showArchive],
    queryFn: async () => {
      const statuses = showArchive ? ["valide", "rejete"] : ["en_attente"];
      const { data, error } = await db
        .from("academic_records")
        .select("*")
        .in("status", statuses)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || !data.length) return [];
      const sids: string[] = Array.from(new Set(data.map((r: { student_id: string }) => r.student_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, photo_url")
        .in("id", sids);
      type Rec = { student_id: string; [k: string]: unknown };
      const grouped = new Map<string, { profile: typeof profs extends (infer P)[] | null | undefined ? P : never; items: Rec[] }>();
      for (const r of (data as Rec[])) {
        if (!grouped.has(r.student_id))
          grouped.set(r.student_id, { profile: profs?.find(p => p.id === r.student_id), items: [] } as never);
        grouped.get(r.student_id)!.items.push(r);
      }
      return [...grouped.values()];
    },
  });

  const reviewRecord = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "valide" | "rejete" }) => {
      const { error } = await db
        .from("academic_records")
        .update({ status, rejection_reason: status === "rejete" ? (rejections[id] || null) : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diplôme traité");
      qc.invalidateQueries({ queryKey: ["pending-records"] });
      qc.invalidateQueries({ queryKey: ["academic-records"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const downloadJustif = async (path: string) => {
    const { data, error } = await supabase.storage.from("student-documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Lien indisponible");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const isLoading = view === "documents" ? docsLoading : view === "parcours" ? recordsLoading : dossiersLoading;

  return (
    <>
      <PageHeader
        eyebrow="Validations"
        title={view === "documents" ? "Documents" : "Dossiers de candidature"}
        description={
          view === "documents"
            ? "Validez ou rejetez les documents téléversés par les étudiants."
            : "Examinez et validez les dossiers soumis par les étudiants."
        }
      />

      {/* Onglets Dossiers / Documents / Parcours */}
      <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/40 p-1 text-sm">
        <button
          type="button"
          onClick={() => { setView("dossiers"); setShowArchive(false); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${
            view === "dossiers" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          <FolderCheck className="size-3.5" /> Dossiers
        </button>
        <button
          type="button"
          onClick={() => { setView("documents"); setShowArchive(false); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${
            view === "documents" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          <FileText className="size-3.5" /> Documents
        </button>
        <button
          type="button"
          onClick={() => { setView("parcours"); setShowArchive(false); }}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium transition ${
            view === "parcours" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          <GraduationCap className="size-3.5" /> Parcours
        </button>
      </div>

      {/* Sous-onglets En attente / Archives */}
      <div className="mb-4 ml-4 inline-flex rounded-lg border border-border bg-muted/40 p-1 text-sm">
        <button
          type="button"
          onClick={() => setShowArchive(false)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
            !showArchive ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Clock className="size-3.5" /> En attente
        </button>
        <button
          type="button"
          onClick={() => setShowArchive(true)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition ${
            showArchive ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Archive className="size-3.5" /> Traités
        </button>
      </div>

      {/* ── Vue Documents ── */}
      {view === "documents" && (
        <Panel title={`${docs.length} document${docs.length > 1 ? "s" : ""} ${showArchive ? "traité" + (docs.length > 1 ? "s" : "") : "à examiner"}`}>
          {isLoading ? (
            <Loader2 className="mx-auto size-5 animate-spin text-primary" />
          ) : docs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {showArchive ? "Aucun document archivé." : "Aucun document en attente."}
            </div>
          ) : (
            <ul className="space-y-5">
              {docsByStudent.map((g, i) => (
                <li key={g.profile?.id ?? i} className="rounded-xl border border-border p-4">
                  {/* En-tête étudiant */}
                  <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
                    {g.profile?.photo_url ? (
                      <img
                        src={g.profile.photo_url}
                        alt={g.profile.full_name ?? ""}
                        className="size-9 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <GraduationCap className="size-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm">{g.profile?.full_name || g.profile?.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.items.length} document{g.items.length > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Documents de l'étudiant */}
                  <ul className="space-y-3">
                    {g.items.map((d) => (
                      <li key={d.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-start gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <FileText className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">{d.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <StatusBadge status={d.status} />
                              <span className="text-xs text-muted-foreground">
                                {new Date(d.uploaded_at).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            {showArchive && d.notes && (
                              <div className="mt-1 text-xs text-muted-foreground italic">Note : {d.notes}</div>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" className="shrink-0" onClick={() => download(d.storage_path, d.name)}>
                            <Download className="size-4" />
                          </Button>
                        </div>
                        {!showArchive && (
                          <>
                            <Textarea
                              rows={2}
                              className="mt-3"
                              placeholder="Note (facultatif, visible par l'étudiant)"
                              value={notes[d.id] || ""}
                              onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                            />
                            <div className="mt-3 flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => review.mutate({ id: d.id, status: "rejete" })} disabled={review.isPending}>
                                <XCircle className="mr-1 size-4 text-destructive" /> Rejeter
                              </Button>
                              <Button size="sm" onClick={() => review.mutate({ id: d.id, status: "valide" })} disabled={review.isPending}>
                                <CheckCircle2 className="mr-1 size-4" /> Valider
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* ── Vue Parcours scolaire ── */}
      {view === "parcours" && (
        <Panel title={`${records.length} diplôme${records.length > 1 ? "s" : ""} ${showArchive ? "traité" + (records.length > 1 ? "s" : "") : "à examiner"}`}>
          {isLoading ? (
            <Loader2 className="mx-auto size-5 animate-spin text-primary" />
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {showArchive ? "Aucun diplôme archivé." : "Aucun diplôme en attente de vérification."}
            </div>
          ) : (
            <ul className="space-y-5">
              {records.map((g, i) => (
                <li key={(g.profile as { id?: string } | undefined)?.id ?? i} className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
                    {(g.profile as { photo_url?: string | null } | undefined)?.photo_url ? (
                      <img
                        src={(g.profile as { photo_url: string }).photo_url}
                        alt={(g.profile as { full_name?: string }).full_name ?? ""}
                        className="size-9 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <GraduationCap className="size-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm">
                        {(g.profile as { full_name?: string; email?: string } | undefined)?.full_name
                          || (g.profile as { email?: string } | undefined)?.email || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(g.items as unknown[]).length} diplôme{(g.items as unknown[]).length > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {(g.items as Record<string, unknown>[]).map((rec) => (
                      <li key={rec.id as string} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <GraduationCap className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">
                              {DIPLOMA_LABELS[rec.diploma_type as string] ?? rec.diploma_type as string}
                              {rec.diploma_name ? ` — ${rec.diploma_name}` : ""}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {rec.school_name as string}
                              {rec.school_city ? `, ${rec.school_city as string}` : ""}
                              {rec.school_country ? ` (${rec.school_country as string})` : ""}
                              {rec.year ? ` · ${rec.year as number}` : ""}
                              {rec.mention ? ` · ${rec.mention as string}` : ""}
                              {rec.average ? ` · Moy. ${rec.average as string}` : ""}
                            </div>
                          </div>
                          {!!(rec.justificatif_path as string | null) && (
                            <Button
                              size="sm" variant="ghost"
                              className="shrink-0 text-xs gap-1"
                              onClick={() => downloadJustif(rec.justificatif_path as string)}
                            >
                              <Download className="size-3" /> Justificatif
                            </Button>
                          )}
                        </div>
                        {!showArchive && (
                          <>
                            <Textarea
                              rows={2}
                              className="mt-3"
                              placeholder="Motif de rejet (facultatif)"
                              value={rejections[rec.id as string] || ""}
                              onChange={(e) => setRejections(r => ({ ...r, [rec.id as string]: e.target.value }))}
                            />
                            <div className="mt-3 flex justify-end gap-2">
                              <Button
                                size="sm" variant="outline"
                                disabled={reviewRecord.isPending}
                                onClick={() => reviewRecord.mutate({ id: rec.id as string, status: "rejete" })}
                              >
                                <XCircle className="mr-1 size-4 text-destructive" /> Rejeter
                              </Button>
                              <Button
                                size="sm"
                                disabled={reviewRecord.isPending}
                                onClick={() => reviewRecord.mutate({ id: rec.id as string, status: "valide" })}
                              >
                                <CheckCircle2 className="mr-1 size-4" /> Valider
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* ── Vue Dossiers ── */}
      {view === "dossiers" && (
        <Panel title={`${dossiers.length} dossier${dossiers.length > 1 ? "s" : ""} ${showArchive ? "traité" + (dossiers.length > 1 ? "s" : "") : "à examiner"}`}>
          {isLoading ? (
            <Loader2 className="mx-auto size-5 animate-spin text-primary" />
          ) : dossiers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {showArchive ? "Aucun dossier traité." : "Aucun dossier en attente de validation."}
            </div>
          ) : (
            <ul className="space-y-4">
              {dossiers.map((d, i) => (
                <li key={d.student?.id ?? i} className="rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <GraduationCap className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{d.student?.full_name || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.student?.email}</div>
                      <ul className="mt-2 space-y-1.5">
                        {d.apps.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className="size-1.5 rounded-full bg-primary/40 shrink-0" />
                            <span className="font-medium">{a.program?.name ?? "—"}</span>
                            {a.program?.level && <span className="text-xs text-muted-foreground">{a.program.level}</span>}
                            <span className="text-xs text-muted-foreground">{a.school?.name}</span>
                            {showArchive && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                a.status === "valide" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {a.status === "valide" ? "Validé" : "Refusé"}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {!showArchive && (
                    <>
                      {/* Checkbox frais d'inscription */}
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`frais-${d.student?.id}`}
                          checked={!!fraisRecus[d.student?.id ?? ""]}
                          onChange={(e) =>
                            setFraisRecus((prev) => ({
                              ...prev,
                              [d.student?.id ?? ""]: e.target.checked,
                            }))
                          }
                          className="size-4 rounded border-border"
                        />
                        <label htmlFor={`frais-${d.student?.id}`} className="text-sm text-muted-foreground cursor-pointer">
                          Frais d'inscription reçus
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={reviewDossier.isPending}
                          onClick={() => reviewDossier.mutate({ studentId: d.student!.id, status: "refuse" })}
                        >
                          <XCircle className="mr-1 size-4" /> Refuser
                        </Button>
                        <Button
                          size="sm"
                          disabled={reviewDossier.isPending}
                          onClick={() => reviewDossier.mutate({ studentId: d.student!.id, status: "valide" })}
                        >
                          <CheckCircle2 className="mr-1 size-4" /> Valider
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}
