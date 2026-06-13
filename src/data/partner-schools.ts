export type SchoolSeed = {
  name: string;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  programs: ProgramSeed[];
};

export type ProgramSeed = {
  name: string;
  description?: string;
  domain?: string;
  level?: string;
  duration?: string;
  language?: string;
  requirements?: string;
};

export const PARTNER_SCHOOLS: SchoolSeed[] = [
  // ─────────────── GROUPE MIAGE CASABLANCA ───────────────
  {
    name: "Groupe Miage Établissement Privé",
    logo_url: null,
    address: "64, Rue Allal Ben Abdellah 20000 Casablanca",
    city: "Casablanca",
    country: "Maroc",
    website: "groupemiage.net",
    email: "miagecasa@groupemiage.net",
    phone: "+212 522-279600",
    description: "Un établissement d'excellence dédié à l'enseignement technologique avec des programmes innovants et des partenariats industriels.",
    programs: [
      { name: "Développement Informatique", description: "Prépare des développeurs polyvalents capables de concevoir, coder et maintenir des applications web, mobiles et desktop.", domain: "Informatique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat scientifique ou technique | Dossier | Test logique & motivation | Entretien" },
      { name: "Systèmes & Réseaux Informatiques", description: "Forme des spécialistes capables de déployer, administrer et sécuriser des infrastructures réseau et systèmes d'exploitation.", domain: "Informatique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat scientifique/technique | Dossier + entretien | Test réseau de base" },
      { name: "Finance & Comptabilité", description: "Prépare des professionnels capables de tenir la comptabilité, réaliser l'analyse financière et appuyer la gestion budgétaire.", domain: "Gestion-Financière", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Bac économique ou scientifique | Dossier scolaire | Test de math financières | Entretien" },
      { name: "Gestion Informatisée", description: "Combine informatique de gestion, bureautique avancée et bases de données pour automatiser les processus administratifs.", domain: "Gestion-Informatisée", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Bac sciences économiques ou techniques | Dossier + entretien" },
      { name: "Transport & Logistique", description: "Couvre la planification des flux, la gestion d'entrepôt, le transport multimodal et la logistique durable.", domain: "Logistique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat (toutes séries) | Dossier académique | Entretien de motivation" },
      { name: "Management & Gestion des PME", description: "Forme des cadres intermédiaires capables de gérer les fonctions clés et d'accompagner la croissance des PME.", domain: "Gestion-Entreprise", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat économique ou scientifique | Dossier + entretien" },
      { name: "Assistant de Gestion Ressources Humaines", description: "Prépare à la gestion administrative du personnel, au recrutement et à la formation.", domain: "Ressources-Humaines", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat | Dossier | Entretien" },
      { name: "Finance", description: "Spécialise en comptabilité financière, analyse de performance et gestion de trésorerie.", domain: "Finances", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac ES, S ou équivalent | Test quantitatif | Entretien" },
      { name: "Informatique Réseau & Sécurité", description: "Donne les bases solides pour installer, administrer et sécuriser des réseaux et des systèmes.", domain: "Sécurité-Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique/technique | Dossier + test technique" },
      { name: "Marketing Digital", description: "Couvre les leviers web (SEO, SEA, social media, email) pour concevoir et piloter des campagnes marketing.", domain: "Marketing-Digital", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac toutes séries | Dossier + entretien | Portfolio digital (souhaité)" },
      { name: "Marketing", description: "Initie aux études de marché, au mix-marketing et au développement produit.", domain: "Marketing", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac ES, STMG ou équivalent | Dossier + entretien" },
      { name: "Informatique & Réseau – Administration Système & Réseau", description: "Approfondit l'administration des serveurs, la virtualisation et la sécurité pour assurer la haute disponibilité des infrastructures.", domain: "Sécurité-Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique/technique | Dossier + test réseau/système" },
      { name: "Informatique & Réseau – Développement de Bases de Données", description: "Spécialise en conception, optimisation et administration de bases de données relationnelles et NoSQL.", domain: "Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique/technique | Dossier + test SQL | Entretien" },
      { name: "Développement Web", description: "Forme des développeurs capables de réaliser des sites et applications web responsive, performantes et sécurisées.", domain: "Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique/technique ou équivalent | Dossier + test de code | Entretien" },
      { name: "Manager de Projet Informatique", description: "Formation de haut niveau pour piloter des projets IT complexes : cadrage des besoins, planification, gestion d'équipes techniques.", domain: "Management-Informatique", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence en informatique ou gestion | Dossier académique | Entretien | Niveau B2 en anglais recommandé" },
      { name: "Expert IT Cybersécurité", description: "Programme spécialisé pour prévenir, détecter et contrer les menaces numériques : audit de sécurité, cryptographie, réponse à incident.", domain: "Cyber-Sécurité", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence en informatique ou réseaux | Connaissances réseaux/OS | Dossier + entretien | Test technique de sécurité" },
      { name: "Expert IT Applications Intelligence Artificielle & Big Data", description: "Formation pointue sur la data science, le machine learning et les architectures Big Data.", domain: "Data-IA", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence en informatique, mathématiques ou statistique | Compétences Python/SQL | Dossier + entretien + test de logique" },
      { name: "Management Environnemental & Énergie", description: "Prépare des cadres capables de concilier performance économique et développement durable.", domain: "Environnement-Energie", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence scientifique ou ingénierie | Dossier + projet professionnel | Entretien | Niveau B2 en anglais" },
      { name: "Management et Stratégie d'Entreprise", description: "Forme des dirigeants capables de définir et piloter la stratégie globale d'une organisation.", domain: "Gestion-Entreprise", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence en gestion, économie ou équivalent | Dossier + entretien | Test de management" },
      { name: "Communication & Marketing Numérique", description: "Couvre le branding, la publicité digitale, les médias sociaux et l'analyse de données.", domain: "Communication", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence communication, marketing ou équivalent | Portfolio ou projet digital | Dossier + entretien" },
      { name: "Management et Stratégie Financière", description: "Prépare des experts à la décision financière stratégique, à la gestion des risques et aux fusions-acquisitions.", domain: "Finances", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence finance, économie ou gestion | Test quantitatif | Dossier académique solide | Entretien" },
      { name: "Management des Ressources Humaines", description: "Développe les compétences pour attirer, fidéliser et développer les talents, gérer la relation sociale.", domain: "Ressources-Humaines", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence RH, psychologie ou gestion | Dossier + entretien | Test de personnalité" },
      { name: "Logistique et Supply Chain", description: "Forme des experts capables d'optimiser les flux physiques et d'information à l'échelle internationale.", domain: "Logistique", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence logistique, ingénierie ou gestion | Connaissances de base en statistiques | Dossier + entretien" },
    ],
  },

  // ─────────────── COM'SUP ───────────────
  {
    name: "Com'Sup École Supérieure de Communication et de Publicité",
    logo_url: null,
    address: "15 Rue Abderrahmane Abi Laïla, Casablanca",
    city: "Casablanca",
    country: "Maroc",
    website: "comsup.ma",
    email: "comsup@comsup.ma",
    phone: "+(212) 05 22 47 30 67",
    description: "Depuis plus de 20 ans, Com'Sup accompagne le secteur de la communication au Maroc. Pionnier dans ce domaine, Com'Sup a formé plus de 1000 managers de la communication.",
    programs: [
      { name: "Événementiel", description: "Prépare à l'organisation professionnelle d'évènements, de la conception à la logistique.", domain: "Communication", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat toutes séries | Dossier de candidature | Entretien de motivation" },
      { name: "Communication des Organisations (Bac+3)", description: "Développe des compétences pour gérer la communication interne et externe d'une entreprise ou d'une institution.", domain: "Communication", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat toutes séries | Dossier + entretien" },
      { name: "Communication des Organisations (Bac+5)", description: "Approfondissement des stratégies de communication institutionnelle et de l'influence dans les grandes organisations.", domain: "Communication", level: "Master", duration: "2 ans", language: "Français", requirements: "Licence en communication ou domaine connexe | Entretien de motivation | Dossier académique" },
      { name: "Communication, Médias et Journalisme", description: "Formation avancée pour maîtriser les codes du journalisme et les médias numériques dans une approche stratégique et éthique.", domain: "Communication", level: "Master", duration: "2 ans", language: "Français", requirements: "Licence en communication, journalisme ou équivalent | Entretien + épreuve rédactionnelle" },
    ],
  },

  // ─────────────── BEST INSTITUT ───────────────
  {
    name: "Best Institut École de Formation Professionnelle Privée",
    logo_url: null,
    address: "95 Bd Mohammed V, Casablanca 20250",
    city: "Casablanca",
    country: "Maroc",
    website: "bestinstitut.com",
    email: "Contact@bestinstitut.com",
    phone: "+212 5 22 54 15 47",
    description: "Best Institut porte une attention particulière sur l'avenir de ses étudiants et leurs responsabilités, en leur assurant une meilleure opportunité de recrutement en entreprise.",
    programs: [
      { name: "Technicien Gestion Informatisée", description: "Initie à l'administration de bases de données, aux ERP et à la bureautique avancée.", domain: "Gestion-Informatisée", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Dossier + entretien" },
      { name: "Technicien en Infographie", description: "Forme à la création de supports visuels (print & digital), au pré-presse et à la retouche photo.", domain: "Infographie", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Portfolio créatif | Dossier + entretien" },
      { name: "Technicien Action Commerciale & Marketing", description: "Prépare des commerciaux capables de prospecter, négocier et promouvoir des offres.", domain: "Marketing", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Dossier + entretien" },
      { name: "Technicien Spécialisé Finance & Comptabilité", description: "Développe les compétences pour gérer la comptabilité générale, établir les états financiers et réaliser l'analyse budgétaire.", domain: "Gestion-Financière", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat (toutes séries) | Relevés de notes Bac | Dossier + entretien" },
      { name: "Technicien Spécialisé Commerce International", description: "Forme à la gestion des opérations import-export, négociation internationale et logistique douanière.", domain: "Commerce", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Relevés Bac | Dossier + entretien" },
      { name: "Technicien Spécialisé Développement Multimédia", description: "Apprend à concevoir sites web interactifs, animations et contenus digitaux.", domain: "Multimédia", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Test logique/HTML-CSS | Dossier + entretien" },
      { name: "Bachelor Gestion & Management de la Distribution", description: "Prépare à la gestion d'unités commerciales (GMS/retail) : merchandising, supply-chain et management d'équipe.", domain: "Commerce", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat pour 3 ans ou Bac+2 commerce pour entrée directe | Dossier + entretien" },
      { name: "Bachelor Management & Gestion des PME", description: "Donne les outils pour piloter la stratégie, la finance et les RH d'une petite ou moyenne entreprise.", domain: "Gestion-Entreprise", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 gestion | Dossier + entretien" },
      { name: "Bachelor Webmaster", description: "Forme à la création, la maintenance et l'optimisation de sites web, incluant HTML/CSS, CMS et web-analytics.", domain: "Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 informatique | Dossier + test web | Entretien" },
      { name: "Bachelor Informatique & Réseaux", description: "Couvre réseaux, systèmes et développement pour administrer infrastructures IT et assurer la cybersécurité.", domain: "Sécurité-Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat scientifique/technique ou Bac+2 IT | Test technique réseau | Entretien" },
      { name: "Bachelor Marketing", description: "Explore le marketing stratégique et opérationnel, l'étude de marché et la communication digitale.", domain: "Marketing", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 commerce/marketing | Dossier + entretien" },
      { name: "Bachelor Transport & Logistique", description: "Prépare à l'organisation des flux, la réglementation internationale et l'optimisation des coûts logistiques.", domain: "Logistique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 logistique | Dossier + entretien" },
      { name: "Bachelor Finance", description: "Initie aux fondamentaux de la comptabilité, de la gestion de trésorerie et de l'analyse financière.", domain: "Finances", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 économie/gestion | Test logique | Entretien" },
      { name: "Bachelor Techniques Numériques & Multimédia", description: "Combine développement web, audiovisuel et design interactif pour produire des contenus innovants.", domain: "Multimédia", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 multimédia/design | Portfolio digital | Entretien" },
    ],
  },

  // ─────────────── CESA SUP ───────────────
  {
    name: "CESA Centre d'Enseignement des Sciences Appliquées Sup",
    logo_url: null,
    address: "15 Rue de Champigny (Rond point Cimicolor), 20000 Casablanca",
    city: "Casablanca",
    country: "Maroc",
    website: "cesasup.ma",
    email: "contact@cesa.ma",
    phone: "+212 522-444180",
    description: "Un établissement de premier plan spécialisé dans les formations commerciales, marketing et management, offrant des programmes adaptés aux exigences du marché.",
    programs: [
      { name: "Technicien Marketing & Action Commerciale", description: "Initie aux techniques de prospection, de négociation et de promotion des ventes.", domain: "Commerce", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Dossier + entretien" },
      { name: "Technicien Gestion Informatisée", description: "Forme à la gestion de bases de données et à la bureautique avancée pour optimiser les flux d'information en entreprise.", domain: "Gestion-Informatisée", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Dossier + entretien" },
      { name: "Technicien Maintenance & Support Technique", description: "Prépare à diagnostiquer et dépanner le matériel informatique, installer OS et assurer le support technique N1/N2.", domain: "Informatique", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Test logique | Dossier + entretien" },
      { name: "Technicien Spécialisé Analyste Marketing", description: "Développe la capacité d'analyser données marché, segmenter clientèle et piloter campagnes ciblées.", domain: "Marketing", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Relevés Bac | Dossier + entretien" },
      { name: "Technicien Spécialisé Commerce International", description: "Forme à la gestion des opérations import-export, négociation internationale et logistique douanière.", domain: "Commerce", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Relevés Bac | Dossier + entretien" },
      { name: "Technicien Spécialisé Finance & Comptabilité", description: "Initie à la tenue de comptabilité, l'établissement des états financiers et l'analyse budgétaire.", domain: "Comptabilité", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Relevés Bac | Dossier + entretien" },
      { name: "Technicien Spécialisé Systèmes & Réseaux Informatique", description: "Couvre l'installation, la sécurisation et la supervision d'infrastructures réseau et serveurs.", domain: "Sécurité-Informatique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat scientifique/technique | Test réseau | Entretien" },
      { name: "Technicien Spécialisé Marketing Digital", description: "Apprend à déployer campagnes SEO/SEA, gérer réseaux sociaux et analyser données web.", domain: "Marketing-Digital", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Portfolio digital | Dossier + entretien" },
      { name: "Technicien Spécialisé Développeur Full Stack", description: "Forme à la conception d'applications web front-end & back-end en environnement JavaScript.", domain: "Informatique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Test logique/JS | Dossier + entretien" },
      { name: "Bachelor Informatique & Réseaux", description: "Couvre réseaux, systèmes et cybersécurité pour administrer infrastructures IT complexes.", domain: "Sécurité-Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique/technique ou Bac+2 IT | Test réseau | Entretien" },
      { name: "Bachelor Marketing International", description: "Développe les compétences pour élaborer stratégies marketing globales, adapter produits et gérer exportations.", domain: "Marketing", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 commerce/marketing | Dossier + entretien" },
      { name: "Bachelor Transport Logistique", description: "Forme à la planification des flux, à la réglementation internationale et aux outils digitaux de la supply-chain.", domain: "Logistique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 logistique | Dossier + entretien" },
      { name: "Bachelor Finance & Contrôle de Gestion", description: "Apprend à maîtriser la comptabilité, l'analyse financière et le pilotage de la performance.", domain: "Finances", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 économie/gestion | Test logique | Entretien" },
      { name: "Master Informatique", description: "Spécialise en développement logiciel, IA et cybersécurité pour concevoir des solutions innovantes.", domain: "Informatique", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence informatique ou Bac+2 IT pour 3 ans | Test technique | Entretien" },
      { name: "Master Management & Stratégie d'Entreprise", description: "Prépare à piloter la stratégie, le changement organisationnel et la performance globale.", domain: "Gestion-Entreprise", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence gestion ou Bac+2 pour 3 ans | Dossier + entretien" },
      { name: "Master E-communication", description: "Spécialise en communication digitale, UX et médias sociaux pour construire la visibilité des marques.", domain: "Communication", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence communication/marketing ou Bac+2 pour 3 ans | Portfolio digital | Entretien" },
      { name: "Master Logistique", description: "Couvre la stratégie supply-chain, la digitalisation 4.0 et la logistique durable à l'échelle mondiale.", domain: "Logistique", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence logistique/ingénierie ou Bac+2 pour 3 ans | Test maths/stat | Entretien" },
      { name: "Master Finance Internationale", description: "Forme des experts capables de gérer la trésorerie, l'investissement et les risques sur les marchés mondiaux.", domain: "Finances", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence finance/éco ou Bac+2 pour 3 ans | Test GMAT-like | Entretien" },
    ],
  },

  // ─────────────── EDD ───────────────
  {
    name: "EDD École des Déclarations en Douane",
    logo_url: null,
    address: "12 Rue des Arts, 20000 Casablanca",
    city: "Casablanca",
    country: "Maroc",
    website: "www.edd.ma",
    email: "contact@edd.ma",
    phone: "+212 5 22 22 00 44",
    description: "EDD s'est créée une très bonne réputation dans le domaine de la formation professionnelle grâce à son sérieux et à son corps professoral, avec une expertise dans le domaine du transport, Logistique, Douane, Gestion.",
    programs: [
      { name: "Technicien Déclarant en Douane", description: "Prépare des professionnels capables de traiter les formalités douanières, optimiser les régimes suspensifs et sécuriser la chaîne d'approvisionnement internationale.", domain: "Douane", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Dossier + entretien" },
      { name: "Gestion de Transport & Logistique", description: "Forme des techniciens capables de planifier les opérations de transport, gérer les stocks et optimiser les coûts logistiques.", domain: "Transport-Logistique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat toutes séries | Relevés de notes Bac | Dossier + test logique & entretien" },
      { name: "Licence Professionnelle – Transport & Logistique", description: "Approfondit la conception de réseaux logistiques, la réglementation internationale et la maîtrise des outils numériques.", domain: "Logistique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat pour 3 ans ou Bac+2 pour entrée directe | Dossier académique | Entretien" },
      { name: "Master Européen Logistique", description: "Spécialise en stratégie supply-chain mondiale, digitalisation 4.0 et logistique verte.", domain: "Logistique", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence logistique ou génie industriel | Test maths/statistiques | Dossier + entretien" },
      { name: "Formation Entreprise – Logistique & Douane", description: "Parcours court et modulable destiné aux salariés et cadres visant à mettre à jour leurs compétences en gestion douanière.", domain: "Formation-Continue", level: "Formation Continue", duration: "3–6 mois (modules à la carte)", language: "Français", requirements: "Expérience ≥ 1 an supply-chain | Formulaire d'inscription | Accord employeur le cas échéant" },
    ],
  },

  // ─────────────── ISGA CASABLANCA ───────────────
  {
    name: "ISGA Institut Supérieur d'Ingénierie & des Affaires – Casablanca",
    logo_url: null,
    address: "393, Route EL Jadida – Oasis, Casablanca",
    city: "Casablanca",
    country: "Maroc",
    website: "isga.ma",
    email: null,
    phone: "+(212) 05 22 25 55 96",
    description: "La vocation de l'ISGA est de former des hommes et des femmes créatifs, audacieux, producteurs de valeur pour les entreprises et pour la société.",
    programs: [
      { name: "Design Graphique et Digital (Bac+3)", description: "Formation en création visuelle, UI/UX, motion design, alliant compétences en graphisme et design interactif.", domain: "Multimédia", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac toutes séries | Dossier de candidature | Entretien de motivation" },
      { name: "Architecture d'Intérieur (Bac+3)", description: "Formation pour concevoir et aménager des espaces intérieurs fonctionnels et esthétiques.", domain: "Multimédia", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique ou artistique | Portfolio (souhaité) | Entretien de motivation" },
      { name: "Communication Visuelle (1 an)", description: "Formation accélérée axée sur le branding, la publicité visuelle et le design de l'information.", domain: "Communication", level: "Licence", duration: "1 an", language: "Français", requirements: "Bac+2 en communication ou graphisme | Portfolio | Entretien" },
      { name: "Communication des Organisations (Bac+3)", description: "Prépare à piloter la communication interne et externe des institutions et entreprises.", domain: "Communication", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac toutes séries | Dossier + entretien" },
      { name: "Design Graphique et Digital (Bac+5)", description: "Formation approfondie alliant direction artistique, design UX, et design interactif.", domain: "Multimédia", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence en design/arts visuels | Portfolio | Entretien approfondi" },
      { name: "Architecture d'Intérieur (Bac+5)", description: "Formation pour maîtriser la conception architecturale d'espaces, matériaux et volumes.", domain: "Multimédia", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence architecture ou design | Portfolio | Entretien technique" },
    ],
  },

  // ─────────────── IBEGIS ───────────────
  {
    name: "IBEGIS Institut des Hautes Études de Gestion",
    logo_url: null,
    address: "8 Boulevard Mohammed V, 20250 Casablanca",
    city: "Casablanca",
    country: "Maroc",
    website: "www.ibegis.ma",
    email: "contact@ibegis.ma",
    phone: "+212 5 22 20 20 60",
    description: "Un institut dédié à l'excellence académique en gestion, économie et administration des entreprises, formant les futurs cadres dirigeants.",
    programs: [
      { name: "Technicien Infographiste", description: "Initie à la création visuelle (print & web) : maîtrise des logiciels Adobe, mise en page, retouche photo et animation graphique.", domain: "Infographie", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Portfolio ou test de dessin | Entretien" },
      { name: "Technicien en Gestion Informatisée", description: "Allie bureautique avancée, bases de données et ERP pour automatiser les processus administratifs d'une PME.", domain: "Gestion-Informatisée", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Entretien" },
      { name: "Technicien Assistant en Gestion Administrative & Comptable", description: "Prépare à la tenue des écritures comptables, à la gestion administrative et aux bases de la paie.", domain: "Comptabilité", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Entretien" },
      { name: "Technicien en Action Commerciale & Marketing", description: "Donne les bases de la vente, de la négociation et du marketing opérationnel en environnement multicanal.", domain: "Commerce", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Attestation de scolarité terminale | Relevé de notes terminale | Entretien de motivation" },
      { name: "Technicien Spécialisé Financier Comptable", description: "Forme des professionnels capables de tenir la comptabilité, d'élaborer bilans et d'appuyer l'analyse financière.", domain: "Comptabilité", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat toutes séries | Relevés de notes Bac | Lettre de motivation | Entretien" },
      { name: "Technicien Spécialisé Commerce International", description: "Couvre les opérations d'import-export, la logistique douanière et la gestion des contrats internationaux.", domain: "Commerce", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Relevés de notes | Test d'anglais | Entretien" },
      { name: "Technicien Spécialisé Développement Informatique", description: "Prépare des développeurs full-stack capables de concevoir et maintenir des applications web et mobiles.", domain: "Informatique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat scientifique ou technique | Test de logique & programmation | Entretien" },
      { name: "Management & Gestion des Entreprises", description: "Forme des cadres intermédiaires capables de piloter la performance et le développement d'une PME/ETI.", domain: "Gestion-Entreprise", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat (toutes séries) pour 3 ans | OU Bac+2 pour admission directe en 3ᵉ année | Dossier + entretien" },
      { name: "Marketing & Commerce International", description: "Couvre les études de marché, la négociation export-import et la gestion de marques à l'international.", domain: "Marketing", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 pour entrée parallèle | Dossier + entretien | Niveau B1 en anglais recommandé" },
      { name: "Finance (IBEGIS)", description: "Spécialise en gestion financière, comptabilité internationale et analyse d'investissement.", domain: "Finances", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac ES/S ou Bac+2 filière gestion | Test quantitatif | Entretien" },
      { name: "Logistique & Supply Chain", description: "Prépare des coordinateurs capables d'optimiser les flux, réduire les coûts et intégrer la logistique durable.", domain: "Logistique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 technique | Dossier + entretien | Notions de maths/Stats" },
      { name: "Développeur d'Applications Mobiles", description: "Forme des développeurs Android/iOS capables de concevoir, coder et publier des applications performantes.", domain: "Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique/technique ou Bac+2 IT | Test de programmation | Entretien" },
      { name: "Communication (IBEGIS)", description: "Allie stratégie éditoriale, relations médias et outils digitaux pour construire l'image et la réputation des organisations.", domain: "Communication", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat toutes séries ou Bac+2 | Dossier + entretien | Portfolio rédactionnel (souhaité)" },
      { name: "Informatique, Réseaux & Sécurité", description: "Donne les compétences pour administrer, sécuriser et dépanner des infrastructures réseau de PME/ETI.", domain: "Sécurité-Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique/technique ou Bac+2 IT | Test technique réseau | Entretien" },
      { name: "Marketing Digital (IBEGIS)", description: "Couvre les leviers SEO, SEA, Social Ads et data analytics pour développer la visibilité et le ROI des marques en ligne.", domain: "Marketing-Digital", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat ou Bac+2 commerce/marketing | Dossier + entretien | Portfolio digital (facultatif)" },
      { name: "Communication – Stratégie Publicitaire & Communication Numérique", description: "Développe une expertise pointue en branding, storytelling et campagnes 360°.", domain: "Communication", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence/Bachelor en communication ou marketing | Portfolio créatif | Entretien | Test d'anglais B2" },
      { name: "Management de Projets Informatiques", description: "Allie gouvernance IT, agilité, DevOps et management d'équipe pour conduire des projets logiciels complexes.", domain: "Management-Informatique", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence/Bachelor informatique ou Bac+2 avec expérience IT | Test technique | Entretien" },
      { name: "Management Digital", description: "Prépare des leaders capables de piloter la transformation numérique et l'innovation.", domain: "Digital-Innovation", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence/Bachelor gestion, marketing ou informatique | Projet professionnel digital | Entretien" },
      { name: "Management & Stratégie d'Entreprise (IBEGIS)", description: "Fournit une vision 360° pour élaborer et mettre en œuvre la stratégie globale.", domain: "Gestion-Entreprise", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence en management ou économie | Dossier | Entretien" },
      { name: "Management & Stratégie Financière (IBEGIS)", description: "Spécialise en ingénierie financière, gestion des risques et pilotage de la rentabilité.", domain: "Finances", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence finance/audit | Test quantitatif | Entretien" },
      { name: "Management des Ressources Humaines (IBEGIS)", description: "Forme des experts capables d'attirer, développer et fidéliser les talents tout en alignant la politique RH sur la stratégie globale.", domain: "Ressources-Humaines", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence gestion ou droit | Dossier | Entretien" },
      { name: "Logistique (IBEGIS)", description: "Spécialise en conception, optimisation et digitalisation de la chaîne logistique mondiale avec un focus sur l'industrie 4.0.", domain: "Logistique", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence logistique ou génie industriel | Test maths/Stats | Entretien" },
    ],
  },

  // ─────────────── ART'COM SUP ───────────────
  {
    name: "Art'Com Sup – École d'Architecture d'Intérieur et Design Graphique et Digital",
    logo_url: null,
    address: "Angle rue Moulay Ismail & rue Oujda, Quartier Hassan – Rabat",
    city: "Rabat",
    country: "Maroc",
    website: "ecole-artcom.com",
    email: "artcomrabat@ecole-artcom.com",
    phone: "+(212) 05 37 20 83 31",
    description: "Art'Com Sup est la 1ère école supérieure à Casablanca et Rabat de Design au Maroc accréditée par l'État, offrant des formations diplômantes et certifiantes pour les étudiants et professionnels du domaine.",
    programs: [
      { name: "Formation Continue (Art'Com)", description: "Modules courts et certifiants pour renforcer les compétences professionnelles en communication, design, logiciels, ou management de projets créatifs.", domain: "Formation-Continue", level: "Formation Continue", duration: "6 mois", language: "Français", requirements: "Expérience ou formation préalable | CV | Lettre de motivation" },
      { name: "Design Graphique et Digital (Bac+3)", description: "Formation axée sur la création visuelle, l'identité de marque et les supports numériques.", domain: "Multimédia", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat toutes séries | Portfolio artistique | Entretien de motivation" },
      { name: "Architecture d'Intérieur (Bac+3)", description: "Formation orientée vers l'aménagement d'espaces, l'ergonomie, la décoration et la modélisation 3D.", domain: "Multimédia", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat | Dossier artistique (portfolio ou croquis) | Entretien" },
      { name: "Communication Visuelle Accélérée (Bac+3)", description: "Programme accéléré destiné aux étudiants souhaitant se spécialiser dans la communication graphique.", domain: "Communication", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac+2 en design ou communication | Portfolio | Entretien" },
      { name: "Communication des Organisations (Bac+3)", description: "Prépare à gérer la communication interne et externe des entreprises, les relations presse, et la stratégie de communication globale.", domain: "Communication", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat | Dossier | Entretien" },
      { name: "Design Graphique et Digital (Bac+5)", description: "Formation approfondie axée sur la direction artistique, le branding digital, le motion design et l'expérience utilisateur.", domain: "Multimédia", level: "Master", duration: "2 ans", language: "Français", requirements: "Licence en design graphique ou équivalent | Portfolio | Entretien" },
      { name: "Architecture d'Intérieur (Bac+5)", description: "Approfondissement des techniques de conception architecturale intérieure avec un focus sur l'innovation et la durabilité.", domain: "Multimédia", level: "Master", duration: "2 ans", language: "Français", requirements: "Licence en design ou architecture | Dossier de projet | Entretien" },
    ],
  },

  // ─────────────── GROUP IPCS ───────────────
  {
    name: "Group IPCS Institut Professionnel des Carrières de Santé",
    logo_url: null,
    address: "131, Bd de la Résistance (En face du Lycée Jaber Ben Hayane) – Casablanca",
    city: "Casablanca",
    country: "Maroc",
    website: "ipcsgroupe.com",
    email: "group.ipcs@live.fr",
    phone: "+212 522 44 70 72",
    description: "L'Institut IPCS bénéficie d'une forte expérience et de compétences reconnues dans la formation des professionnels de santé.",
    programs: [
      { name: "Infirmière Polyvalente", description: "Forme des professionnels capables d'évaluer les besoins en soins, d'exécuter prescriptions médicales et d'assurer l'éducation sanitaire.", domain: "Santé", level: "Diplôme d'État", duration: "3 ans", language: "Français", requirements: "Baccalauréat sciences expérimentales ou équivalent | Dossier + test scientifique | Entretien de motivation" },
      { name: "Diététique & Nutrition", description: "Prépare des spécialistes capables d'évaluer, de planifier et de surveiller les régimes nutritionnels à toutes les étapes de la vie.", domain: "Santé", level: "Diplôme d'État", duration: "3 ans", language: "Français", requirements: "Baccalauréat sciences (SVT/PC) | Dossier + test biologie | Entretien" },
      { name: "Infirmière Auxiliaire", description: "Forme des auxiliaires de soins chargés d'assurer l'hygiène, le confort et l'assistance quotidienne des patients.", domain: "Santé", level: "Certificat", duration: "2 ans", language: "Français", requirements: "Niveau terminal ou Bac | Dossier + test aptitude | Entretien" },
      { name: "Délégué Médical", description: "Prépare des commerciaux spécialisés capables de promouvoir médicaments et dispositifs médicaux auprès des professionnels de santé.", domain: "Santé", level: "Certificat Professionnel", duration: "6 mois", language: "Français", requirements: "Bac toutes séries | Expérience commerciale (atout) | Dossier + entretien" },
    ],
  },

  // ─────────────── MONDIAL MEDIA ───────────────
  {
    name: "Mondial Media – École Internationale des Métiers de l'Audiovisuel et de Journalisme",
    logo_url: null,
    address: "Bd Mohamed V, 97 passage Gallinari, 3ème Étage, Casablanca",
    city: "Casablanca",
    country: "Maroc",
    website: null,
    email: "mondialmedia@gmail.com",
    phone: "+212 670-502053",
    description: "Mondial Media est une école internationale des métiers de l'audiovisuel et de journalisme.",
    programs: [
      { name: "Audiovisuel", description: "Offre une formation polyvalente aux différentes techniques de l'audiovisuel, accessible dès le niveau bac.", domain: "Audiovisuel", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Bac toutes séries | Dossier de candidature | Entretien de motivation" },
      { name: "Audiovisuel – Montage", description: "Spécialise les apprenants dans les techniques de montage vidéo et la post-production.", domain: "Audiovisuel", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Bac toutes séries | Bonnes bases en informatique | Dossier + test technique + entretien" },
      { name: "Licence Professionnelle en Audiovisuel et Cinéma", description: "Formation complète combinant théorie et pratique pour former des professionnels du secteur audiovisuel et cinématographique.", domain: "Audiovisuel", level: "Licence", duration: "1 an", language: "Français", requirements: "Bac+2 (BTS, DUT, ou équivalent) | Expérience dans le secteur (atout) | Dossier artistique + entretien" },
      { name: "Master en Audiovisuel", description: "Permet aux étudiants de se spécialiser dans un domaine précis de l'audiovisuel et d'acquérir une expertise de haut niveau.", domain: "Audiovisuel", level: "Master", duration: "2 ans", language: "Français", requirements: "Licence en audiovisuel ou équivalent | Portfolio de projets | Entretien de motivation" },
    ],
  },

  // ─────────────── IPM ───────────────
  {
    name: "IPM Institut Parcours et Métiers",
    logo_url: null,
    address: "66 Bd Hassan Premier, Casablanca 20250",
    city: "Casablanca",
    country: "Maroc",
    website: "ipemfp.net",
    email: "ipemipemcom@gmail.com",
    phone: "+(212) 05 22 27 78 68",
    description: "IPM offre des formations de qualité en gestion d'entreprise et en gestion administrative et comptable, avec un enseignement rigoureux.",
    programs: [
      { name: "Technicien Spécialisé en Gestion d'Entreprise", description: "Prépare des gestionnaires polyvalents capables d'assurer l'administration, la planification et la gestion courante d'une PME ou d'un service.", domain: "Gestion-Entreprise", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Bac toutes séries ou Bac+2 (gestion/économie souhaité) | Dossier de candidature | Entretien de motivation" },
      { name: "Technicien Spécialisé en Gestion Administrative et Comptable", description: "Forme des techniciens aptes à assurer la gestion comptable, le suivi administratif et le respect des obligations fiscales et sociales.", domain: "Comptabilité", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Bac série économique, sciences ou équivalent | Connaissances de base en comptabilité souhaitées | Dossier + test écrit + entretien" },
    ],
  },

  // ─────────────── MIAGE TEMARA ───────────────
  {
    name: "Groupe Miage – Campus de Temara",
    logo_url: null,
    address: "Temara, Rabat-Salé-Kénitra",
    city: "Temara",
    country: "Maroc",
    website: "groupemiage.net",
    email: "temara@groupemiage.net",
    phone: null,
    description: "Le campus de Temara du Groupe Miage, établissement d'excellence dédié à l'enseignement technologique avec des programmes innovants en informatique, gestion et management.",
    programs: [
      { name: "Développement Informatique (Temara)", description: "Prépare des développeurs polyvalents capables de concevoir, coder et maintenir des applications web, mobiles et desktop.", domain: "Informatique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat scientifique ou technique | Dossier de candidature | Test logique & motivation | Entretien" },
      { name: "Finance & Comptabilité (Temara)", description: "Prépare des professionnels capables de tenir la comptabilité, de réaliser l'analyse financière et d'appuyer la gestion budgétaire.", domain: "Gestion-Financière", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Bac économique ou scientifique | Dossier scolaire | Entretien" },
      { name: "Management & Gestion des PME (Temara)", description: "Forme des cadres intermédiaires capables de gérer les fonctions clés et d'accompagner la croissance des PME.", domain: "Gestion-Entreprise", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat économique ou scientifique | Dossier + entretien" },
    ],
  },

  // ─────────────── INGI SUP ───────────────
  {
    name: "INGI SUP Institut Supérieur de Génie Informatique",
    logo_url: null,
    address: null,
    city: "Casablanca",
    country: "Maroc",
    website: "ingisup.ma",
    email: "contact@ingisup.ma",
    phone: null,
    description: "INGI SUP est un établissement spécialisé dans les formations en ingénierie informatique, développement logiciel et nouvelles technologies.",
    programs: [
      { name: "Développement Web & Mobile", description: "Formation intensive en développement web et mobile, couvrant les technologies modernes front-end et back-end.", domain: "Informatique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat | Test technique | Entretien" },
      { name: "Systèmes & Réseaux (INGI)", description: "Formation en administration des systèmes informatiques et réseaux d'entreprise.", domain: "Sécurité-Informatique", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat scientifique | Entretien" },
      { name: "Licence Informatique & Ingénierie Logicielle", description: "Formation approfondie en génie logiciel, architecture des systèmes et gestion de projets informatiques.", domain: "Informatique", level: "Licence", duration: "3 ans", language: "Français", requirements: "Bac scientifique ou Bac+2 IT | Test technique | Entretien" },
    ],
  },

  // ─────────────── INSTITUT SANTINOV ───────────────
  {
    name: "Institut Santinov",
    logo_url: null,
    address: null,
    city: "Casablanca",
    country: "Maroc",
    website: "santinov.com",
    email: "contact@santinov.com",
    phone: null,
    description: "L'Institut Santinov est un établissement spécialisé dans les formations paramédicales et de santé, formant des professionnels compétents pour répondre aux besoins du secteur de la santé.",
    programs: [
      { name: "Soins Infirmiers (Santinov)", description: "Formation complète en soins infirmiers pour exercer dans les hôpitaux, cliniques et structures de santé.", domain: "Santé", level: "Diplôme d'État", duration: "3 ans", language: "Français", requirements: "Baccalauréat sciences | Test médical | Entretien de motivation" },
      { name: "Aide-Soignant", description: "Formation pour devenir aide-soignant et assister les infirmiers dans les soins quotidiens aux patients.", domain: "Santé", level: "Certificat", duration: "1 an", language: "Français", requirements: "Niveau terminale | Entretien de motivation" },
      { name: "Technicien de Laboratoire", description: "Formation pour réaliser des analyses biologiques et biochimiques au service du diagnostic médical.", domain: "Santé", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat sciences (SVT/PC) | Test scientifique | Entretien" },
    ],
  },

  // ─────────────── IGIC (Congo) ───────────────
  {
    name: "IGIC Institut de Gestion Internationale du Congo",
    logo_url: null,
    address: "Brazzaville, République du Congo",
    city: "Brazzaville",
    country: "République du Congo",
    website: "igic.cg",
    email: "contact@igic.cg",
    phone: null,
    description: "L'IGIC est un établissement congolais de référence spécialisé dans les formations en gestion, commerce international et management, formant les futurs cadres d'Afrique centrale.",
    programs: [
      { name: "Gestion des Entreprises (IGIC)", description: "Formation en gestion et management d'entreprise pour former des cadres opérationnels aptes à piloter des organisations en Afrique centrale.", domain: "Gestion-Entreprise", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat | Dossier de candidature | Entretien de motivation" },
      { name: "Commerce International (IGIC)", description: "Formation aux techniques du commerce international, de la négociation et de la logistique pour opérer sur les marchés africains et mondiaux.", domain: "Commerce", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat | Test d'anglais | Entretien" },
      { name: "Management & Stratégie d'Entreprise (IGIC)", description: "Formation avancée en management stratégique pour préparer les futurs dirigeants d'entreprises africaines.", domain: "Gestion-Entreprise", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence en gestion ou économie | Dossier | Entretien" },
    ],
  },

  // ─────────────── VATEL BRAZZAVILLE ───────────────
  {
    name: "Vatel Brazzaville",
    logo_url: null,
    address: "Brazzaville, République du Congo",
    city: "Brazzaville",
    country: "République du Congo",
    website: "vatel.fr",
    email: "contact@vatel-brazzaville.com",
    phone: null,
    description: "Vatel Brazzaville est un établissement de référence en Afrique centrale, spécialisé dans la formation en hôtellerie, restauration et tourisme, affilié au réseau international Vatel.",
    programs: [
      { name: "Technicien en Hôtellerie & Restauration", description: "Formation courte pour acquérir les bases du métier en hôtellerie et restauration.", domain: "Commerce", level: "Technicien", duration: "2 ans", language: "Français", requirements: "Niveau terminale | Entretien de motivation" },
      { name: "Management Hôtelier & Restauration", description: "Formation complète en management hôtelier, couvrant la gestion des établissements, la restauration, le service et l'accueil client.", domain: "Gestion-Entreprise", level: "Licence", duration: "3 ans", language: "Français", requirements: "Baccalauréat | Entretien de motivation | Niveau correct en anglais" },
      { name: "Tourisme & Management de l'Hospitalité", description: "Formation en management du tourisme et de l'hospitalité pour accompagner le développement du secteur touristique africain.", domain: "Gestion-Entreprise", level: "Master", duration: "5 ans", language: "Français", requirements: "Licence hôtellerie/tourisme ou gestion | Entretien de motivation | Niveau B2 anglais" },
    ],
  },
];
