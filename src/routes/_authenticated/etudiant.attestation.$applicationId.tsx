import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/attestation/$applicationId")({
  component: EtudiantAttestation,
});

function EtudiantAttestation() {
  const { applicationId } = Route.useParams();
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  const { data, isLoading, error } = useQuery({
    enabled: !!uid && !!applicationId,
    queryKey: ["etudiant-attestation", applicationId, uid],
    queryFn: async () => {
      // Verify the application belongs to this student
      const { data: app, error: appErr } = await supabase
        .from("student_applications")
        .select("*, school:school_id(id, name), program:program_id(name, level, domain)")
        .eq("id", applicationId)
        .eq("student_id", uid!)
        .single();
      if (appErr) throw new Error("Attestation introuvable ou accès refusé.");

      const [profileRes, schoolLogoRes] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone, photo_url").eq("id", uid!).single(),
        app.school_id
          ? supabase.from("schools").select("logo_url").eq("id", app.school_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        app,
        profile: profileRes.data,
        schoolLogo: schoolLogoRes.data,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.app) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Attestation introuvable. Elle sera disponible dès que votre établissement aura validé votre candidature.
      </div>
    );
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
      <div className="mb-6 flex items-center justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 size-4" /> Imprimer / Télécharger en PDF
        </Button>
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
            pas une inscription définitive. Vous êtes invité(e) à compléter les formalités
            administratives dans les délais impartis pour confirmer votre admission.
          </p>

          <p style={{ marginBottom: 32 }}>
            Vous pouvez présenter ce document aux services administratifs compétents ainsi qu'à
            l'équipe de <strong>Rézo Campus</strong> pour finaliser votre dossier de validation.
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
                Cachet & Signature (en cours)
              </div>
            )}
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 4, fontSize: 11, color: "#6b7280" }}>
              Date et signature
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div style={{ position: "absolute", bottom: 32, left: 48, right: 48 }}>
          <div style={{ background: "var(--color-primary, #0d6b5b)", height: 3, borderRadius: 2, marginBottom: 10 }} />
          <p style={{ fontSize: 9, color: "#9ca3af", textAlign: "center" }}>
            Document généré via la plateforme Rézo Campus · campusrezo@gmail.com ·
            Avenue de l'OUA, bloc 88-91, quartier Moukoundzi Ngouaka, Brazzaville, République du Congo.
          </p>
        </div>
      </div>
    </div>
  );
}
