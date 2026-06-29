export type ServiceCatalogItem = {
  label: string;
  hint?: string;
};

export type ServiceCatalogCategory = {
  category: string;
  items: ServiceCatalogItem[];
};

export const SERVICE_CATALOG: ServiceCatalogCategory[] = [
  {
    category: "Création de sites internet",
    items: [
      { label: "Site vitrine essentiel", hint: "100 000 – 175 000 FCFA" },
      { label: "Site vitrine pro", hint: "200 000 – 400 000 FCFA" },
      { label: "Site e-commerce", hint: "500 000 – 750 000 FCFA" },
      { label: "Site sur mesure / portail", hint: "À partir de 850 000 FCFA" },
    ],
  },
  {
    category: "Applications & logiciels sur mesure",
    items: [
      { label: "Cadrage & étude de faisabilité", hint: "50 000 – 150 000 FCFA" },
      { label: "Application mobile simple", hint: "300 000 – 600 000 FCFA" },
      { label: "Application mobile avancée", hint: "800 000 – 1 100 000 FCFA" },
      { label: "Logiciel de gestion (desktop/web)", hint: "500 000 – 1 000 000 FCFA" },
      { label: "Plateforme de gestion institutionnelle", hint: "2 500 000 – 8 000 000+ FCFA" },
      { label: "Maintenance & évolutions", hint: "50 000 – 250 000 FCFA / mois" },
    ],
  },
  {
    category: "Intelligence Artificielle (IA)",
    items: [
      { label: "Chatbot / assistant simple", hint: "150 000 – 250 000 FCFA" },
      { label: "Agent IA métier", hint: "350 000 – 425 000 FCFA" },
      { label: "IA sur mesure / modèle dédié", hint: "À partir de 1 000 000 FCFA" },
      { label: "Abonnement IA (API & maintenance)", hint: "100 000 – 400 000 FCFA / mois" },
    ],
  },
  {
    category: "Autres services numériques",
    items: [
      { label: "Pages professionnelles réseaux sociaux", hint: "50 000 – 150 000 FCFA / page" },
      { label: "Community management", hint: "100 000 – 400 000 FCFA / mois" },
      { label: "Identité visuelle / logo", hint: "75 000 – 300 000 FCFA" },
      { label: "Affiches & supports de communication", hint: "10 000 – 50 000 FCFA" },
      { label: "Automatisation de services", hint: "300 000 – 2 000 000 FCFA" },
      { label: "Formation & accompagnement digital", hint: "50 000 – 150 000 FCFA / jour" },
    ],
  },
  {
    category: "Solutions logicielles prêtes à déployer",
    items: [
      { label: "E-Learning — Gestion scolaire", hint: "175 000 – 225 000 FCFA" },
      { label: "Plateforme de cours en ligne", hint: "125 000 – 160 000 FCFA" },
    ],
  },
  {
    category: "Accompagnement académique",
    items: [
      { label: "Accompagnement des études au Maroc", hint: "75 000 FCFA (pack standard)" },
    ],
  },
  {
    category: "Compléments & abonnements",
    items: [
      { label: "Hébergement annuel", hint: "60 000 – 180 000 FCFA / an" },
      { label: "Nom de domaine" },
      { label: "API tierce (abonnement)" },
      { label: "Support / Maintenance mensuelle" },
      { label: "Autre service (à préciser)" },
    ],
  },
];

export const DEFAULT_INVOICE_CONDITIONS =
  "Paiement : 50 % à la commande, solde à la livraison. Moyens de paiement : MTN Mobile Money, Airtel Money, virement bancaire, espèces. Validité de l'offre : 30 jours à compter de la date d'émission.";
