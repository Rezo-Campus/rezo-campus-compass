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
    name: "Groupe Miage Casa Établissement Privé",
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

  // ─────────────── MIAGE TEMARA ───────────────
  {
    name: "Groupe Miage – Campus de Temara",
    logo_url: null,
    address: "Temara, Rabat-Salé-Kénitra",
    city: "Temara",
    country: "Maroc",
    website: "miagetemara.ma",
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
    name: "INGI SUP",
    logo_url: null,
    address: null,
    city: "Casablanca",
    country: "Maroc",
    website: "ingi-sup.com",
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
    website: "institutsantinov.com",
    email: "contact@santinov.com",
    phone: null,
    description: "L'Institut Santinov est un établissement spécialisé dans les formations paramédicales et de santé, formant des professionnels compétents pour répondre aux besoins du secteur de la santé.",
    programs: [
      { name: "Soins Infirmiers (Santinov)", description: "Formation complète en soins infirmiers pour exercer dans les hôpitaux, cliniques et structures de santé.", domain: "Santé", level: "Diplôme d'État", duration: "3 ans", language: "Français", requirements: "Baccalauréat sciences | Test médical | Entretien de motivation" },
      { name: "Aide-Soignant", description: "Formation pour devenir aide-soignant et assister les infirmiers dans les soins quotidiens aux patients.", domain: "Santé", level: "Certificat", duration: "1 an", language: "Français", requirements: "Niveau terminale | Entretien de motivation" },
      { name: "Technicien de Laboratoire", description: "Formation pour réaliser des analyses biologiques et biochimiques au service du diagnostic médical.", domain: "Santé", level: "Technicien Spécialisé", duration: "2 ans", language: "Français", requirements: "Baccalauréat sciences (SVT/PC) | Test scientifique | Entretien" },
    ],
  },

  // ─────────────── IGIC (Maroc) ───────────────
  {
    name: "IGIC Institut de Gestion Informatique et Commerce",
    logo_url: null,
    address: "Mohammedia, Maroc",
    city: "Mohammedia",
    country: "Maroc",
    website: "cesasup.ma",
    email: "contact@igic.ma",
    phone: null,
    description: "L'IGIC est un établissement marocain de référence spécialisé dans les formations en gestion, commerce international et management, formant les futurs cadres d'Afrique du Nord.",
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
  // ─────────────── VATEL BRAZZAVILLE ───────────────
  {
    name: "Vatel Brazzaville",
    logo_url: null,
    address: "Brazzaville, République du Congo",
    city: "Brazzaville",
    country: "République du Congo",
    website: "vatel.cg",
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
