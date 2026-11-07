import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Loader2, Printer, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/comptabilite/bulletins-paie")({
  component: BulletinsPaie,
});

/* ── Types ─────────────────────────────────────────────────────────────── */
type Line = { id: string; label: string; type: "fixed" | "percent"; value: number };

type Bulletin = {
  id: string;
  personnel_id: string;
  period_month: string;
  salaire_base: number;
  primes: Line[];
  retenues: Line[];
  salaire_brut: number;
  total_retenues: number;
  salaire_net: number;
  note: string | null;
  status: string;
  created_at: string;
  personnel?: {
    full_name: string;
    department: string;
    hire_date: string | null;
    email: string | null;
  };
};

type Personnel = {
  id: string;
  full_name: string;
  department: string;
  hire_date: string | null;
  email: string | null;
  status: string;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
const DEFAULT_RETENUES: Omit<Line, "id">[] = [
  { label: "CNPS (part salariale)", type: "percent", value: 2.8 },
  { label: "IRPP", type: "percent", value: 11 },
];

function getEmptyForm() {
  return {
    personnelId: "",
    periodMonth: new Date().toISOString().slice(0, 7),
    salaireBase: "",
    primes: [] as Line[],
    retenues: DEFAULT_RETENUES.map((r) => ({ ...r, id: crypto.randomUUID() as string })),
    note: "",
    status: "brouillon",
  };
}

function newLine(): Line {
  return { id: crypto.randomUUID() as string, label: "", type: "fixed", value: 0 };
}

function compute(base: number, primes: Line[], retenues: Line[]) {
  const sumPrimes = primes.reduce(
    (s, p) => s + (p.type === "fixed" ? p.value : (base * p.value) / 100),
    0,
  );
  const brut = base + sumPrimes;
  const sumRetenues = retenues.reduce(
    (s, r) => s + (r.type === "fixed" ? r.value : (brut * r.value) / 100),
    0,
  );
  return { brut, totalRetenues: sumRetenues, net: brut - sumRetenues };
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " FCFA";

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

function fmtPeriod(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`;
}

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-amber-100 text-amber-700",
  emis: "bg-green-100 text-green-700",
};

/* ── Print ──────────────────────────────────────────────────────────────── */
function printBulletin(b: Bulletin) {
  const { brut, totalRetenues, net } = compute(b.salaire_base, b.primes, b.retenues);
  const emp = b.personnel;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin de paie — ${emp?.full_name ?? ""} — ${fmtPeriod(b.period_month)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; max-width: 740px; margin: auto; }
    /* ── En-tête ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #15803d; padding-bottom: 12px; margin-bottom: 14px; }
    .header-left { display: flex; flex-direction: column; gap: 2px; }
    .company-name { font-size: 18px; font-weight: bold; color: #15803d; letter-spacing: 1px; text-transform: uppercase; }
    .company-sub { font-size: 9px; color: #555; letter-spacing: 0.5px; }
    .company-info { font-size: 9px; color: #666; margin-top: 4px; line-height: 1.6; }
    .header-right { text-align: right; }
    .bulletin-title { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #111; }
    .bulletin-period { font-size: 10px; color: #15803d; font-weight: 600; margin-top: 3px; }
    .bulletin-ref { font-size: 9px; color: #888; margin-top: 2px; }
    /* ── Corps ── */
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .box { border: 1px solid #ccc; border-radius: 4px; padding: 10px; }
    .box h2 { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #666;
               border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 7px; }
    .row { display: flex; justify-content: space-between; padding: 2.5px 0; border-bottom: 1px solid #f2f2f2; }
    .row:last-child { border-bottom: none; }
    .label { color: #444; }
    .value { font-weight: 500; text-align: right; }
    .plus { color: #16a34a; }
    .minus { color: #dc2626; }
    .summary { margin-top: 14px; border: 2px solid #15803d; border-radius: 4px; padding: 10px; background: #f0fdf4; }
    .s-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .s-row.total { font-weight: bold; font-size: 13px; border-top: 2px solid #15803d; margin-top: 6px; padding-top: 8px; color: #15803d; }
    .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
    .sig-box { border: 1px solid #ccc; padding: 8px; height: 65px; }
    .sig-label { font-size: 9px; color: #888; }
    .footer { margin-top: 16px; font-size: 9px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 6px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <!-- En-tête entreprise -->
  <div class="header">
    <div class="header-left">
      <div class="company-name">Rézo Campus Consulting</div>
      <div class="company-sub">Cabinet de conseil en orientation &amp; accompagnement académique</div>
      <div class="company-info">
        Tél : +242 06 800 01 99 &nbsp;|&nbsp; Email : contact@rezoconnect.com<br>
        RC : 741051 &nbsp;|&nbsp; NIU : MXXXXXXXXXX
      </div>
    </div>
    <div class="header-right">
      <div class="bulletin-title">Bulletin de Paie</div>
      <div class="bulletin-period">Période : ${fmtPeriod(b.period_month)}</div>
      <div class="bulletin-ref">Réf. : BP-${b.period_month.replace("-", "")}-${b.id.slice(0, 6).toUpperCase()}</div>
    </div>
  </div>

  <div class="grid2">
    <div class="box">
      <h2>Informations Employé</h2>
      <div class="row"><span class="label">Nom complet</span><span class="value">${emp?.full_name ?? "—"}</span></div>
      <div class="row"><span class="label">Département</span><span class="value">${emp?.department ?? "—"}</span></div>
      ${emp?.hire_date ? `<div class="row"><span class="label">Date d'entrée</span><span class="value">${new Date(emp.hire_date).toLocaleDateString("fr-FR")}</span></div>` : ""}
      ${emp?.email ? `<div class="row"><span class="label">Email</span><span class="value">${emp.email}</span></div>` : ""}
    </div>
    <div class="box">
      <h2>Rémunération</h2>
      <div class="row"><span class="label">Salaire de base</span><span class="value">${fmt(b.salaire_base)}</span></div>
      ${
        b.primes.length > 0
          ? b.primes
              .map((p) => {
                const amt = p.type === "fixed" ? p.value : (b.salaire_base * p.value) / 100;
                return `<div class="row"><span class="label">${p.label}${p.type === "percent" ? ` (${p.value}%)` : ""}</span><span class="value plus">+ ${fmt(amt)}</span></div>`;
              })
              .join("")
          : ""
      }
    </div>
  </div>

  ${
    b.retenues.length > 0
      ? `
  <div class="box" style="margin-bottom:14px">
    <h2>Retenues &amp; Cotisations</h2>
    ${b.retenues
      .map((r) => {
        const amt = r.type === "fixed" ? r.value : (brut * r.value) / 100;
        return `<div class="row"><span class="label">${r.label}${r.type === "percent" ? ` (${r.value}%)` : ""}</span><span class="value minus">- ${fmt(amt)}</span></div>`;
      })
      .join("")}
  </div>`
      : ""
  }

  <div class="summary">
    <div class="s-row"><span>Salaire brut</span><span>${fmt(brut)}</span></div>
    <div class="s-row" style="color:#dc2626"><span>Total retenues</span><span>- ${fmt(totalRetenues)}</span></div>
    <div class="s-row total"><span>SALAIRE NET À PAYER</span><span>${fmt(net)}</span></div>
  </div>

  ${b.note ? `<div class="box" style="margin-top:14px"><h2>Observations</h2><p style="color:#555;margin-top:4px;font-size:10px">${b.note}</p></div>` : ""}

  <div class="signature">
    <div class="sig-box"><div class="sig-label">Signature de l'employé</div></div>
    <div class="sig-box"><div class="sig-label">Cachet &amp; Signature employeur</div></div>
  </div>

  <div class="footer">Document généré le ${new Date().toLocaleString("fr-FR")} · Rézo Campus</div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=820,height=940");
  if (!w) {
    toast.error("Autorisez les popups pour imprimer");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 400);
}

/* ── LineEditor ─────────────────────────────────────────────────────────── */
function LineEditor({
  lines,
  onChange,
  title,
}: {
  lines: Line[];
  onChange: (l: Line[]) => void;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onChange([...lines, newLine()])}
        >
          <Plus className="mr-1 size-3" /> Ajouter une ligne
        </Button>
      </div>
      {lines.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Aucune ligne — cliquez sur Ajouter.</p>
      )}
      {lines.map((line, i) => (
        <div key={line.id} className="flex gap-2 items-center">
          <Input
            className="flex-1 h-8 text-sm"
            placeholder="Libellé (ex. CNPS, Prime transport…)"
            value={line.label}
            onChange={(e) => {
              const l = [...lines];
              l[i] = { ...l[i], label: e.target.value };
              onChange(l);
            }}
          />
          <Select
            value={line.type}
            onValueChange={(v) => {
              const l = [...lines];
              l[i] = { ...l[i], type: v as "fixed" | "percent" };
              onChange(l);
            }}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Montant fixe</SelectItem>
              <SelectItem value="percent">Pourcentage %</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="w-28 h-8 text-sm"
            type="number"
            min={0}
            step={0.01}
            value={line.value || ""}
            onChange={(e) => {
              const l = [...lines];
              l[i] = { ...l[i], value: parseFloat(e.target.value) || 0 };
              onChange(l);
            }}
            placeholder={line.type === "percent" ? "%" : "FCFA"}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive shrink-0"
            onClick={() => onChange(lines.filter((_, j) => j !== i))}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function BulletinsPaie() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const db = supabase as any;

  const canWrite = auth?.role === "admin" || auth?.role === "comptable";

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [filterPersonnel, setFilterPersonnel] = useState("__all__");
  const [form, setForm] = useState(getEmptyForm);

  const base = parseFloat(form.salaireBase) || 0;
  const { brut, totalRetenues, net } = compute(base, form.primes, form.retenues);

  /* Queries */
  const { data: personnel = [] } = useQuery({
    queryKey: ["personnel-active"],
    queryFn: async () => {
      const { data, error } = await db
        .from("personnel")
        .select("id, full_name, department, hire_date, email, status")
        .order("full_name");
      if (error) throw error;
      return ((data ?? []) as Personnel[]).filter((p) => p.status !== "inactif");
    },
  });

  const { data: bulletins = [], isLoading } = useQuery({
    queryKey: ["bulletins-paie"],
    queryFn: async () => {
      const { data, error } = await db
        .from("bulletins_paie")
        .select("*, personnel(full_name, department, hire_date, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bulletin[];
    },
  });

  const filtered =
    filterPersonnel === "__all__"
      ? bulletins
      : bulletins.filter((b) => b.personnel_id === filterPersonnel);

  /* Handlers */
  function resetAndClose() {
    setOpen(false);
    setEditingId(null);
    setForm(getEmptyForm());
  }

  function openEdit(b: Bulletin) {
    setForm({
      personnelId: b.personnel_id,
      periodMonth: b.period_month,
      salaireBase: String(b.salaire_base),
      primes: b.primes,
      retenues: b.retenues,
      note: b.note ?? "",
      status: b.status,
    });
    setEditingId(b.id);
    setOpen(true);
  }

  /* Mutations */
  const save = useMutation({
    mutationFn: async () => {
      if (!form.personnelId) throw new Error("Sélectionnez un employé");
      if (!form.periodMonth) throw new Error("Période requise");
      if (!base) throw new Error("Salaire de base requis");

      const payload = {
        personnel_id: form.personnelId,
        period_month: form.periodMonth,
        salaire_base: base,
        primes: form.primes,
        retenues: form.retenues,
        salaire_brut: brut,
        total_retenues: totalRetenues,
        salaire_net: net,
        note: form.note || null,
        status: form.status,
        created_by: auth?.user?.id,
      };

      if (editingId) {
        const { error } = await db.from("bulletins_paie").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from("bulletins_paie").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Bulletin modifié" : "Bulletin créé");
      resetAndClose();
      qc.invalidateQueries({ queryKey: ["bulletins-paie"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("bulletins_paie").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bulletin supprimé");
      qc.invalidateQueries({ queryKey: ["bulletins-paie"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Comptabilité"
        title="Bulletins de paie"
        description="Établissez et imprimez les bulletins de salaire du personnel."
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={filterPersonnel} onValueChange={setFilterPersonnel}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tous les employés" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les employés</SelectItem>
            {personnel.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canWrite && (
          <Button
            onClick={() => {
              setForm(getEmptyForm());
              setEditingId(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" /> Nouveau bulletin
          </Button>
        )}
      </div>

      {/* List */}
      <Panel title={`${filtered.length} bulletin${filtered.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun bulletin de paie.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{b.personnel?.full_name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">
                      · {b.personnel?.department}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {fmtPeriod(b.period_month)}
                    </span>
                    <Badge
                      className={`text-[10px] border-0 ${STATUS_COLORS[b.status] ?? "bg-muted"}`}
                    >
                      {b.status === "emis" ? "Émis" : "Brouillon"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                    <span>
                      Brut :{" "}
                      <span className="font-medium text-foreground">{fmt(b.salaire_brut)}</span>
                    </span>
                    <span>
                      Retenues : <span className="text-red-600">{fmt(b.total_retenues)}</span>
                    </span>
                    <span>
                      Net :{" "}
                      <span className="font-semibold text-green-700">{fmt(b.salaire_net)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => printBulletin(b)}
                  >
                    <Printer className="mr-1 size-3.5" /> Imprimer
                  </Button>
                  {canWrite && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(b)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-destructive hover:bg-destructive/10"
                        onClick={() => setPendingDeleteId(b.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Dialog create / edit */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetAndClose();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier le bulletin de paie" : "Nouveau bulletin de paie"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[72vh] pr-3">
            <form
              id="bulletin-form"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-5 py-1"
            >
              {/* Employé + Période */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Employé *</Label>
                  <Select
                    value={form.personnelId}
                    onValueChange={(v) => setForm((f) => ({ ...f, personnelId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnel.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} — {p.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Période *</Label>
                  <Input
                    type="month"
                    value={form.periodMonth}
                    onChange={(e) => setForm((f) => ({ ...f, periodMonth: e.target.value }))}
                  />
                </div>
              </div>

              {/* Salaire de base */}
              <div className="space-y-1.5">
                <Label>Salaire de base (FCFA) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.salaireBase}
                  onChange={(e) => setForm((f) => ({ ...f, salaireBase: e.target.value }))}
                  placeholder="ex. 150 000"
                />
              </div>

              {/* Primes */}
              <div className="rounded-lg border border-border p-4">
                <LineEditor
                  lines={form.primes}
                  title="Primes & Avantages (calculés sur le salaire de base)"
                  onChange={(primes) => setForm((f) => ({ ...f, primes }))}
                />
              </div>

              {/* Retenues */}
              <div className="rounded-lg border border-border p-4">
                <LineEditor
                  lines={form.retenues}
                  title="Retenues & Cotisations (calculées sur le salaire brut)"
                  onChange={(retenues) => setForm((f) => ({ ...f, retenues }))}
                />
              </div>

              {/* Récapitulatif live */}
              <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-1.5 text-sm">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wide">
                  Récapitulatif
                </p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salaire de base</span>
                  <span>{fmt(base)}</span>
                </div>
                {form.primes.length > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>+ Primes &amp; Avantages</span>
                    <span>{fmt(brut - base)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t border-border pt-1.5 mt-1">
                  <span>Salaire brut</span>
                  <span>{fmt(brut)}</span>
                </div>
                {totalRetenues > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>- Retenues &amp; Cotisations</span>
                    <span>{fmt(totalRetenues)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t-2 border-border pt-2 mt-1">
                  <span>Salaire net à payer</span>
                  <span className="text-primary">{fmt(net)}</span>
                </div>
              </div>

              {/* Statut + Note */}
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="brouillon">Brouillon</SelectItem>
                      <SelectItem value="emis">Émis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Note / Observations</Label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
            </form>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>
              Annuler
            </Button>
            <Button type="submit" form="bulletin-form" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Enregistrer les modifications" : "Créer le bulletin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
        title="Supprimer ce bulletin ?"
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
