# Documentation Rézo Campus — Guide Complet

**Rézo Campus** est une plateforme de gestion des candidatures à l'étranger. Elle accompagne les étudiants dans la constitution de leur dossier, les conseillers dans le suivi des candidatures, les établissements partenaires dans la validation des admissions, et l'ensemble des services internes (administration, comptabilité, RH, commercial, projets) dans leur travail quotidien.

---

## Guides par rôle

| Rôle | Document | Description rapide |
|---|---|---|
| Étudiant | [Guide Étudiant](./guide-etudiant.md) | Dossier, candidatures, documents, attestation |
| École / Établissement | [Guide École](./guide-ecole.md) | Dossiers reçus, validation, attestation, documents |
| Conseiller | [Guide Conseiller](./guide-conseiller.md) | Suivi étudiants, validations, notes, documents officiels |
| Secrétaire | [Guide Secrétaire](./guide-secretaire.md) | Administration, courriers, clients, rendez-vous |
| Admin Général | [Guide Admin](./guide-admin.md) | Gestion utilisateurs, écoles, supervision globale |
| Comptable | [Guide Comptable](./guide-comptable.md) | Facturation, transactions, budget |
| Commercial | [Guide Commercial](./guide-commercial.md) | Activités, rendez-vous, facturation commerciale |
| Chef de Projet | [Guide Chef de Projet](./guide-chef-projet.md) | Projets, cahiers des charges, livrables |
| RH | [Guide RH](./guide-rh.md) | Personnel, réunions, planification d'équipe |

---

## Architecture générale de la plateforme

```
Rézo Campus
├── Espace Étudiant
│   ├── Mon profil
│   ├── Mon dossier
│   ├── Mes documents
│   ├── Explorer les écoles
│   ├── Mes candidatures
│   ├── Docs officiels
│   ├── Messages
│   └── Rendez-vous
│
├── Espace École
│   ├── Tableau de bord
│   ├── Mes formations
│   ├── Candidatures reçues
│   ├── Attestations
│   └── Messages
│
├── Espace Conseiller
│   ├── Tableau de bord
│   ├── Mes étudiants
│   ├── Validations (dossiers + documents)
│   ├── Messages
│   ├── Rendez-vous
│   └── Réunions
│
├── Espace Secrétaire
│   ├── Tableau de bord
│   ├── Étudiants
│   ├── Validations
│   ├── Courriers
│   ├── Clients
│   ├── Messages
│   ├── Rendez-vous
│   ├── Réunions
│   └── Facturation
│
├── Espace Admin
│   ├── Tableau de bord
│   ├── Dossiers
│   ├── Validations
│   ├── Écoles partenaires
│   ├── Utilisateurs
│   ├── Messages
│   ├── Rendez-vous
│   ├── Réunions
│   └── Facturation
│
├── Espace Comptable
│   ├── Tableau de bord
│   ├── Facturation
│   ├── Transactions
│   ├── RDV Clients
│   └── Réunions
│
├── Espace Commercial
│   ├── Tableau de bord
│   ├── Activités
│   ├── RDV Clients
│   ├── Réunions
│   └── Facturation
│
├── Espace Chef de Projet
│   ├── Tableau de bord
│   ├── Liste des projets
│   ├── Cahiers des charges
│   ├── RDV Clients
│   ├── Réunions
│   └── Facturation
│
└── Espace RH
    ├── Tableau de bord
    ├── Personnel
    ├── Réunions
    ├── RDV Clients
    └── Facturation
```

---

## Parcours type d'un étudiant

Le parcours complet d'un étudiant sur Rézo Campus suit les étapes suivantes :

```
1. Inscription et création du compte
        │
        ▼
2. Complétion du profil personnel
   (nom, téléphone, photo)
        │
        ▼
3. Renseignement du projet d'études
   (pays, niveau, formation cible)
        │
        ▼
4. Téléversement des documents
   (passeport, diplôme, relevé de notes, CV...)
        │
        ▼
5. Exploration des écoles partenaires
   et ajout de formations au panier
        │
        ▼
6. Rédaction des lettres de motivation
   (une lettre par candidature)
        │
        ▼
7. Soumission du dossier au conseiller
        │
        ▼
8. Validation par le conseiller
   ├─ Documents examinés un par un
   └─ Dossier global validé ou refusé
        │
        ▼
9. Examen par l'établissement partenaire
   ├─ Consultation du dossier
   ├─ Note du conseiller visible
   └─ Décision de l'école (statut + validation officielle)
        │
        ▼
10. Validation officielle par l'école
    ├─ Attestation de validation générée
    ├─ Notification étudiant (félicitations)
    └─ Notification équipe Rézo Campus (faire signer)
        │
        ▼
11. Signature et transmission des documents
    ├─ École : cachet + documents administratifs
    └─ Rézo Campus : prise en charge, AEVM, hébergement...
        │
        ▼
12. Étudiant télécharge ses documents
    depuis "Docs officiels"
```

