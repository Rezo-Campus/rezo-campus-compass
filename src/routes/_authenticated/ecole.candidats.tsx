import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ecole/candidats")({
  component: EcoleCandidats,
});

const STATUS_OPTIONS = [
  { value: "soumis", label: "Soumis" },
  { value: "valide", label: "Validé" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
];

const STATUS_COLORS: Record<string, string> = {
  selection: "bg-yellow-100 text-yellow-700",
  soumis: "bg-blue-100 text-blue-700",
  valide: "bg-green-100 text-green-700",
  accepte: "bg-emerald-100 text-emerald-700",
  refuse: "bg-red-100 text-red-700",
};

function EcoleCandidats() {
  const qc = useQueryClient();

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["ecole-all-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_applications")
        .select("*")
        .in("status", ["soumis", "valide", "accepte", "refuse"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set(data.map((a) => a.student_id))];
      const programIds = [...new Set(data.map((a) => a.program_id))];
      const schoolIds = [...new Set(data.map((a) => a.school_id))];

      const [profiles, programs, schools] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone").in("id", studentIds),
        supabase.from("school_programs").select("id, name, level, domain").in("id", programIds),
        supabase.from("schools").select("id, name").in("id", schoolIds),
      ]);

      return data.map((a) => ({
        ...a,
        profile: profiles.data?.find((p) => p.id === a.student_id),
        program: programs.data?.find((p) => p.id === a.program_id),
        school: schools.data?.find((s) => s.id === a.school_id),
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("student_applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["ecole-all-applications"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Espace École"
        title="Candidatures reçues"
        description="Gérez les candidatures d'étudiants pour vos formations."
      />

      <Panel title={`${apps.length} candidature${apps.length > 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : apps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucune candidature reçue pour l'instant.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidat</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead>Lettre de motivation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                        <GraduationCap className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium">{a.profile?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{a.profile?.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{a.program?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.school?.name}{a.program?.level ? ` · ${a.program.level}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.motivation_letter ? (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-primary hover:underline">Voir la lettre</summary>
                        <p className="mt-2 max-w-sm text-xs text-muted-foreground whitespace-pre-wrap">
                          {a.motivation_letter}
                        </p>
                      </details>
                    ) : (
                      <span className="text-xs text-amber-600">Non rédigée</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[a.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_OPTIONS.find((s) => s.value === a.status)?.label ?? a.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={a.status}
                      onValueChange={(v) => updateStatus.mutate({ id: a.id, status: v })}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="ml-auto w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
