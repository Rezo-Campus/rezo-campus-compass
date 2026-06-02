import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/dossier")({
  component: DossierEtudiant,
});

const LEVELS = ["Licence", "Master", "Doctorat", "BTS / DUT", "Prépa", "Autre"];
const COUNTRIES = ["Maroc", "France", "Canada", "Belgique", "Sénégal", "Autre"];

function DossierEtudiant() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["student-file", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_files")
        .select("*")
        .eq("student_id", uid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    target_country: "",
    target_level: "",
    target_program: "",
    bio: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        target_country: data.target_country ?? "",
        target_level: data.target_level ?? "",
        target_program: data.target_program ?? "",
        bio: data.bio ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const filled = Object.values(form).filter(Boolean).length;
      const progress = Math.min(100, Math.round((filled / 4) * 60));
      const { error } = await supabase
        .from("student_files")
        .update({ ...form, progress })
        .eq("student_id", uid!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dossier enregistré");
      qc.invalidateQueries({ queryKey: ["student-file", uid] });
      qc.invalidateQueries({ queryKey: ["etudiant-overview", uid] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Mon dossier"
        title="Informations du projet d'études"
        description="Renseignez votre projet pour permettre à votre conseiller de vous accompagner."
      />

      <Panel title="Projet d'études">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label>Pays visé</Label>
            <Select
              value={form.target_country}
              onValueChange={(v) => setForm((f) => ({ ...f, target_country: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Choisir un pays" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Niveau visé</Label>
            <Select
              value={form.target_level}
              onValueChange={(v) => setForm((f) => ({ ...f, target_level: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Choisir un niveau" /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="prog">Formation / filière souhaitée</Label>
            <Input
              id="prog"
              value={form.target_program}
              onChange={(e) => setForm((f) => ({ ...f, target_program: e.target.value }))}
              placeholder="Ex. Master en Génie Civil"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">Présentation</Label>
            <Textarea
              id="bio"
              rows={5}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Parcours, motivations, objectifs..."
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </Panel>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Panel title="Statut">
          <div className="text-2xl font-semibold capitalize">{data?.status?.replace("_", " ")}</div>
        </Panel>
        <Panel title="Progression">
          <div className="text-2xl font-semibold">{data?.progress ?? 0}%</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${data?.progress ?? 0}%` }} />
          </div>
        </Panel>
        <Panel title="Conseiller">
          <div className="text-sm text-muted-foreground">
            {data?.advisor_id ? "Assigné" : "Non assigné"}
          </div>
        </Panel>
      </div>
    </>
  );
}
