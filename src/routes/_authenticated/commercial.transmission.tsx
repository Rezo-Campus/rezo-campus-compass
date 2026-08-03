import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, ArrowLeftRight, CheckCircle2, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/commercial/transmission")({
  component: CommercialTransmission,
});

const db = supabase as any;

const TARGET_DEPTS = [
  { value: "projets",      label: "Management de Projet" },
  { value: "rh",           label: "Ressources Humaines" },
  { value: "comptabilite", label: "Finance & Comptabilité" },
  { value: "secretaire",   label: "Secrétariat" },
  { value: "aadf",         label: "AADF" },
];

function CommercialTransmission() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_department: "projets" });

  const { data: transmissions = [], isLoading } = useQuery({
    queryKey: ["commercial-transmissions"],
    queryFn: async () => {
      const { data, error } = await db
        .from("dept_transmissions")
        .select("*")
        .in("sender_department", ["commercial", "marketing"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sendTransmission = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Non authentifié");
      const ref = `TR-COM-${Date.now().toString().slice(-5)}`;
      const { error } = await db.from("dept_transmissions").insert({
        reference: ref,
        sender_id: uid,
        sender_department: "commercial",
        target_department: "aadf",
        title: form.title,
        description: form.description || null,
        status: "soumis",
      });
      if (error) throw error;

      // Notify AADF
      const { data: aadfUsers } = await db.from("user_roles").select("user_id").eq("role", "aadf");
      if (aadfUsers?.length) {
        await supabase.from("notifications").insert(
          aadfUsers.map((u: any) => ({
            user_id: u.user_id,
            title: `Nouvelle soumission Commerce : ${form.title}`,
            body: `Le département Commercial a soumis un document à l'AADF pour transmission vers ${TARGET_DEPTS.find((d) => d.value === form.target_department)?.label ?? form.target_department}.`,
            data: { type: "aadf_submission" },
          }))
        );
      }
    },
    onSuccess: () => {
      toast.success("Document soumis à l'AADF avec succès");
      qc.invalidateQueries({ queryKey: ["commercial-transmissions"] });
      setShowNew(false);
      setForm({ title: "", description: "", target_department: "projets" });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Transmettre à l'AADF"
        description="Soumettez des documents ou PV à l'AADF pour transmission inter-département."
      />

      <Panel
        title="Mes soumissions"
        action={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="mr-2 size-4" /> Nouvelle soumission
          </Button>
        }
      >
        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : transmissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <ArrowLeftRight className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucune soumission.
          </div>
        ) : (
          <div className="space-y-2">
            {transmissions.map((t: any) => (
              <div key={t.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <div className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${
                  t.status === "soumis" ? "bg-amber-100" :
                  t.status === "transmis" ? "bg-blue-100" :
                  t.status === "traite" ? "bg-green-100" : "bg-muted"
                }`}>
                  {t.status === "traite" ? (
                    <CheckCircle2 className="size-3.5 text-green-700" />
                  ) : (
                    <Clock className={`size-3.5 ${t.status === "soumis" ? "text-amber-700" : "text-blue-700"}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.reference && <span className="font-mono text-[10px] text-muted-foreground">{t.reference}</span>}
                    <span className="text-sm font-medium">{t.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      t.status === "soumis" ? "bg-amber-100 text-amber-700" :
                      t.status === "transmis" ? "bg-blue-100 text-blue-700" :
                      t.status === "traite" ? "bg-green-100 text-green-700" : "bg-muted"
                    }`}>
                      {t.status === "soumis" ? "En attente AADF" : t.status === "transmis" ? "Transmis" : "Traité"}
                    </span>
                  </div>
                  {t.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Dialog open={showNew} onOpenChange={(o) => { if (!o) setShowNew(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Soumettre à l'AADF</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Objet / Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Département destinataire souhaité</Label>
              <Select value={form.target_department} onValueChange={(v) => setForm((f) => ({ ...f, target_department: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{TARGET_DEPTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="mt-1" placeholder="Décrivez les éléments à transmettre..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button disabled={!form.title.trim() || sendTransmission.isPending} onClick={() => sendTransmission.mutate()}>
              {sendTransmission.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Send className="mr-2 size-4" /> Soumettre à l'AADF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
