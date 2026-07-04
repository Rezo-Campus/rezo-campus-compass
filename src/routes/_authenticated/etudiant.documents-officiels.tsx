import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, Download, Award } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/documents-officiels")({
  component: EtudiantDocumentsOfficiels,
});

const SOURCE_LABELS: Record<string, string> = {
  ecole: "Établissement",
  admin: "Rézo Campus",
};

const SOURCE_COLORS: Record<string, string> = {
  ecole: "bg-blue-100 text-blue-700",
  admin: "bg-emerald-100 text-emerald-700",
};

function EtudiantDocumentsOfficiels() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  const { data: docs = [], isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["official-docs-student", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_documents")
        .select("*")
        .eq("student_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Also fetch candidatures with ecole_validated_at set (attestations disponibles)
  const { data: validatedApps = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["validated-apps-student", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_applications")
        .select("id, school_id, program_id, ecole_validated_at")
        .eq("student_id", uid!)
        .not("ecole_validated_at", "is", null);
      if (error) throw error;

      const schoolIds = [...new Set(data.map((a) => a.school_id))];
      const programIds = [...new Set(data.map((a) => a.program_id))];

      const [schools, programs] = await Promise.all([
        schoolIds.length
          ? supabase.from("schools").select("id, name").in("id", schoolIds)
          : { data: [] },
        programIds.length
          ? supabase.from("school_programs").select("id, name").in("id", programIds)
          : { data: [] },
      ]);

      return data.map((a) => ({
        ...a,
        school: (schools.data ?? []).find((s) => s.id === a.school_id),
        program: (programs.data ?? []).find((p) => p.id === a.program_id),
      }));
    },
  });

  async function downloadDoc(path: string) {
    const { data: urlData, error } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(path, 3600);
    if (error || !urlData) {
      toast.error("Lien indisponible");
      return;
    }
    window.open(urlData.signedUrl, "_blank", "noopener,noreferrer");
  }

  const ecoleDocs = docs.filter((d) => d.source === "ecole");
  const adminDocs = docs.filter((d) => d.source === "admin");

  return (
    <>
      <PageHeader
        eyebrow="Espace Étudiant"
        title="Documents officiels"
        description="Documents transmis par votre établissement et par Rézo Campus."
      />

      {/* Attestations de validation disponibles */}
      {validatedApps.length > 0 && (
        <Panel title={`Attestation${validatedApps.length > 1 ? "s" : ""} de validation`} description="Votre candidature a été validée — téléchargez votre attestation.">
          <ul className="space-y-2">
            {validatedApps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <Award className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-emerald-800">
                    {a.school?.name ?? "Établissement"}
                  </div>
                  <div className="text-sm text-emerald-700">
                    {a.program?.name ?? "Formation"}
                  </div>
                  <div className="text-xs text-emerald-600">
                    Validé le {new Date(a.ecole_validated_at!).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </div>
                </div>
                <a
                  href={`/etudiant/attestation/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
                >
                  <Download className="size-4" /> Voir l'attestation
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Chargement */}
      {isLoading && (
        <div className="grid min-h-[30vh] place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}

      {/* Documents de l'établissement */}
      {!isLoading && (
        <Panel
          title={`Documents de l'établissement (${ecoleDocs.length})`}
          description="Convocations, lettres d'admission, programmes de cours…"
        >
          {ecoleDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun document transmis par votre établissement pour l'instant.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {ecoleDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[d.source] ?? "bg-muted"}`}>
                        {SOURCE_LABELS[d.source] ?? d.source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadDoc(d.storage_path)}>
                    <Download className="mr-1.5 size-3.5" /> Télécharger
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* Documents de Rézo Campus */}
      {!isLoading && (
        <Panel
          title={`Documents Rézo Campus (${adminDocs.length})`}
          description="Prise en charge, AEVM, attestation d'hébergement, bulletins de salaire, carte de séjour…"
        >
          {adminDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun document transmis par Rézo Campus pour l'instant.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {adminDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[d.source] ?? "bg-muted"}`}>
                        {SOURCE_LABELS[d.source] ?? d.source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadDoc(d.storage_path)}>
                    <Download className="mr-1.5 size-3.5" /> Télécharger
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}
