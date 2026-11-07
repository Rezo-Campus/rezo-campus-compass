import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CalendarRange,
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  Globe,
  FileText,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/commercial/calendrier-editorial")({
  component: CalendrierEditorial,
});

const db = supabase as any;

type Post = {
  id: string;
  title: string;
  channel: string;
  content: string | null;
  status: string;
  scheduled_at: string | null;
  campaign_id: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
};

type Campaign = { id: string; title: string };

const CHANNELS = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "bg-pink-100 text-pink-700" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "bg-blue-100 text-blue-700" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, color: "bg-sky-100 text-sky-700" },
  { value: "twitter", label: "X / Twitter", icon: X, color: "bg-gray-100 text-gray-700" },
  { value: "email", label: "Email", icon: Mail, color: "bg-amber-100 text-amber-700" },
  { value: "blog", label: "Blog / Site", icon: Globe, color: "bg-green-100 text-green-700" },
  { value: "autre", label: "Autre", icon: FileText, color: "bg-muted text-muted-foreground" },
];

const STATUSES = [
  { value: "brouillon", label: "Brouillon", color: "bg-gray-100 text-gray-600" },
  { value: "planifie", label: "Planifié", color: "bg-amber-100 text-amber-700" },
  { value: "publie", label: "Publié", color: "bg-green-100 text-green-700" },
  { value: "annule", label: "Annulé", color: "bg-red-100 text-red-500" },
];

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function channelInfo(value: string) {
  return CHANNELS.find((c) => c.value === value) ?? CHANNELS[CHANNELS.length - 1];
}

function statusInfo(value: string) {
  return STATUSES.find((s) => s.value === value) ?? STATUSES[0];
}

function getEmptyForm() {
  return {
    title: "",
    channel: "instagram",
    content: "",
    status: "brouillon",
    scheduled_at: "",
    campaign_id: "__none__",
    tagsInput: "",
  };
}

export function CalendrierEditorial() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(getEmptyForm);

  const [filterChannel, setFilterChannel] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["editorial-posts"],
    queryFn: async () => {
      const { data, error } = await db
        .from("editorial_posts")
        .select("*")
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["marketing-campaigns-light"],
    queryFn: async () => {
      const { data, error } = await db
        .from("marketing_campaigns")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) return [] as Campaign[];
      return (data ?? []) as Campaign[];
    },
  });

  const filtered = posts.filter((p) => {
    if (filterChannel !== "__all__" && p.channel !== filterChannel) return false;
    if (filterStatus !== "__all__" && p.status !== filterStatus) return false;
    if (filterMonth && p.scheduled_at && !p.scheduled_at.startsWith(filterMonth)) return false;
    return true;
  });

  const grouped: Record<string, Post[]> = {};
  filtered.forEach((p) => {
    const day = p.scheduled_at ? p.scheduled_at.slice(0, 10) : "__no_date__";
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(p);
  });
  const sortedDays = Object.keys(grouped).sort((a, b) =>
    a === "__no_date__" ? 1 : b === "__no_date__" ? -1 : a.localeCompare(b),
  );

  const monthPosts = posts.filter((p) => p.scheduled_at?.startsWith(filterMonth));
  const statByChannel = CHANNELS.map((c) => ({
    ...c,
    count: monthPosts.filter((p) => p.channel === c.value).length,
  })).filter((c) => c.count > 0);

  function resetAndClose() {
    setOpen(false);
    setEditingId(null);
    setForm(getEmptyForm());
  }

  function openEdit(p: Post) {
    setForm({
      title: p.title,
      channel: p.channel,
      content: p.content ?? "",
      status: p.status,
      scheduled_at: p.scheduled_at ? p.scheduled_at.slice(0, 10) : "",
      campaign_id: p.campaign_id ?? "__none__",
      tagsInput: (p.tags ?? []).join(", "),
    });
    setEditingId(p.id);
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Titre requis");
      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        title: form.title.trim(),
        channel: form.channel,
        content: form.content || null,
        status: form.status,
        scheduled_at: form.scheduled_at || null,
        campaign_id: form.campaign_id === "__none__" ? null : form.campaign_id,
        tags,
        created_by: auth?.user?.id,
      };
      if (editingId) {
        const { error } = await db.from("editorial_posts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from("editorial_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Post modifié" : "Post ajouté au calendrier");
      resetAndClose();
      qc.invalidateQueries({ queryKey: ["editorial-posts"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("editorial_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post supprimé");
      qc.invalidateQueries({ queryKey: ["editorial-posts"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("editorial_posts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["editorial-posts"] }),
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6 + i);
    const val = d.toISOString().slice(0, 7);
    const [y, m] = val.split("-");
    return { value: val, label: `${MONTHS_FR[parseInt(m) - 1]} ${y}` };
  });

  return (
    <>
      <PageHeader
        eyebrow="Marketing & Communication"
        title="Calendrier éditorial"
        description="Planifiez et suivez vos publications sur tous les canaux de communication."
      />

      {statByChannel.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {statByChannel.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.value}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.color}`}
              >
                <Icon className="size-3" />
                {c.label} · {c.count}
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tous les canaux" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les canaux</SelectItem>
            {CHANNELS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tous statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les statuts</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button
            onClick={() => {
              setForm(getEmptyForm());
              setEditingId(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" /> Nouveau post
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-primary" />
      ) : filtered.length === 0 ? (
        <Panel title="Aucun post">
          <div className="py-10 text-center text-sm text-muted-foreground">
            <CalendarRange className="mx-auto mb-3 size-10 opacity-20" />
            Aucune publication planifiée pour cette période.
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => {
            const dayPosts = grouped[day];
            const dateLabel =
              day === "__no_date__"
                ? "Sans date"
                : new Date(day + "T12:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  });

            return (
              <div key={day}>
                <div className="mb-2 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {dateLabel}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-2">
                  {dayPosts.map((p) => {
                    const ch = channelInfo(p.channel);
                    const st = statusInfo(p.status);
                    const ChIcon = ch.icon;

                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <div
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${ch.color}`}
                        >
                          <ChIcon className="size-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{p.title}</span>
                            <Badge className={`text-[10px] border-0 ${ch.color}`}>{ch.label}</Badge>
                            <Badge className={`text-[10px] border-0 ${st.color}`}>{st.label}</Badge>
                          </div>
                          {p.content && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {p.content}
                            </p>
                          )}
                          {p.tags?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {p.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Select
                            value={p.status}
                            onValueChange={(v) => updateStatus.mutate({ id: p.id, status: v })}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value} className="text-xs">
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => setPendingDeleteId(p.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetAndClose();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le post" : "Nouveau post éditorial"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-2">
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>Titre / Sujet *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="ex. Annonce rentrée 2025, Témoignage étudiant…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Canal *</Label>
                  <Select
                    value={form.channel}
                    onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date de publication</Label>
                  <Input
                    type="date"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Contenu / Légende</Label>
                <Textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Texte du post, légende, objet email…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Campagne liée</Label>
                  <Select
                    value={form.campaign_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, campaign_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucune" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Aucune campagne —</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tags (séparés par des virgules)</Label>
                <Input
                  value={form.tagsInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                  placeholder="rentrée, témoignage, promo…"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>
              Annuler
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Enregistrer" : "Ajouter au calendrier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
        title="Supprimer ce post ?"
        description="Cette action est irréversible."
        onConfirm={() => {
          if (pendingDeleteId) del.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={del.isPending}
      />
    </>
  );
}
