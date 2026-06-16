import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, Plus, Users, Building2, User, Pencil, Trash2, Phone, Mail, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/secretaire/clients")({
  component: SecretaireClients,
});

type ClientType = "particulier" | "entreprise";
type FilterType = "tous" | ClientType;

interface ClientForm {
  type: ClientType;
  prenom: string;
  nom: string;
  nom_entreprise: string;
  email: string;
  telephone: string;
  adresse_physique: string;
  description_besoins: string;
  observations: string;
}

const EMPTY_FORM: ClientForm = {
  type: "particulier",
  prenom: "",
  nom: "",
  nom_entreprise: "",
  email: "",
  telephone: "",
  adresse_physique: "",
  description_besoins: "",
  observations: "",
};

function SecretaireClients() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  const [filter, setFilter] = useState<FilterType>("tous");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", filter],
    queryFn: async () => {
      let q = supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (filter !== "tous") q = q.eq("type", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  function setField<K extends keyof ClientForm>(key: K, val: ClientForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setOpen(true);
  }

  function openEdit(c: typeof clients[0]) {
    setForm({
      type: c.type as ClientType,
      prenom: c.prenom ?? "",
      nom: c.nom ?? "",
      nom_entreprise: c.nom_entreprise ?? "",
      email: c.email ?? "",
      telephone: c.telephone ?? "",
      adresse_physique: c.adresse_physique ?? "",
      description_besoins: c.description_besoins ?? "",
      observations: c.observations ?? "",
    });
    setEditId(c.id);
    setOpen(true);
  }

  const saveClient = useMutation({
    mutationFn: async () => {
      const isParticulier = form.type === "particulier";
      if (isParticulier && !form.prenom.trim() && !form.nom.trim()) {
        throw new Error("Veuillez saisir le nom ou prénom du client.");
      }
      if (!isParticulier && !form.nom_entreprise.trim()) {
        throw new Error("Le nom de l'entreprise est obligatoire.");
      }

      const payload = {
        type: form.type,
        prenom: isParticulier ? form.prenom.trim() || null : null,
        nom: isParticulier ? form.nom.trim() || null : null,
        nom_entreprise: !isParticulier ? form.nom_entreprise.trim() || null : null,
        email: form.email.trim() || null,
        telephone: form.telephone.trim() || null,
        adresse_physique: form.adresse_physique.trim() || null,
        description_besoins: form.description_besoins.trim() || null,
        observations: form.observations.trim() || null,
      };

      if (editId) {
        const { error } = await supabase
          .from("clients")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert({
          ...payload,
          created_by: uid,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Client mis à jour" : "Client enregistré");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["secretaire-stats"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client supprimé");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["secretaire-stats"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  function clientDisplayName(c: typeof clients[0]) {
    if (c.type === "entreprise") return c.nom_entreprise ?? "—";
    return [c.prenom, c.nom].filter(Boolean).join(" ") || "—";
  }

  return (
    <>
      <PageHeader
        eyebrow="Secrétariat"
        title="Gestion des clients"
        description="Enregistrez et gérez les clients particuliers et entreprises."
      />

      {/* Filtres + bouton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 text-sm">
          {(["tous", "particulier", "entreprise"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-4 py-1.5 font-medium transition capitalize ${
                filter === f ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              {f === "tous" ? "Tous" : f === "particulier" ? "Particuliers" : "Entreprises"}
            </button>
          ))}
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 size-4" /> Nouveau client
        </Button>
      </div>

      {/* Liste */}
      <Panel title={`${clients.length} client${clients.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            Aucun client enregistré.
          </div>
        ) : (
          <ul className="space-y-3">
            {clients.map((c) => (
              <li key={c.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start gap-4">
                  {/* Icône type */}
                  <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    c.type === "entreprise"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {c.type === "entreprise"
                      ? <Building2 className="size-5" />
                      : <User className="size-5" />
                    }
                  </div>

                  {/* Infos principales */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{clientDisplayName(c)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        c.type === "entreprise"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {c.type === "entreprise" ? "Entreprise" : "Particulier"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" /> {c.email}
                        </span>
                      )}
                      {c.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" /> {c.telephone}
                        </span>
                      )}
                      {c.adresse_physique && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" /> {c.adresse_physique}
                        </span>
                      )}
                    </div>
                    {c.description_besoins && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Besoins :</span>{" "}
                        {c.description_besoins}
                      </div>
                    )}
                    {c.observations && (
                      <div className="mt-1 text-xs italic text-muted-foreground">
                        « {c.observations} »
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDeleteId(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Type de client</label>
              <Select value={form.type} onValueChange={(v) => setField("type", v as ClientType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particulier">Particulier</SelectItem>
                  <SelectItem value="entreprise">Entreprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Champs conditionnels */}
            {form.type === "particulier" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Prénom</label>
                  <Input
                    placeholder="Prénom"
                    value={form.prenom}
                    onChange={(e) => setField("prenom", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Nom</label>
                  <Input
                    placeholder="Nom de famille"
                    value={form.nom}
                    onChange={(e) => setField("nom", e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Nom de l'entreprise <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Raison sociale"
                  value={form.nom_entreprise}
                  onChange={(e) => setField("nom_entreprise", e.target.value)}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Adresse e-mail</label>
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Téléphone</label>
              <Input
                type="tel"
                placeholder="+212 6 00 00 00 00"
                value={form.telephone}
                onChange={(e) => setField("telephone", e.target.value)}
              />
            </div>

            {/* Adresse physique */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Adresse physique</label>
              <Input
                placeholder="Rue, ville, code postal..."
                value={form.adresse_physique}
                onChange={(e) => setField("adresse_physique", e.target.value)}
              />
            </div>

            {/* Description des besoins */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description des besoins</label>
              <Textarea
                rows={3}
                placeholder="Décrivez les besoins du client..."
                value={form.description_besoins}
                onChange={(e) => setField("description_besoins", e.target.value)}
              />
            </div>

            {/* Observations */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Observations</label>
              <Textarea
                rows={2}
                placeholder="Notes internes, remarques..."
                value={form.observations}
                onChange={(e) => setField("observations", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveClient.mutate()} disabled={saveClient.isPending}>
              {saveClient.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editId ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Supprimer ce client ?"
        description="Cette action est irréversible. Le client sera définitivement supprimé."
        onConfirm={() => {
          if (pendingDeleteId) deleteClient.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        loading={deleteClient.isPending}
      />
    </>
  );
}