---

## Flux des notifications

Les notifications sont envoyées automatiquement dans les situations suivantes :

| Événement | Qui reçoit |
|---|---|
| École valide une candidature | Étudiant (félicitations) + Tous admins et conseillers (faire signer) |
| Rézo Campus envoie un document officiel | Étudiant concerné |
| École envoie un document à l'étudiant | Étudiant concerné |

---

## Gestion des documents

### Types de documents étudiants

| Document | Qui le téléverse | Qui le valide |
|---|---|---|
| Pièce d'identité | Étudiant | Conseiller / Admin |
| Diplôme | Étudiant | Conseiller / Admin |
| Relevé de notes | Étudiant | Conseiller / Admin |
| Lettre de motivation | Étudiant | — |
| CV | Étudiant | Conseiller / Admin |

### Documents officiels transmis à l'étudiant

| Document | Qui le produit | Via |
|---|---|---|
| Prise en charge | Rézo Campus (Conseiller/Admin) | Espace "Docs officiels" étudiant |
| AEVM | Rézo Campus | Espace "Docs officiels" étudiant |
| Attestation d'hébergement | Rézo Campus | Espace "Docs officiels" étudiant |
| Bulletin de salaire | Rézo Campus | Espace "Docs officiels" étudiant |
| Carte de séjour | Rézo Campus | Espace "Docs officiels" étudiant |
| Convocation | École partenaire | Espace "Docs officiels" étudiant |
| Lettre d'admission | École partenaire | Espace "Docs officiels" étudiant |
| Programme de cours | École partenaire | Espace "Docs officiels" étudiant |
| Attestation d'inscription | École partenaire | Espace "Docs officiels" étudiant |

---

## Rôles et permissions

### Matrice d'accès

| Fonctionnalité | Étudiant | École | Conseiller | Secrétaire | Admin | Comptable | Commercial | Chef Projet | RH |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Profil étudiant (son propre) | ✅ | — | — | — | — | — | — | — | — |
| Voir tous les étudiants | — | — | ✅ | ✅ | ✅ | — | — | — | — |
| Valider des documents | — | — | ✅ | ✅ | ✅ | — | — | — | — |
| Valider des dossiers | — | — | ✅ | ✅ | ✅ | — | — | — | — |
| Valider candidature (officielle) | — | ✅ | — | — | — | — | — | — | — |
| Gérer les écoles partenaires | — | — | — | — | ✅ | — | — | — | — |
| Gérer les utilisateurs | — | — | — | — | ✅ | — | — | — | — |
| Envoyer docs officiels | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Télécharger docs officiels | ✅ | — | ✅ | ✅ | ✅ | — | — | — | — |
| Messagerie | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Facturation | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestion courriers | — | — | — | ✅ | ✅ | — | — | — | — |
| Gestion clients | — | — | — | ✅ | ✅ | — | ✅ | — | — |
| RDV Clients | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestion réunions | — | — | — | — | — | — | — | — | ✅ |
| Voir les réunions | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestion projets | — | — | — | — | ✅ | — | — | ✅ | — |
| Gestion personnel RH | — | — | — | — | ✅ | — | — | — | ✅ |

---

## Sécurité et accès

### Authentification

L'accès à la plateforme nécessite :
- Une adresse e-mail enregistrée par l'administrateur
- Un mot de passe personnel (défini à l'invitation)

### Isolation des données

Chaque rôle n'accède qu'aux données qui lui sont autorisées :
- Un utilisateur *École* ne voit que les candidatures de son établissement
- Un utilisateur *Étudiant* ne voit que son propre dossier
- Les rôles internes (conseiller, secrétaire, comptable, etc.) voient les données de tous les étudiants mais pas les données des autres rôles internes

### Blocage de compte

Un administrateur peut bloquer un compte à tout moment. Un compte bloqué conserve ses données mais ne peut plus accéder à la plateforme.

---

## Informations de contact

| Contact | Coordonnées |
|---|---|
| E-mail Rézo Campus | campusrezo@gmail.com |
| Adresse | Avenue de l'OUA, bloc 88-91, quartier Moukoundzi Ngouaka, Brazzaville, République du Congo |

---

## Versions et mises à jour

| Version | Date | Nouvelles fonctionnalités |
|---|---|---|
| v1.0 | Juin 2026 | Plateforme initiale : profils, documents, messagerie, rendez-vous |
| v2.0 | Juillet 2026 | Candidatures, écoles partenaires, attestations, notifications, docs officiels, facturation, réunions |

---

*Ce document est mis à jour à chaque nouvelle version de la plateforme. Pour signaler une erreur ou suggérer une amélioration, contactez l'équipe technique.*
