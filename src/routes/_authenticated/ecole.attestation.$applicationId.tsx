import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Loader2, ArrowLeft, Printer, Upload, CheckCircle2, FileText, Download, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ecole/attestation/$applicationId")({
  component: EcoleAttestation,
});

const ECOLE_DOC_TYPES: { value: string; label: string }[] = [
  { value: "convocation", label: "Convocation" },
  { value: "lettre_admission", label: "Lettre d'admission" },
  { value: "programme_cours", label: "Programme de cours" },
  { value: "attestation_inscription", label: "Attestation d'inscription" },
  { value: "autre", label: "Autre document" },
];

function EcoleAttestation() {
  const { applicationId } = Route.useParams();
  const qc = useQueryClient();
  const cachetInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCachet, setUploadingCachet] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("convocation");

  const { data, isLoading } = useQuery({
    queryKey: ["ecole-attestation", applicationId],
    queryFn: async () => {
      const { data: app, error } = await supabase
        .from("student_applications")
        .select("*, school:school_id(id, name), program:program_id(name, level, domain)")
        .eq("id", applicationId)
        .single();
      if (error) throw error;

      const [profileRes, schoolLogoRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone, photo_url").eq("id", app.student_id).single(),
        app.school_id
          ? supabase.from("schools").select("logo_url, website, city, country").eq("id", app.school_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        app,
        profile: profileRes.data,
        schoolLogo: schoolLogoRes.data,
      };
    },
  });

  const saveCachetUrl = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase
        .from("student_applications")
        .update({ ecole_cachet_url: url })
        .eq("id", applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cachet enregistré");
      qc.invalidateQueries({ queryKey: ["ecole-attestation", applicationId] });
    },
  });

  // Official documents uploaded by école for this student
  const { data: officialDocs = [] } = useQuery({
    queryKey: ["official-docs-ecole", applicationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("official_documents")
        .select("*")
        .eq("application_id", applicationId)
        .eq("source", "ecole")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from("student-documents").remove([path]);
      const { error } = await supabase.from("official_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document supprimé");
      qc.invalidateQueries({ queryKey: ["official-docs-ecole", applicationId] });
    },
  });

  async function uploadOfficialDoc(file: File) {
    if (!data?.app) return;
    setUploadingDoc(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `official/${data.app.student_id}/${applicationId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, file);
      if (upErr) throw upErr;

      const typeLabel = ECOLE_DOC_TYPES.find((t) => t.value === selectedDocType)?.label ?? selectedDocType;
      const { error } = await supabase.from("official_documents").insert({
        student_id: data.app.student_id,
        application_id: applicationId,
        source: "ecole",
        type: selectedDocType,
        name: `${typeLabel} — ${file.name}`,
        storage_path: path,
      });
      if (error) throw error;

      // Notification à l'étudiant
      await supabase.from("notifications").insert({
        user_id: data.app.student_id,
        title: "Nouveau document reçu",
        body: `${typeLabel} a été ajouté à votre dossier par votre établissement.`,
        data: { applicationId, type: "official_doc" },
      });

      toast.success("Document ajouté et étudiant notifié");
      qc.invalidateQueries({ queryKey: ["official-docs-ecole", applicationId] });
    } catch (e: unknown) {
      toast.error("Erreur lors de l'upload", { description: (e as Error).message });
    } finally {
      setUploadingDoc(false);
    }
  }

  async function downloadOfficialDoc(path: string) {
    const { data: urlData, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 3600);
    if (error || !urlData) { toast.error("Lien indisponible"); return; }
    window.open(urlData.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function uploadCachet(file: File) {
    setUploadingCachet(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `caches/${applicationId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("partner-logos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("partner-logos").getPublicUrl(path);
      await saveCachetUrl.mutateAsync(urlData.publicUrl);
    } catch (e: unknown) {
      toast.error("Erreur lors de l'upload", { description: (e as Error).message });
    } finally {
      setUploadingCachet(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.app) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Candidature introuvable.</div>;
  }

  const { app, profile, schoolLogo } = data;
  const school = app.school as { name?: string } | null;
  const program = app.program as { name?: string; level?: string; domain?: string } | null;
  const validatedAt = (app as { ecole_validated_at?: string | null }).ecole_validated_at;
  const cachetUrl = (app as { ecole_cachet_url?: string | null }).ecole_cachet_url;
  const validationDate = validatedAt
    ? new Date(validatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const schoolLogoUrl = schoolLogo?.logo_url ?? null;

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
        }
      `}</style>

      {/* Barre d'action */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/ecole/candidats"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" /> Retour aux candidatures
        </Link>
        <div className="flex items-center gap-2">
          {/* Upload cachet */}
          <input
            ref={cachetInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadCachet(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => cachetInputRef.current?.click()}
            disabled={uploadingCachet}
          >
            {uploadingCachet ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : cachetUrl ? (
              <CheckCircle2 className="mr-2 size-4 text-green-500" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            {cachetUrl ? "Remplacer le cachet/signature" : "Téléverser cachet & signature"}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* ── Documents administratifs envoyés à l'étudiant ── */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 print:hidden">
        <h3 className="mb-3 text-sm font-semibold">Documents administratifs pour l'étudiant</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Téléversez ici les documents que l'étudiant pourra télécharger depuis son espace.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Select value={selectedDocType} onValueChange={setSelectedDocType}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ECOLE_DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadOfficialDoc(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => docInputRef.current?.click()}
            disabled={uploadingDoc}
          >
            {uploadingDoc ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            Téléverser
          </Button>
        </div>

        {officialDocs.length > 0 && (
          <ul className="space-y-1.5">
            {officialDocs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => downloadOfficialDoc(d.storage_path)}>
                  <Download className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteDoc.mutate({ id: d.id, path: d.storage_path })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ═══ ATTESTATION A4 ═══ */}
      <div
        className="mx-auto max-w-[190mm] bg-white text-black print:m-0 print:w-full print:max-w-full print:shadow-none"
        style={{
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
          colorAdjust: "exact",
          padding: "40px 48px",
          fontFamily: '"Times New Roman", Times, serif',
          minHeight: "277mm",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
          position: "relative",
        } as CSSProperties}
      >
        {/* Bandeau de couleur haut */}
        <div style={{ background: "var(--color-primary, #0d6b5b)", height: 8, borderRadius: 4, marginBottom: 32 }} />

        {/* En-tête : logo école à gauche, logo Rézo à droite */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            {schoolLogoUrl ? (
              <img src={schoolLogoUrl} alt={school?.name ?? "École"} style={{ height: 60, objectFit: "contain" }} />
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{school?.name ?? "—"}</div>
            )}
          </div>
          <img src="/1.png" alt="Rézo Campus" style={{ height: 48, objectFit: "contain" }} />
        </div>

        {/* Titre */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#6b7280", marginBottom: 8 }}>
            {school?.name ?? "Établissement partenaire"}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, color: "#111", marginBottom: 6 }}>
            ATTESTATION DE VALIDATION DE CANDIDATURE
          </h1>
          <div style={{ width: 64, height: 3, background: "var(--color-primary, #0d6b5b)", margin: "0 auto" }} />
        </div>

        {/* Corps */}
        <div style={{ fontSize: 13, lineHeight: 1.9, color: "#1f2937" }}>
          <p style={{ marginBottom: 20 }}>
            Nous soussignés, la Direction des Admissions de{" "}
            <strong>{school?.name ?? "l'établissement"}</strong>, certifions par la présente
            avoir reçu et examiné le dossier de candidature de :
          </p>

          {/* Bloc étudiant */}
          <div style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderLeft: "4px solid var(--color-primary, #0d6b5b)",
            borderRadius: 6,
            padding: "16px 20px",
            marginBottom: 24,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ paddingBottom: 6, color: "#6b7280", width: "38%" }}>Nom complet</td>
                  <td style={{ paddingBottom: 6, fontWeight: 600 }}>{profile?.full_name ?? "—"}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: 6, color: "#6b7280" }}>Formation souhaitée</td>
                  <td style={{ paddingBottom: 6, fontWeight: 600 }}>
                    {program?.name ?? "—"}
                    {program?.level ? ` · ${program.level}` : ""}
                  </td>
                </tr>
                {profile?.email && (
                  <tr>
                    <td style={{ paddingBottom: 6, color: "#6b7280" }}>Email</td>
                    <td style={{ paddingBottom: 6 }}>{profile.email}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: "#6b7280" }}>Date de validation</td>
                  <td style={{ fontWeight: 600 }}>{validationDate}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ marginBottom: 16 }}>
            Après examen attentif des pièces justificatives transmises, nous avons le réel plaisir
            de compter <strong>{profile?.full_name ?? "ce candidat"}</strong> parmi les candidats
            retenus pour intégrer notre établissement pour l'année académique à venir.
          </p>

          <p style={{ marginBottom: 16 }}>
            Ce document atteste de la validation du dossier de préinscription et ne constitue
            pas une inscription définitive. L'étudiant(e) est invité(e) à compléter les
            formalités administratives dans les délais impartis pour confirmer son admission.
          </p>

          <p style={{ marginBottom: 32 }}>
            L'étudiant(e) peut également télécharger son <strong>attestation de préinscription</strong>{" "}
            depuis son espace personnel sur la plateforme Rézo Campus, en présentant ce document aux
            services administratifs compétents.
          </p>
        </div>

        {/* Signature / Cachet */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <div style={{ width: 240, textAlign: "center" }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: "#111" }}>
              La Direction des Admissions
            </p>
            {cachetUrl ? (
              <img
                src={cachetUrl}
                alt="Cachet et signature"
                style={{ maxWidth: 180, maxHeight: 120, objectFit: "contain", margin: "0 auto 8px" }}
              />
            ) : (
              <div style={{
                height: 100,
                border: "1px dashed #d1d5db",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: 11,
                marginBottom: 8,
              }}>
                Cachet & Signature
              </div>
            )}
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 4, fontSize: 11, color: "#6b7280" }}>
              Date et signature
            </div>
          </div>
        </div>

        {/* Bandeau bas */}
        <div style={{ position: "absolute", bottom: 32, left: 48, right: 48 }}>
          <div style={{ background: "var(--color-primary, #0d6b5b)", height: 3, borderRadius: 2, marginBottom: 10 }} />
          <p style={{ fontSize: 9, color: "#9ca3af", textAlign: "center" }}>
            Document généré via la plateforme Rézo Campus · campusrezo@gmail.com ·{" "}
            Avenue de l'OUA, bloc 88-91, quartier Moukoundzi Ngouaka, Brazzaville, République du Congo.
          </p>
        </div>
      </div>
    </div>
  );
}
