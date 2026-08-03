import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Plus, Megaphone, TrendingUp, Target, Globe2, Send,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard } from "@/components/dashboard-bits";
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

export const Route = createFileRoute("/_authenticated/commercial/marketing")({
  component: CommercialMarketing,
});

const db = supabase as any;

const CAMPAIGN_TYPES = [
  { value: "digital",    label: "Digital / Réseaux sociaux" },
  { value: "email",      label: "Emailing" },
  { value: "evenement",  label: "Événement / Salon" },
  { value: "print",      label: "Print / Affichage" },
  { value: "partenariat",label: "Partenariat" },
  { value: "autre",      label: "Autre" },
];

const STATUS_COLORS: Record<string, string> = {
  planifie:  "bg-amber-100 text-amber-700",
  en_cours:  "bg-blue-100 text-blue-700",
  termine:   "bg-green-100 text-green-700",
  suspendu:  "bg-red-100 text-red-700",
};

type Campaign = {
  id: string;
  title: string;
  type: string | null;
  target: string | null;
  budget: number | null;
  status: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

function CommercialMarketing() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "digital",
    target: "",
    budget: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: async () => {
      const { data, error } = await db.from("marketing_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Non authentifié");
      const { error } = await db.from("marketing_campaigns").insert({
        created_by: uid,
        title: form.title,
        type: form.type,
        target: form.target || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        description: form.description || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: "planifie",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campagne créée");
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      setShowNew(false);
      setForm({ title: "", type: "digital", target: "", budget: "", description: "", start_date: "", end_date: "" });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("marketing_campaigns").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget ?? 0), 0);
  const active = campaigns.filter((c) => c.status === "en_cours").length;
  const planned = campaigns.filter((c) => c.status === "planifie").length;

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Campagnes Marketing"
        description="Planifiez et suivez toutes vos campagnes et actions marketing."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Campagnes actives"   value={String(active)}   icon={TrendingUp} />
        <StatCard label="Planifiées"          value={String(planned)}  icon={Target} />
        <StatCard label="Budget total"        value={`${totalBudget.toLocaleString("fr-FR")} FCFA`} icon={Globe2} />
      </div>

      <Panel
        title="Toutes les campagnes"
        action={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="mr-2 size-4" /> Nouvelle campagne
          </Button>
        }
      >
        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <Megaphone className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucune campagne créée.
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => {
              const typeLabel = CAMPAIGN_TYPES.find((t) => t.value === c.type)?.label ?? c.type;
              return (
                <div key={c.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Megaphone className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{c.title}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{typeLabel}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground"}`}>
                        {c.status === "planifie" ? "Planifié" : c.status === "en_cours" ? "En cours" : c.status === "termine" ? "Terminé" : "Suspendu"}
                      </span>
                    </div>
                    {c.target && <p className="mt-0.5 text-xs text-muted-foreground">Cible : {c.target}</p>}
                    {c.budget != null && (
                      <p className="mt-0.5 text-xs text-muted-foreground">Budget : {c.budget.toLocaleString("fr-FR")} FCFA</p>
                    )}
                  </div>
                  <Select value={c.status} onValueChange={(v) => updateStatus.mutate({ id: c.id, status: v })}>
                    <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planifie" className="text-xs">Planifié</SelectItem>
                      <SelectItem value="en_cours" className="text-xs">En cours</SelectItem>
                      <SelectItem value="termine" className="text-xs">Terminé</SelectItem>
                      <SelectItem value="suspendu" className="text-xs">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Dialog open={showNew} onOpenChange={(o) => { if (!o) setShowNew(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle campagne marketing</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CAMPAIGN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Budget (FCFA)</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cible / Audience</Label>
              <Input value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} placeholder="Étudiants bacheliers, lycéens..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date de début</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date de fin</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button disabled={!form.title.trim() || createCampaign.isPending} onClick={() => createCampaign.mutate()}>
              {createCampaign.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Send className="mr-2 size-4" /> Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
