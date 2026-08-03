import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Printer, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const uid = () => Math.random().toString(36).slice(2, 10);

type ContentItem = { id: string; type: "paragraph" | "bullet"; text: string };
type Article = { id: string; title: string; items: ContentItem[] };

type ProtocolState = {
  protocolTitle: string;
  location: string;
  date: string;
  party2Name: string;
  party2Address: string;
  party2IdNumber: string;
  party2Alias: string;
  party2Role: string;
  articles: Article[];
  signatoryTitle: string;
  status: string;
};

type ProtocolRecord = {
  id: string; department: string; protocol_title: string; location: string | null;
  date: string | null; party2_name: string | null; party2_address: string | null;
  party2_id_number: string | null; party2_alias: string | null; party2_role: string | null;
  articles: Article[]; signatory_title: string | null; status: string; created_at: string;
};

const makeDefault = (): ProtocolState => ({
  protocolTitle: "PROTOCOLE D'ACCORD",
  location: "",
  date: "",
  party2Name: "",
  party2Address: "",
  party2IdNumber: "",
  party2Alias: "",
  party2Role: "le Responsable",
  articles: [{ id: uid(), title: "Objet", items: [{ id: uid(), type: "paragraph", text: "" }] }],
  signatoryTitle: "Le Gérant par Intérim",
  status: "brouillon",
});

