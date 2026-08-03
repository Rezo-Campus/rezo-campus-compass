import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Plus, FileSignature, Download, Eye, Calendar, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/rh/contrats")({
  component: RhContrats,
});

const db = supabase as any;

const CONTRACT_TYPES = [
  { value: "cdi",        label: "CDI" },
  { value: "cdd",        label: "CDD" },
  { value: "stage",      label: "Stage" },
  { value: "freelance",  label: "Freelance" },
  { value: "alternance", label: "Alternance" },
  { value: "protocole",  label: "Protocole de collaboration" },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  brouillon:  { label: "Brouillon", color: "bg-gray-100 text-gray-600",    icon: Clock },
  actif:      { label: "Actif",     color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  expire:     { label: "Expiré",    color: "bg-amber-100 text-amber-700",  icon: AlertTriangle },
  resilie:    { label: "Résilié",   color: "bg-red-100 text-red-700",      icon: AlertTriangle },
};

type Contract = {
  id: string;
  employee_name: string;
  employee_role: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  description: string | null;
  created_at: string;
};

function RhContrats() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("all");

  const [form, setForm] = useState({
    employee_name: "",
    employee_role: "",
    contract_type: "cdi",
    start_date: "",
    end_date: "",
    description: "",
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["rh-contracts"],
    queryFn: async () => {
      const { data, error } = await db.from("contracts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contract[];
    },
  });

  const createContract = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("Non authentifié");
      const { error } = await db.from("contracts").insert({
        created_by: uid,
        employee_name: form.employee_name,
        employee_role: form.employee_role || null,
        contract_type: form.contract_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: "brouillon",
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrat créé");
      qc.invalidateQueries({ queryKey: ["rh-contracts"] });
      setShowNew(false);
      setForm({ employee_name: "", employee_role: "", contract_type: "cdi", start_date: "", end_date: "", description: "" });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("contracts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["rh-contracts"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const displayed = filter === "all" ? contracts : contracts.filter((c) => c.status === filter);

  const stats = {
    total: contracts.length,
    actif: contracts.filter((c) => c.status === "actif").length,
    expire: contracts.filter((c) => c.status === "expire").length,
    brouillon: contracts.filter((c) => c.status === "brouillon").length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Ressources Humaines"
        title="Contrats"
        description="Générez, gérez et suivez les contrats de travail et accords."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.actif}</div>
          <div className="text-xs text-green-600">Actifs</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.brouillon}</div>
          <div className="text-xs text-gray-500">Brouillons</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{stats.expire}</div>
          <div className="text-xs text-amber-600">Expirés</div>
        </div>
      </div>

      <Panel
        title="Liste des contrats"
        action={
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(STATUS_MAP).map(([v, s]) => (
                  <SelectItem key={v} value={v}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="mr-2 size-4" /> Nouveau contrat
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <FileSignature className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucun contrat.
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((c) => {
              const s = STATUS_MAP[c.status] ?? STATUS_MAP.brouillon;
              const StatusIcon = s.icon;
              const typeLabel = CONTRACT_TYPES.find((t) => t.value === c.contract_type)?.label ?? c.contract_type;
              return (
                <div key={c.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <FileSignature className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{c.employee_name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{typeLabel}</span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}>
                        <StatusIcon className="size-3" /> {s.label}
                      </span>
                    </div>
                    {c.employee_role && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.employee_role}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      <span>Début : {new Date(c.start_date + "T12:00:00").toLocaleDateString("fr-FR")}</span>
                      {c.end_date && (
                        <span>· Fin : {new Date(c.end_date + "T12:00:00").toLocaleDateString("fr-FR")}</span>
                      )}
                    </div>
                  </div>
                  <Select
                    value={c.status}
                    onValueChange={(v) => updateStatus.mutate({ id: c.id, status: v })}
                  >
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(([v, sv]) => (
                        <SelectItem key={v} value={v} className="text-xs">{sv.label}</SelectItem>
                      ))}
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
          <DialogHeader>
            <DialogTitle>Nouveau contrat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nom de l'employé *</Label>
                <Input value={form.employee_name} onChange={(e) => setForm((f) => ({ ...f, employee_name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Poste / Fonction</Label>
                <Input value={form.employee_role} onChange={(e) => setForm((f) => ({ ...f, employee_role: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type de contrat *</Label>
              <Select value={form.contract_type} onValueChange={(v) => setForm((f) => ({ ...f, contract_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date de début *</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date de fin</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes / Conditions particulières</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button
              disabled={!form.employee_name.trim() || !form.start_date || createContract.isPending}
              onClick={() => createContract.mutate()}
            >
              {createContract.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Créer le contrat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
