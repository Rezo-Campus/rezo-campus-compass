import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Loader2,
  Send,
  Inbox,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/* ── Constants ──────────────────────────────────────────────────────────── */
export const DEPT_LABELS: Record<string, string> = {
  admin: "Administration générale",
  commercial: "Marketing & Communication",
  rh: "Ressources Humaines",
  comptabilite: "Comptabilité",
  chef_projet: "Projets IT",
  secretaire: "Secrétariat",
  aadf: "AADF",
};

const TRANS_TYPES = [
  { value: "courrier", label: "Courrier général" },
  { value: "budget_request", label: "Demande de budget" },
  { value: "project_transfer", label: "Transfert de projet" },
  { value: "document", label: "Document de suivi" },
  { value: "note", label: "Note interne" },
  { value: "autre", label: "Autre" },
];

const PRIORITIES = [
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-600" },
  { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-600" },
  { value: "faible", label: "Faible", color: "bg-gray-100 text-gray-500" },
];

const STATUSES = [
  { value: "envoye", label: "Envoyé", icon: Send, color: "bg-blue-100 text-blue-600" },
  { value: "recu", label: "Reçu", icon: Inbox, color: "bg-amber-100 text-amber-700" },
  { value: "traite", label: "Traité", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  { value: "rejete", label: "Rejeté", icon: XCircle, color: "bg-red-100 text-red-500" },
];

function statusInfo(value: string) {
  return STATUSES.find((s) => s.value === value) ?? STATUSES[0];
}
function priorityInfo(value: string) {
  return PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[1];
}
function typeLabel(value: string) {
  return TRANS_TYPES.find((t) => t.value === value)?.label ?? value;
}

/* ── Types ─────────────────────────────────────────────────────────────── */
type Transmission = {
  id: string;
  type: string;
  subject: string;
  body: string | null;
  from_department: string;
  to_department: string;
  from_user_id: string | null;
  status: string;
  priority: string;
  created_at: string;
};

function getEmptyForm() {
  return { type: "courrier", to_department: "__none__", subject: "", body: "", priority: "normal" };
}

/* ── Main exported component ────────────────────────────────────────────── */
export function TransmissionsInternes({
  department,
  eyebrow,
  canSeeAll = false,
}: {
  department: string;
  eyebrow?: string;
  canSeeAll?: boolean;
}) {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(getEmptyForm);
  const [tab, setTab] = useState<"recus" | "envoyes">("recus");

  const { data: transmissions = [], isLoading } = useQuery({
    queryKey: ["transmissions-internes", department, canSeeAll],
    queryFn: async () => {
      const { data, error } = await db
        .from("transmissions_internes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Transmission[];
    },
  });

  const inbox = canSeeAll
    ? transmissions
    : transmissions.filter((t) => t.to_department === department);

  const outbox = canSeeAll
    ? transmissions
    : transmissions.filter((t) => t.from_department === department);

  const inboxUnread = inbox.filter((t) => t.status === "envoye").length;

  const send = useMutation({
    mutationFn: async () => {
      if (!form.subject.trim()) throw new Error("Objet requis");
      if (form.to_department === "__none__") throw new Error("Département destinataire requis");
      const { error } = await db.from("transmissions_internes").insert({
        type: form.type,
        subject: form.subject.trim(),
        body: form.body || null,
        from_department: department,
        to_department: form.to_department,
        from_user_id: auth?.user?.id ?? null,
        status: "envoye",
        priority: form.priority,
      });
      if (error) throw error;
      try {
        const targetRole = form.to_department;
        const { data: targetUsers } = await db
          .from("user_roles")
          .select("user_id")
          .eq("role", targetRole);
        const notifs = (targetUsers ?? [])
          .filter((u: any) => u.user_id !== auth?.user?.id)
          .map((u: any) => ({
            user_id: u.user_id,
            title: `Nouveau courrier : ${form.subject.trim()}`,
            body: `De ${DEPT_LABELS[department] ?? department} · ${typeLabel(form.type)}`,
            data: { type: "transmission_interne" },
          }));
        if (notifs.length) await supabase.from("notifications").insert(notifs);
      } catch {
        /* notifications best-effort */
      }
    },
    onSuccess: () => {
      toast.success("Courrier envoyé");
      setOpen(false);
      setForm(getEmptyForm());
      qc.invalidateQueries({ queryKey: ["transmissions-internes"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("transmissions_internes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transmissions-internes"] }),
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow={eyebrow ?? DEPT_LABELS[department] ?? department}
        title={canSeeAll ? "Courriers & Transmissions" : "Transmissions internes"}
        description={
          canSeeAll
            ? "Vue centrale de tous les échanges inter-départements de Rézo Campus."
            : "Envoyez et recevez des courriers, demandes et documents entre départements."
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <Inbox className="size-4 text-primary" />
          <span className="text-sm font-medium">
            {inbox.length} reçu{inbox.length !== 1 ? "s" : ""}
          </span>
          {inboxUnread > 0 && (
            <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">
              {inboxUnread} nouveau{inboxUnread > 1 ? "x" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <ArrowUpRight className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {outbox.length} envoyé{outbox.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="ml-auto">
          <Button
            onClick={() => {
              setForm(getEmptyForm());
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" /> Nouveau courrier
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "recus" | "envoyes")}>
        <TabsList className="mb-4">
          <TabsTrigger value="recus" className="relative">
            Boîte de réception
            {inboxUnread > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {inboxUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="envoyes">Envoyés</TabsTrigger>
        </TabsList>

        <TabsContent value="recus">
          <TransList
            items={inbox}
            isLoading={isLoading}
            isInbox
            onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
            emptyLabel="Aucun courrier reçu."
          />
        </TabsContent>

        <TabsContent value="envoyes">
          <TransList
            items={outbox}
            isLoading={isLoading}
            isInbox={false}
            onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
            emptyLabel="Aucun courrier envoyé."
          />
        </TabsContent>
      </Tabs>

      {/* New courrier dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) setOpen(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau courrier / transmission</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-2">
            <div className="space-y-4 py-1">
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                De : <strong>{DEPT_LABELS[department] ?? department}</strong>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANS_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Département destinataire *</Label>
                <Select
                  value={form.to_department}
                  onValueChange={(v) => setForm((f) => ({ ...f, to_department: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Choisir un département —</SelectItem>
                    {Object.entries(DEPT_LABELS)
                      .filter(([k]) => k !== department)
                      .map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Objet / Titre *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="ex. Demande de budget formation Q1, Transfert projet X…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Corps du message</Label>
                <Textarea
                  rows={5}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Détails, contexte, pièces jointes référencées…"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => send.mutate()}
              disabled={send.isPending || !form.subject.trim() || form.to_department === "__none__"}
            >
              {send.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Send className="mr-2 size-4" /> Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── TransList ─────────────────────────────────────────────────────────── */
function TransList({
  items,
  isLoading,
  isInbox,
  onStatusChange,
  emptyLabel,
}: {
  items: Transmission[];
  isLoading: boolean;
  isInbox: boolean;
  onStatusChange: (id: string, status: string) => void;
  emptyLabel: string;
}) {
  if (isLoading) return <Loader2 className="mx-auto size-5 animate-spin text-primary" />;

  if (items.length === 0) {
    return (
      <Panel title="">
        <div className="py-10 text-center text-sm text-muted-foreground">
          {isInbox ? (
            <Inbox className="mx-auto mb-3 size-10 opacity-20" />
          ) : (
            <ArrowUpRight className="mx-auto mb-3 size-10 opacity-20" />
          )}
          {emptyLabel}
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((t) => {
        const st = statusInfo(t.status);
        const pr = priorityInfo(t.priority);
        const StIcon = st.icon;

        return (
          <div key={t.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-start gap-3">
              <div
                className={`mt-1 h-5 w-1 shrink-0 rounded-full ${t.priority === "urgent" ? "bg-red-500" : t.priority === "faible" ? "bg-gray-300" : "bg-blue-400"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{t.subject}</span>
                  <Badge className={`text-[10px] border-0 ${pr.color}`}>{pr.label}</Badge>
                  <Badge className={`text-[10px] border-0 ${st.color}`}>
                    <StIcon className="mr-1 size-2.5" />
                    {st.label}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{typeLabel(t.type)}</span>
                  {isInbox ? (
                    <span>
                      De : <strong>{DEPT_LABELS[t.from_department] ?? t.from_department}</strong>
                    </span>
                  ) : (
                    <span>
                      Pour : <strong>{DEPT_LABELS[t.to_department] ?? t.to_department}</strong>
                    </span>
                  )}
                  <span>
                    {new Date(t.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {t.body && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground italic">
                    {t.body}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {isInbox && t.status === "envoye" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-amber-600 border-amber-200"
                      onClick={() => onStatusChange(t.id, "recu")}
                    >
                      <Clock className="mr-1 size-3.5" /> Accuser réception
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-700 border-green-200"
                      onClick={() => onStatusChange(t.id, "traite")}
                    >
                      <CheckCircle2 className="mr-1 size-3.5" /> Traité
                    </Button>
                  </>
                )}
                {isInbox && t.status === "recu" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-700 border-green-200"
                      onClick={() => onStatusChange(t.id, "traite")}
                    >
                      <CheckCircle2 className="mr-1 size-3.5" /> Marquer traité
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => onStatusChange(t.id, "rejete")}
                    >
                      <XCircle className="mr-1 size-3.5" /> Rejeter
                    </Button>
                  </>
                )}
                {(!isInbox || t.status === "traite" || t.status === "rejete") && (
                  <Badge className={`text-[10px] border-0 ${st.color}`}>
                    <StIcon className="mr-1 size-2.5" />
                    {st.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
