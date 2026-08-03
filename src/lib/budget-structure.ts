export type BudgetRow = {
  id: string;
  label: string;
  type: "section" | "sub" | "item";
  parentId?: string;
};

export const BUDGET_ROWS: BudgetRow[] = [
  { id: "produits", label: "PRODUITS (recettes)", type: "section" },
  { id: "pi", label: "Prestations informatiques", type: "sub", parentId: "produits" },
  { id: "pi1", label: "Développement web et mobile", type: "item", parentId: "pi" },
  { id: "pi2", label: "Maintenance et infogerance (abonnements)", type: "item", parentId: "pi" },
  { id: "pi3", label: "Intégration et assistance technique", type: "item", parentId: "pi" },
  { id: "pi4", label: "Vente de matériel informatique", type: "item", parentId: "pi" },
  { id: "ae", label: "Accompagnement des étudiants", type: "sub", parentId: "produits" },
  { id: "ae1", label: "Frais de dossier et orientation", type: "item", parentId: "ae" },
  { id: "ae2", label: "Pack installation (accueil, logement, démarches)", type: "item", parentId: "ae" },
  { id: "ae3", label: "Commissions écoles partenaires", type: "item", parentId: "ae" },
  { id: "ri", label: "Rezo Immo", type: "sub", parentId: "produits" },
  { id: "ri1", label: "Commissions et abonnements annonces", type: "item", parentId: "ri" },
  { id: "ap", label: "Autres produits", type: "sub", parentId: "produits" },
  { id: "ap1", label: "Formations en informatique", type: "item", parentId: "ap" },
  { id: "ap2", label: "Produits divers", type: "item", parentId: "ap" },

  { id: "charges", label: "CHARGES (dépenses)", type: "section" },
  { id: "cs", label: "Charges de structure", type: "sub", parentId: "charges" },
  { id: "cs1", label: "Domiciliation (Maroc)", type: "item", parentId: "cs" },
  { id: "cs2", label: "Loyer et charges bureau (Brazzaville)", type: "item", parentId: "cs" },
  { id: "cs3", label: "Assurances", type: "item", parentId: "cs" },
  { id: "cs4", label: "Frais bancaires", type: "item", parentId: "cs" },
  { id: "per", label: "Personnel", type: "sub", parentId: "charges" },
  { id: "per1", label: "Salaires nets", type: "item", parentId: "per" },
  { id: "per2", label: "Charges sociales CNSS", type: "item", parentId: "per" },
  { id: "per3", label: "Prestataires et freelances", type: "item", parentId: "per" },
  { id: "ct", label: "Charges techniques", type: "sub", parentId: "charges" },
  { id: "ct1", label: "Hébergement et serveurs", type: "item", parentId: "ct" },
  { id: "ct2", label: "Noms de domaine", type: "item", parentId: "ct" },
  { id: "ct3", label: "Licences et abonnements logiciels", type: "item", parentId: "ct" },
  { id: "ct4", label: "Téléphonie et internet", type: "item", parentId: "ct" },
  { id: "mk", label: "Marketing et commercial", type: "sub", parentId: "charges" },
  { id: "mk1", label: "Publicité en ligne", type: "item", parentId: "mk" },
  { id: "mk2", label: "Impression (affiches, flyers, one-pagers)", type: "item", parentId: "mk" },
  { id: "mk3", label: "Location de salle (séances d'information)", type: "item", parentId: "mk" },
  { id: "mk4", label: "Salons et événements", type: "item", parentId: "mk" },
  { id: "mk5", label: "Création graphique et contenus", type: "item", parentId: "mk" },
  { id: "hc", label: "Honoraires et conformité", type: "sub", parentId: "charges" },
  { id: "hc1", label: "Expert-comptable", type: "item", parentId: "hc" },
  { id: "hc2", label: "Conseil juridique", type: "item", parentId: "hc" },
  { id: "hc3", label: "Dépôt de marques OMPIC", type: "item", parentId: "hc" },
  { id: "hc4", label: "Formalités CNDP", type: "item", parentId: "hc" },
  { id: "hc5", label: "Frais de greffe et documents officiels", type: "item", parentId: "hc" },
  { id: "hc6", label: "Traductions et légalisations", type: "item", parentId: "hc" },
  { id: "dep", label: "Déplacements", type: "sub", parentId: "charges" },
  { id: "dep1", label: "Transport Maroc - Congo", type: "item", parentId: "dep" },
  { id: "dep2", label: "Déplacements locaux", type: "item", parentId: "dep" },
  { id: "dep3", label: "Hébergement et restauration missions", type: "item", parentId: "dep" },
  { id: "imp", label: "Impôts et taxes", type: "sub", parentId: "charges" },
  { id: "imp1", label: "Taxe professionnelle", type: "item", parentId: "imp" },
  { id: "imp2", label: "Acomptes IS", type: "item", parentId: "imp" },
  { id: "imp3", label: "Autres impôts et taxes", type: "item", parentId: "imp" },
  { id: "div", label: "Divers", type: "sub", parentId: "charges" },
  { id: "div1", label: "Fournitures et petit équipement", type: "item", parentId: "div" },
  { id: "div2", label: "Imprévus", type: "item", parentId: "div" },
];

export const MONTHS_SHORT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
export const MONTHS_FULL = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export type Vals = Record<string, number[]>;

export function initVals(): Vals {
  const v: Vals = {};
  BUDGET_ROWS.forEach((r) => { if (r.type === "item") v[r.id] = Array(12).fill(0); });
  return v;
}

export function computeAll(vals: Vals): Vals {
  const r: Vals = {};
  BUDGET_ROWS.forEach((row) => {
    if (row.type === "item") r[row.id] = (vals[row.id] || Array(12).fill(0)).map((v) => Number(v) || 0);
  });
  BUDGET_ROWS.forEach((row) => {
    if (row.type === "sub") {
      const items = BUDGET_ROWS.filter((x) => x.type === "item" && x.parentId === row.id);
      const tot = Array(12).fill(0);
      items.forEach((it) => r[it.id]?.forEach((v, i) => { tot[i] += v; }));
      r[row.id] = tot;
    }
  });
  BUDGET_ROWS.forEach((row) => {
    if (row.type === "section") {
      const subs = BUDGET_ROWS.filter((x) => x.type === "sub" && x.parentId === row.id);
      const tot = Array(12).fill(0);
      subs.forEach((sub) => r[sub.id]?.forEach((v, i) => { tot[i] += v; }));
      r[row.id] = tot;
    }
  });
  return r;
}

export function rowTotal(computed: Vals, id: string): number {
  return (computed[id] || []).reduce((a, b) => a + b, 0);
}

export function fmt(n: number, dashZero = true): string {
  if (dashZero && n === 0) return "-";
  return n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