const STATUS_LABELS: Record<string, string> = { brouillon: "Brouillon", signe: "Signé" };
const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-gray-100 text-gray-600",
  signe: "bg-green-100 text-green-700",
};

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function renderItemsHTML(items: ContentItem[]): string {
  let html = "";
  let inList = false;
  for (const it of items) {
    if (!it.text.trim()) continue;
    if (it.type === "bullet") {
      if (!inList) { html += '<ul style="margin:6px 0 6px 20px;padding:0;">'; inList = true; }
      html += `<li style="margin-bottom:4px;">${it.text}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p style="margin-bottom:8px;text-align:justify;">${it.text}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html || '<p style="color:#aaa;font-style:italic;">Article vide</p>';
}

function printProtocol(s: ProtocolState) {
  const logoUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/1.png`;
  const articlesHTML = s.articles.map((art, idx) =>
    `<div style="margin-top:22px;">
      <h3 style="color:#1a6b8a;font-size:13pt;font-weight:bold;margin-bottom:8px;">Article ${idx + 1} — ${art.title || "Sans titre"}</h3>
      ${renderItemsHTML(art.items)}
    </div>`
  ).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${s.protocolTitle}</title>
<style>body{font-family:Arial,sans-serif;font-size:11pt;color:#222;margin:20mm 25mm;line-height:1.6;}@media print{@page{margin:15mm 20mm;}body{margin:0;}}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
  <div style="display:flex;align-items:flex-start;gap:12px;">
    <img src="${logoUrl}" alt="Rézo Campus" style="height:65px;width:auto;object-fit:contain;" onerror="this.style.display='none'" />
    <div>
      <div style="color:#1a6b8a;font-size:20px;font-weight:bold;">Rézo Campus <span style="font-size:14px;font-weight:400;">Consulting SARL</span></div>
      <div style="color:#666;font-style:italic;font-size:9pt;margin-top:2px;">Orientation • Accompagnement • Excellence</div>
      <div style="margin-top:6px;font-size:8.5pt;color:#444;line-height:1.6;">
        <strong>Congo :</strong> Av de l'OUA, bloc 88-91, Moukoundzi Ngouaka — Brazzaville<br>
        <strong>Maroc :</strong> 46, Bd Zerktouni, Étage 5, N17 — Maarif, Casablanca<br>
        ✉ contact@rezoconnect.com &nbsp;|&nbsp; ☎ +242 06 800 01 99 &nbsp;|&nbsp; +212 617-725867
      </div>
    </div>
  </div>
</div>
<hr style="border:none;border-top:2px solid #1a5c3a;margin:12px 0;">
<h1 style="text-align:center;font-size:20pt;font-weight:bold;letter-spacing:2px;margin:22px 0;">${s.protocolTitle}</h1>
<hr style="border:none;border-top:2px solid #1a5c3a;margin:12px 0;">
<p style="font-weight:bold;margin:18px 0 10px;">Entre les soussignés :</p>
<div style="margin-bottom:15px;">
  <p><strong>RÉZO CAMPUS SARL</strong>, société à responsabilité limitée, ayant ses bureaux à <strong>Av de l'OUA, bloc 88-91, Moukoundzi Ngouaka — Brazzaville, République du Congo</strong> et à <strong>46, Bd Zerktouni, Étage 5, N17 — Maarif, 20250 Casablanca, Maroc</strong>, représentée par son Gérant dûment habilité,</p>
  <p style="font-style:italic;margin-top:6px;">Ci-après dénommée <strong>« Rézo Campus »</strong> ou <strong>« l'Entreprise »</strong>,</p>
</div>
<p style="text-align:center;font-style:italic;margin:14px 0;"><strong>D'une part,</strong></p>
<div style="margin-bottom:15px;">
  <p><strong>${s.party2Name || "…………………………………………………………"}</strong>, demeurant à <strong>${s.party2Address || "…………………………………………………………"}</strong>, titulaire de la pièce d'identité n° <strong>${s.party2IdNumber || "……………………………"}</strong>,</p>
  <p style="font-style:italic;margin-top:6px;">Ci-après dénommé <strong>« ${s.party2Alias || s.party2Name || "………………………"} »</strong> ou <strong>« ${s.party2Role || "le Responsable"} »</strong>,</p>
</div>
<p style="text-align:center;font-style:italic;margin:14px 0;"><strong>D'autre part,</strong></p>
<p>Ci-après désignés ensemble <strong>« les Parties »</strong>.</p>
${articlesHTML}
<div style="margin-top:45px;border-top:1px solid #ccc;padding-top:18px;">
  <p style="text-align:right;margin-bottom:8px;">Fait à <strong>${s.location || "…………………………"}</strong>, le <strong>${s.date ? new Date(s.date + "T12:00:00").toLocaleDateString("fr-FR") : "…………………………"}</strong></p>
  <p style="font-style:italic;font-size:9pt;">En deux (2) exemplaires originaux.</p>
  <div style="display:flex;justify-content:space-between;margin-top:30px;">
    <div style="width:45%;">
      <p style="font-weight:bold;color:#1a5c3a;margin-bottom:4px;">Pour Rézo Campus SARL</p>
      <p style="font-size:9pt;color:#555;margin-bottom:50px;">${s.signatoryTitle || "Le Gérant par Intérim"}</p>
      <p style="font-style:italic;font-size:9pt;border-top:1px solid #333;padding-top:4px;text-align:center;">(signature)</p>
    </div>
    <div style="width:45%;">
      <p style="font-weight:bold;color:#1a5c3a;margin-bottom:4px;">${s.party2Alias || s.party2Name || "…………………………………"}</p>
      <p style="font-size:9pt;color:#555;margin-bottom:50px;"> </p>
      <p style="font-style:italic;font-size:9pt;border-top:1px solid #333;padding-top:4px;text-align:center;">(signature)</p>
    </div>
  </div>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez les pop-ups pour imprimer."); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

function recordToState(r: ProtocolRecord): ProtocolState {
  return {
    protocolTitle: r.protocol_title,
    location: r.location || "",
    date: r.date || "",
    party2Name: r.party2_name || "",
    party2Address: r.party2_address || "",
    party2IdNumber: r.party2_id_number || "",
    party2Alias: r.party2_alias || "",
    party2Role: r.party2_role || "le Responsable",
    articles: r.articles || [{ id: uid(), title: "Objet", items: [{ id: uid(), type: "paragraph", text: "" }] }],
    signatoryTitle: r.signatory_title || "Le Gérant par Intérim",
    status: r.status,
  };
}

/* ─── Formulaire éditeur ─────────────────────────────────────── */
function ProtocolForm({
  initial, saving, onSave, onCancel,
}: {
  initial: ProtocolState;
  saving: boolean;
  onSave: (s: ProtocolState) => void;
  onCancel: () => void;
}) {
  const [s, setS] = useState<ProtocolState>(initial);
  const upd = <K extends keyof ProtocolState>(k: K, v: ProtocolState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const addArticle = () =>
    setS((p) => ({ ...p, articles: [...p.articles, { id: uid(), title: "", items: [{ id: uid(), type: "paragraph", text: "" }] }] }));
  const removeArticle = (aid: string) =>
    setS((p) => ({ ...p, articles: p.articles.filter((a) => a.id !== aid) }));
  const updArticleTitle = (aid: string, title: string) =>
    setS((p) => ({ ...p, articles: p.articles.map((a) => (a.id === aid ? { ...a, title } : a)) }));
  const addItem = (aid: string, type: "paragraph" | "bullet") =>
    setS((p) => ({ ...p, articles: p.articles.map((a) => a.id === aid ? { ...a, items: [...a.items, { id: uid(), type, text: "" }] } : a) }));
  const updItem = (aid: string, iid: string, text: string) =>
    setS((p) => ({ ...p, articles: p.articles.map((a) => a.id === aid ? { ...a, items: a.items.map((i) => i.id === iid ? { ...i, text } : i) } : a) }));
  const removeItem = (aid: string, iid: string) =>
    setS((p) => ({ ...p, articles: p.articles.map((a) => a.id === aid ? { ...a, items: a.items.filter((i) => i.id !== iid) } : a) }));

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Statut</Label>
          <select value={s.status} onChange={(e) => upd("status", e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1 text-sm">
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => printProtocol(s)}><Printer className="mr-2 size-4" /> Aperçu &amp; Imprimer</Button>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onSave(s)} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Enregistrer
          </Button>
        </div>
      </div>

      <Panel title="Informations générales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Label className="text-xs text-muted-foreground">Titre du document</Label>
            <Input className="mt-1" value={s.protocolTitle} onChange={(e) => upd("protocolTitle", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Lieu de signature</Label>
            <Input className="mt-1" value={s.location} onChange={(e) => upd("location", e.target.value)} placeholder="Casablanca" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Date de signature</Label>
            <Input type="date" className="mt-1" value={s.date} onChange={(e) => upd("date", e.target.value)} />
          </div>
        </div>
      </Panel>

      <Panel title="Partie 2 — Partenaire / Responsable">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Nom complet *</Label>
            <Input className="mt-1" value={s.party2Name} onChange={(e) => upd("party2Name", e.target.value)} placeholder="BACK Desmond" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Adresse</Label>
            <Input className="mt-1" value={s.party2Address} onChange={(e) => upd("party2Address", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">N° pièce d'identité</Label>
            <Input className="mt-1" value={s.party2IdNumber} onChange={(e) => upd("party2IdNumber", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Désignation dans le document</Label>
            <Input className="mt-1" value={s.party2Alias} onChange={(e) => upd("party2Alias", e.target.value)} placeholder="Monsieur Back" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rôle (ex : « le Responsable »)</Label>
            <Input className="mt-1" value={s.party2Role} onChange={(e) => upd("party2Role", e.target.value)} placeholder="le Responsable" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Titre du signataire Rézo Campus</Label>
            <Input className="mt-1" value={s.signatoryTitle} onChange={(e) => upd("signatoryTitle", e.target.value)} placeholder="Le Gérant par Intérim" />
          </div>
        </div>
      </Panel>

      <Panel
        title="Articles"
        action={<Button size="sm" onClick={addArticle}><Plus className="mr-2 size-4" /> Ajouter un article</Button>}
      >
        <div className="space-y-6">
          {s.articles.map((art, idx) => (
            <div key={art.id} className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="min-w-[80px] text-sm font-semibold text-primary">Article {idx + 1}</span>
                <Input value={art.title} onChange={(e) => updArticleTitle(art.id, e.target.value)}
                  placeholder="Titre (ex : Objet, Durée, Rémunération…)" className="flex-1" />
                <Button size="icon" variant="ghost" className="size-8 text-destructive hover:bg-destructive/10"
                  onClick={() => removeArticle(art.id)} disabled={s.articles.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mb-3 space-y-2">
                {art.items.map((it) => (
                  <div key={it.id} className="flex items-start gap-2">
                    <span className="mt-2 w-5 text-center text-xs text-muted-foreground">
                      {it.type === "bullet" ? "•" : "¶"}
                    </span>
                    <Textarea value={it.text} onChange={(e) => updItem(art.id, it.id, e.target.value)}
                      placeholder={it.type === "bullet" ? "Élément de liste…" : "Paragraphe de texte…"}
                      rows={it.type === "paragraph" ? 2 : 1} className="flex-1 resize-none text-sm" />
                    <Button size="icon" variant="ghost" className="mt-1 size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(art.id, it.id)} disabled={art.items.length === 1}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => addItem(art.id, "paragraph")}>
                  <Plus className="mr-1 size-3" /> Paragraphe
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => addItem(art.id, "bullet")}>
                  <Plus className="mr-1 size-3" /> Élément (•)
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────── */
export function ProtocolEditor({ department = "rh" }: { department?: string }) {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const userId = auth?.user?.id;

  const [view, setView] = useState<"list" | "new" | string>("list");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const eyebrow = department === "aadf" ? "AADF" : "Ressources Humaines";

  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ["protocoles-accord", department],
    queryFn: async () => {
      const { data, error } = await db
        .from("protocoles_accord")
        .select("*")
        .eq("department", department)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProtocolRecord[];
    },
  });

  const editing = view !== "list" && view !== "new"
    ? protocols.find((p) => p.id === view) : null;

  const save = useMutation({
    mutationFn: async ({ s, id }: { s: ProtocolState; id?: string }) => {
      const payload = {
        department,
        protocol_title: s.protocolTitle,
        location: s.location || null,
        date: s.date || null,
        party2_name: s.party2Name || null,
        party2_address: s.party2Address || null,
        party2_id_number: s.party2IdNumber || null,
        party2_alias: s.party2Alias || null,
        party2_role: s.party2Role || null,
        articles: s.articles,
        signatory_title: s.signatoryTitle || null,
        status: s.status,
      };
      if (id) {
        const { error } = await db.from("protocoles_accord").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("protocoles_accord").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Protocole modifié" : "Protocole enregistré");
      qc.invalidateQueries({ queryKey: ["protocoles-accord", department] });
      setView("list");
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("protocoles_accord").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Protocole supprimé");
      qc.invalidateQueries({ queryKey: ["protocoles-accord", department] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  function doPrint(r: ProtocolRecord) {
    printProtocol(recordToState(r));
  }

  if (view === "new" || view !== "list") {
    const isEdit = !!editing;
    return (
      <>
        <PageHeader eyebrow={eyebrow}
          title={isEdit ? `Modifier — ${editing!.protocol_title}` : "Nouveau protocole d'accord"}
          description="Rédigez le protocole article par article, puis imprimez-le." />
        <ProtocolForm
          initial={editing ? recordToState(editing) : makeDefault()}
          saving={save.isPending}
          onCancel={() => setView("list")}
          onSave={(s) => save.mutate({ s, id: editing?.id })}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow={eyebrow} title="Protocoles d'accord"
        description="Gérez les protocoles d'accord signés ou en cours de rédaction." />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setView("new")}><Plus className="mr-2 size-4" /> Nouveau protocole</Button>
      </div>

      <Panel title={`${protocols.length} protocole${protocols.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : protocols.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucun protocole enregistré.
          </div>
        ) : (
          <ul className="space-y-2">
            {protocols.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.protocol_title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[r.status] ?? "bg-muted"}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {r.party2_name && <span>{r.party2_name}</span>}
                    {r.date && <span>{new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR")}</span>}
                    <span>Créé le {fmtDateShort(r.created_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => doPrint(r)}>
                    <Printer className="mr-1 size-3.5" /> Imprimer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setView(r.id)}>Modifier</Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                    onClick={() => setPendingDeleteId(r.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer ce protocole ?"
        description="Cette action est irréversible."
        onConfirm={() => { if (pendingDeleteId) del.mutate(pendingDeleteId); setPendingDeleteId(null); }}
        loading={del.isPending}
      />
    </>
  );
}
