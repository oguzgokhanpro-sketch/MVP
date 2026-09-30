# Cahier des charges technique

## MVP — SaaS de collecte et gestion des demandes produit

**Version : 1.0**
**Statut : spécification de développement MVP**

---

# 1. Objectif du produit

Construire un SaaS permettant à une entreprise de :

1. centraliser les demandes et remontées clients ;
2. les qualifier ;
3. les classer ;
4. les regrouper en sujets produit ;
5. identifier les demandes similaires ;
6. prioriser les sujets ;
7. suivre leur évolution vers le backlog produit ;
8. conserver l'historique de toutes les actions.

Le produit doit notamment permettre de transformer :

**Email client → Demande → Sujet produit → Ticket produit**

Une demande représente une remontée réelle provenant d'un client ou d'un collaborateur.

Un sujet représente un besoin produit consolidé pouvant regrouper plusieurs demandes.

Un ticket produit représente la référence vers l'outil de backlog externe de l'entreprise.

---

# 2. Principes techniques

Le MVP doit respecter les principes suivants :

* architecture simple ;
* coûts d'exploitation de **0 € pendant la phase MVP**, en utilisant les crédits et free tiers disponibles ;
* hébergement européen ;
* données applicatives hébergées en Europe ;
* éviter les dépendances propriétaires inutiles ;
* PostgreSQL comme source de vérité ;
* aucune logique métier critique dans le frontend ;
* API typée ;
* multi-tenant dès la première version ;
* sécurité par défaut ;
* aucune suppression physique des données métier importantes ;
* toutes les actions importantes doivent être historisées ;
* aucune fonctionnalité IA ne doit modifier automatiquement les données sans validation humaine.

Le budget de 0 € est un **objectif de fonctionnement du MVP**, et non une garantie contractuelle des fournisseurs. Des alertes et limites de consommation doivent être mises en place.

---

# 3. Stack technique

## Frontend / Backend

* Next.js
* TypeScript
* React
* App Router
* API côté serveur Next.js
* Node.js
* Docker

Le frontend et le backend doivent être regroupés dans une même application au départ.

Ne pas créer de microservices pour le MVP.

---

# 4. Base de données

## PostgreSQL

PostgreSQL constitue la source de vérité du produit.

Utiliser :

* PostgreSQL
* UUID pour les identifiants
* timestamps UTC
* JSONB lorsque nécessaire
* contraintes SQL
* clés étrangères
* index adaptés aux recherches
* transactions pour les opérations critiques.

## pgvector

Installer pgvector afin de permettre ultérieurement :

* recherche sémantique ;
* similarité entre demandes ;
* similarité entre demandes et sujets.

La recherche vectorielle doit rester indépendante de la logique métier.

---

# 5. Hébergement

## Infrastructure principale

Héberger le MVP chez OVHcloud, dans une région européenne.

Architecture initiale recommandée :

```text
Internet
   │
   ▼
Reverse proxy / HTTPS
   │
   ▼
Docker
   │
   ├── Next.js
   │
   ├── PostgreSQL
   │
   └── Worker / jobs
```

Le MVP doit pouvoir fonctionner sur une infrastructure minimale.

Ne pas multiplier les services managés payants.

L'application doit être entièrement dockerisée afin de pouvoir être déplacée facilement vers un autre fournisseur.

---

# 6. IA

L'IA est une fonctionnalité **à la demande**.

Elle ne doit jamais analyser automatiquement toutes les demandes reçues.

Le fournisseur d'IA doit être interchangeable.

Créer une abstraction :

```text
AIProvider
    ├── analyzeRequest()
    ├── findSimilarRequests()
    └── findSimilarSubjects()
```

Le code métier ne doit donc jamais dépendre directement d'un fournisseur particulier.

Le MVP pourra utiliser une API IA européenne disposant d'un free tier.

Les modèles et fournisseurs doivent être configurables via variables d'environnement.

---

# 7. Authentification

Le MVP doit proposer :

* connexion ;
* déconnexion ;
* session sécurisée ;
* gestion des utilisateurs ;
* appartenance à une organisation.

Deux rôles :

### Admin

Peut :

* gérer les utilisateurs ;
* gérer catégories ;
* gérer thèmes ;
* gérer connecteurs ;
* modifier toutes les données produit.

### Member

Peut :

* consulter les demandes ;
* créer des demandes ;
* qualifier les demandes ;
* utiliser l'IA ;
* fusionner les demandes ;
* rattacher les demandes aux sujets ;
* créer/modifier des sujets ;
* gérer entreprises et contacts ;
* consulter l'historique.

Pas de permissions personnalisées dans le MVP.

---

# 8. Multi-tenancy

Le SaaS doit être multi-tenant dès le départ.

Toutes les données métier appartenant à une entreprise doivent posséder :

```text
organization_id
```

Une organisation ne doit jamais pouvoir accéder aux données d'une autre organisation.

La protection doit exister :

1. dans la couche applicative ;
2. dans les requêtes SQL ;
3. idéalement au niveau PostgreSQL/RLS si retenu par l'implémentation.

Ne jamais faire confiance à un `organization_id` envoyé directement par le navigateur.

L'organisation doit être déterminée depuis la session utilisateur.

---

# 9. Modèle de données

## 9.1 organizations

```text
id
name
created_at
updated_at
```

---

## 9.2 users

```text
id
organization_id
name
email
role
active
created_at
updated_at
```

Valeurs de `role` :

```text
admin
member
```

Un utilisateur désactivé ne doit plus pouvoir se connecter mais son historique doit être conservé.

---

# 10. Entreprises

## 10.1 companies

```text
id
organization_id
name
domain
mrr
arr
currency
active
created_at
updated_at
```

MRR et ARR sont deux valeurs indépendantes.

Ne pas calculer automatiquement :

```text
ARR = MRR × 12
```

car la réalité contractuelle peut être différente.

---

# 11. Contacts

## 11.1 contacts

```text
id
organization_id
company_id
name
email
phone
role
created_at
updated_at
```

Un contact appartient à une entreprise.

Un contact peut être associé à plusieurs demandes.

Une demande peut ne pas avoir de contact connu.

---

# 12. Catégories

## 12.1 categories

```text
id
organization_id
name
active
is_default
sort_order
created_at
updated_at
```

Catégories initiales :

```text
Feature
Bug
Amélioration
Question
Autre
```

Les catégories sont personnalisables par organisation.

Un utilisateur peut :

* créer ;
* renommer ;
* désactiver ;
* réactiver ;
* réordonner.

Une catégorie utilisée par des demandes ne doit jamais être physiquement supprimée.

---

# 13. Thèmes

## 13.1 themes

```text
id
organization_id
name
active
is_default
sort_order
created_at
updated_at
```

Thèmes initiaux :

```text
Reporting
API
Authentification
Interface
Performance
Intégration
```

Même logique de gestion que pour les catégories.

---

# 14. Demandes

## 14.1 requests

```text
id
organization_id

title
description
original_content

source
source_reference

company_id
contact_id

category_id
theme_id

status
triage_status

subject_id
merged_into_id

created_at
updated_at
```

### Sources

```text
Email
Téléphone
Réunion
Chat
Formulaire
Import
Manuel
Autre
```

### Status

```text
À traiter
Qualifiée
Rejetée
```

### Triage status

```text
À trier
Triée
Non nécessaire
```

`subject_id` est indépendant de `status`.

Il ne doit pas exister de statut « Rattachée ».

---

# 15. Principe de conservation du contenu original

`original_content` doit être considéré comme immuable.

Exemple pour un email :

```text
original_content =
contenu original du message reçu
```

L'utilisateur peut modifier :

* title ;
* description ;
* catégorie ;
* thème ;
* entreprise ;
* contact ;
* statut.

Mais le contenu original doit rester accessible.

Cela permet de toujours retrouver ce que le client a réellement envoyé.

---

# 16. Création manuelle

L'utilisateur peut créer une demande manuellement.

Le formulaire comporte :

```text
Titre
Description
Entreprise
Contact
Catégorie
Thème
Statut
Créer plus
```

La case :

```text
Créer plus
```

est décochée par défaut.

### Si décochée

Après sauvegarde :

```text
création
→ retour vers la liste précédente
```

### Si cochée

Après sauvegarde :

```text
création
→ formulaire vidé
→ formulaire prêt pour une nouvelle demande
```

La case reste cochée jusqu'à ce que l'utilisateur la désactive.

Une demande créée manuellement est directement considérée comme triée.

Elle n'apparaît donc pas dans Inbox.

---

# 17. Inbox

Inbox n'est **pas une table**.

C'est une vue filtrée des demandes :

```sql
triage_status = 'À trier'
```

Les demandes provenant notamment des emails arrivent dans Inbox.

Une demande manuelle n'y apparaît pas par défaut.

---

# 18. Interface Inbox

L'Inbox doit être dense et rapide à utiliser.

Colonnes principales :

```text
Demande
Entreprise
Catégorie
Thème
Statut
Source
Date
```

Actions disponibles :

* modifier le titre ;
* modifier la description ;
* sélectionner une catégorie ;
* sélectionner un thème ;
* associer une entreprise ;
* associer un contact ;
* modifier le statut ;
* analyser avec l'IA ;
* rechercher des demandes similaires ;
* rechercher des sujets similaires ;
* rattacher à un sujet ;
* fusionner ;
* rejeter ;
* marquer comme triée.

Ne pas ajouter d'assignation à un utilisateur.

---

# 19. Actions groupées

Le MVP doit permettre au minimum :

* marquer plusieurs demandes comme triées ;
* rejeter plusieurs demandes.

Ne pas implémenter de logique complexe de fusion ou de rattachement en masse dans la première version.

---

# 20. Liste des demandes

Route :

```text
/demandes
```

Elle affiche toutes les demandes.

Colonnes :

```text
Demande
Entreprise
Catégorie
Thème
Statut
Sujet
Date
```

Filtres :

* statut ;
* catégorie ;
* thème ;
* entreprise ;
* demandeur ;
* sujet ;
* source ;
* période ;
* avec sujet ;
* sans sujet.

Recherche texte sur :

* titre ;
* description ;
* contenu original ;
* entreprise ;
* contact ;
* sujet.

Les demandes fusionnées sont masquées par défaut.

Elles restent accessibles via un filtre spécifique.

Les demandes rejetées restent conservées.

---

# 21. Fusion des demandes

Une fusion ne doit jamais supprimer physiquement une demande.

Lorsqu'une demande A est fusionnée dans B :

```text
A.merged_into_id = B.id
```

B devient la demande conservée.

A devient une demande fusionnée.

Son historique reste disponible.

Les informations suivantes restent conservées :

* contenu original ;
* date ;
* entreprise ;
* contact ;
* historique ;
* relations ;
* auteur ;
* source.

Les demandes fusionnées sont exclues des listes normales.

---

# 22. Sujets produit

## 22.1 subjects

```text
id
organization_id

title
description

category_id
theme_id

status

owner_id

eta_type
eta_value

ticket_id
ticket_title
ticket_url

created_at
updated_at
```

---

# 23. Statuts des sujets

```text
À étudier
À prioriser
Planifié
En développement
Livré
Rejeté
```

Il n'existe pas de statut :

```text
Backlog
```

Backlog est une vue.

---

# 24. Responsable

Un sujet peut avoir un responsable :

```text
owner_id
```

Un seul responsable dans le MVP.

Pas de notion d'équipe.

Pas de permissions spécifiques liées au responsable.

---

# 25. ETA

L'ETA est facultatif.

Il doit pouvoir représenter :

### Date précise

```text
2027-04-15
```

### Période

```text
S1 2027
T2 2027
2027
```

Prévoir :

```text
eta_type
eta_value
```

afin de ne pas imposer une date exacte.

---

# 26. Ticket produit externe

Le MVP ne s'intègre pas avec Jira, Linear ou autre outil.

Le sujet peut simplement contenir :

```text
ticket_id
ticket_title
ticket_url
```

Exemple :

```text
PROD-142
Export CSV
https://...
```

Cela permet d'avoir une relation avec le backlog réel sans développer une intégration.

---

# 27. Relation Demande → Sujet

Une demande peut être associée à :

```text
0 ou 1 sujet
```

Un sujet peut avoir :

```text
0 à N demandes
```

Lorsqu'une demande est rattachée à un sujet :

```text
request.subject_id = subject.id
```

Le rattachement ne modifie pas le statut de la demande.

---

# 28. Gestion des demandes d'un sujet

Depuis la page d'un sujet, l'utilisateur peut :

* voir les demandes associées ;
* ajouter une demande existante ;
* retirer une demande ;
* consulter chaque demande.

Retirer une demande :

```text
subject_id = NULL
```

La demande reste entièrement conservée.

Ne pas permettre de créer directement une demande depuis un sujet dans le MVP.

Une demande correspond à une remontée réelle.

Un sujet correspond à la consolidation de ces remontées.

---

# 29. Backlog

Route :

```text
/backlog
```

Le backlog est une liste de sujets.

Pas de Kanban dans le MVP.

Colonnes :

```text
Sujet
Statut
Catégorie
Thème
Responsable
ETA
Demandes
Entreprises
ARR
```

---

# 30. Métriques d'un sujet

Les métriques ne doivent pas être stockées en base.

Elles sont calculées.

### Nombre de demandes

```text
COUNT(requests)
```

### Nombre d'entreprises

```text
COUNT(DISTINCT company_id)
```

### ARR

Somme des ARR des entreprises distinctes associées au sujet.

Exemple :

```text
Acme
ARR = 100 000 €
5 demandes

Beta
ARR = 50 000 €
2 demandes
```

Résultat :

```text
Demandes : 7
Entreprises : 2
ARR : 150 000 €
```

Ne jamais compter plusieurs fois l'ARR d'une même entreprise.

---

# 31. Intelligence artificielle

L'IA est toujours déclenchée explicitement par l'utilisateur.

Bouton :

```text
Analyser avec l'IA
```

L'IA peut proposer :

* résumé ;
* catégorie ;
* thème ;
* entreprise ;
* sujet similaire ;
* demandes similaires ;
* nouveau sujet potentiel.

L'IA ne doit jamais :

* modifier automatiquement une demande ;
* créer automatiquement un sujet ;
* fusionner automatiquement des demandes ;
* modifier une catégorie ;
* modifier une entreprise ;
* modifier un statut.

L'utilisateur valide toujours les propositions.

---

# 32. AIAnalysis

Créer :

```text
ai_analyses
```

Champs :

```text
id
organization_id
request_id

summary

proposed_category_id
proposed_theme_id
proposed_company_id
proposed_subject_id

raw_result
model

created_at
```

Les résultats IA doivent être séparés des données métier finales.

Exemple :

```text
IA propose :
catégorie = Feature
```

L'utilisateur choisit :

```text
catégorie finale = Amélioration
```

La proposition IA reste historisée.

---

# 33. Recherche de similarité

Deux fonctions :

```text
Trouver des demandes similaires
Trouver des sujets similaires
```

La recherche doit être effectuée à la demande.

Ne pas créer de table `request_similarities` dans le MVP.

Utiliser pgvector pour calculer les similarités.

Le système doit pouvoir :

1. générer un embedding ;
2. rechercher les vecteurs proches ;
3. récupérer les entités correspondantes ;
4. afficher les résultats ;
5. laisser l'utilisateur décider.

---

# 34. Embeddings

Créer une couche abstraite :

```text
EmbeddingProvider
```

Elle doit permettre de remplacer facilement le fournisseur.

Prévoir une représentation vectorielle sur les demandes et éventuellement les sujets.

Les embeddings ne doivent pas être confondus avec le contenu métier.

---

# 35. Historique

## 35.1 activity_logs

Toutes les actions importantes sont conservées.

```text
id
organization_id

actor_type
actor_id

entity_type
entity_id

action

old_value
new_value
metadata

created_at
```

### actor_type

```text
user
ai
system
```

Les logs sont immuables.

---

# 36. Exemples d'événements

```text
request.created
request.updated
request.category_changed
request.theme_changed
request.company_changed
request.status_changed
request.triaged
request.rejected
request.merged
request.attached_to_subject
request.detached_from_subject

subject.created
subject.updated
subject.status_changed
subject.owner_changed
subject.eta_changed
subject.ticket_changed

ai.analysis_created
```

Les valeurs avant/après doivent être conservées lorsqu'elles sont pertinentes.

---

# 37. Connecteurs

## 37.1 connectors

```text
id
organization_id

type
name
status

configuration
credentials_reference

created_at
updated_at
```

Les secrets ne doivent jamais être stockés en clair dans `configuration`.

---

# 38. Connecteur Gmail

Premier connecteur du MVP :

```text
Gmail / Google Workspace
```

Flux :

```text
Email reçu
      ↓
Connecteur Gmail
      ↓
Création Request
      ↓
triage_status = À trier
      ↓
Inbox
```

---

# 39. Données extraites d'un email

À la réception :

### Sujet

→ `request.title`

### Corps

→ `request.description`

### Email original

→ `request.original_content`

### Expéditeur

→ contact potentiel

### Email expéditeur

→ contact.email

### Date

→ created_at ou date_source conservée dans metadata

### Référence Gmail

→ source_reference

### Source

```text
Email
```

---

# 40. Règles du connecteur email

Dans le MVP :

* un email = une demande ;
* pas de découpage automatique d'un email en plusieurs demandes ;
* pas d'IA automatique à la réception ;
* pas de réponse automatique ;
* pas de synchronisation bidirectionnelle ;
* pas de détection parfaite des doublons ;
* pas d'intégration Slack ;
* pas d'intégration Intercom ;
* pas d'intégration Zendesk ;
* pas d'intégration CRM.

Principe :

**capturer d'abord, consolider ensuite.**

---

# 41. Matching entreprise/contact

Le matching automatique entre une adresse email et une entreprise doit rester simple dans le MVP.

Prévoir l'architecture pour permettre ultérieurement :

```text
email
→ domaine
→ entreprise
→ contact
```

Mais ne pas développer une logique complexe de détection automatique tant que les règles métier n'ont pas été validées.

Un utilisateur doit pouvoir corriger manuellement le rattachement.

---

# 42. Navigation

Navigation principale :

```text
Inbox
Demandes
Backlog
Entreprises
Paramètres
```

---

# 43. Entreprises — interface

Liste :

```text
Entreprise
Domaine
MRR
ARR
Demandes
Sujets
```

Fonctions :

* recherche ;
* filtre ;
* tri ;
* création ;
* modification.

Page entreprise :

```text
Informations
MRR
ARR
Contacts
Demandes
Sujets
```

---

# 44. Paramètres

Sections :

```text
Organisation
Utilisateurs
Catégories
Thèmes
Connecteurs
```

Seuls les Admin peuvent modifier la configuration.

---

# 45. API

L'API doit être organisée par domaine fonctionnel.

Exemple :

```text
/api/requests
/api/subjects
/api/companies
/api/contacts
/api/categories
/api/themes
/api/users
/api/connectors
/api/ai
```

Toutes les routes doivent :

1. vérifier l'authentification ;
2. récupérer l'organisation depuis la session ;
3. vérifier les permissions ;
4. appliquer `organization_id` ;
5. valider les données entrantes ;
6. effectuer l'opération ;
7. enregistrer l'activité si nécessaire.

---

# 46. Validation

Utiliser un système de validation typé, par exemple Zod.

Toutes les entrées externes doivent être validées :

* formulaires ;
* API ;
* webhooks ;
* données Gmail ;
* paramètres URL.

Ne jamais faire confiance aux données du navigateur.

---

# 47. Sécurité

Minimum requis :

* HTTPS ;
* cookies sécurisés ;
* protection CSRF selon mécanisme d'authentification ;
* mots de passe hashés si gestion locale ;
* secrets uniquement dans les variables d'environnement / secret manager ;
* aucune clé API dans le frontend ;
* validation serveur ;
* contrôle d'accès serveur ;
* isolation stricte des organisations ;
* logs d'activité ;
* sauvegardes PostgreSQL ;
* principe du moindre privilège.

---

# 48. Données sensibles

Ne jamais envoyer inutilement l'intégralité des données de l'organisation à un modèle IA.

Lors d'une analyse IA, ne transmettre que les informations nécessaires.

Exemple :

```text
titre
description
entreprise si nécessaire
historique pertinent
```

Ne pas envoyer automatiquement :

* toutes les demandes ;
* tous les contacts ;
* toutes les entreprises ;
* toutes les données financières.

---

# 49. RGPD / hébergement

Le MVP doit privilégier :

* hébergement européen ;
* stockage européen ;
* traitement applicatif européen ;
* fournisseurs européens lorsque possible ;
* minimisation des données ;
* possibilité de supprimer/anonymiser ultérieurement les données personnelles ;
* journalisation des accès/actions importantes.

Point important :

**héberger le SaaS en Europe ne signifie pas que tous les traitements externes deviennent automatiquement européens.**

Le connecteur Gmail reste un service externe.

L'architecture doit donc permettre ultérieurement de remplacer Gmail par un fournisseur email européen si une exigence de souveraineté plus forte apparaît.

---

# 50. Sauvegardes

PostgreSQL doit être sauvegardé régulièrement.

Le système doit permettre :

* restauration ;
* sauvegarde automatisée ;
* vérification périodique de la disponibilité des sauvegardes.

Pendant le MVP, utiliser les mécanismes gratuits disponibles.

---

# 51. Observabilité

Le MVP doit disposer au minimum de :

* logs applicatifs ;
* logs erreurs ;
* logs des workers ;
* logs des connecteurs ;
* monitoring de disponibilité.

Éviter les solutions SaaS de monitoring payantes.

Les logs ne doivent pas contenir :

* mots de passe ;
* tokens ;
* clés API ;
* contenu intégral inutile d'emails ;
* données personnelles inutiles.

---

# 52. Variables d'environnement

Exemple :

```text
DATABASE_URL

AUTH_SECRET

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

AI_PROVIDER
AI_API_KEY
AI_MODEL

EMBEDDING_PROVIDER
EMBEDDING_API_KEY
EMBEDDING_MODEL
```

Aucun secret ne doit être commité dans Git.

Créer :

```text
.env.example
```

sans aucune valeur sensible.

---

# 53. Environnements

Prévoir au minimum :

```text
local
production
```

Le développement local doit fonctionner sans dépendre d'un service externe payant.

Docker Compose doit permettre de démarrer :

```text
Next.js
PostgreSQL
```

avec une seule commande.

---

# 54. Structure de projet

Structure indicative :

```text
/
├── app/
│   ├── inbox/
│   ├── demandes/
│   ├── backlog/
│   ├── entreprises/
│   ├── parametres/
│   └── api/
│
├── components/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── ai/
│   ├── embeddings/
│   ├── gmail/
│   ├── permissions/
│   └── activity/
│
├── db/
│   ├── migrations/
│   └── seed/
│
├── workers/
│
├── tests/
│
├── docker/
│
├── public/
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

Cette structure peut être adaptée par Claude Code si une meilleure organisation technique est justifiée.

---

# 55. Tests

Le MVP doit comporter au minimum :

### Tests unitaires

Pour :

* calcul ARR ;
* permissions ;
* fusion ;
* rattachement ;
* statuts ;
* filtres ;
* métriques.

### Tests d'intégration

Pour :

* création demande ;
* création sujet ;
* rattachement ;
* fusion ;
* isolation organisationnelle ;
* authentification ;
* connecteur email.

### Tests critiques

Il doit être impossible qu'un utilisateur de l'organisation A récupère une demande de l'organisation B.

Ce test est prioritaire.

---

# 56. Seed de développement

Prévoir un script permettant de créer :

```text
1 organisation
3 utilisateurs
5 entreprises
5 contacts
catégories par défaut
thèmes par défaut
20 demandes
5 sujets
historique associé
```

Les données de démonstration doivent être clairement identifiées comme données de développement.

Aucune donnée fictive ne doit apparaître en production.

---

# 57. Performance

Le MVP n'a pas besoin d'une architecture haute disponibilité.

Objectifs :

* interface fluide ;
* pagination des listes ;
* recherche côté serveur ;
* index PostgreSQL ;
* éviter de charger toutes les demandes en mémoire ;
* calcul des métriques côté serveur ;
* requêtes SQL optimisées.

Les listes doivent être paginées dès le départ.

---

# 58. Pagination

Toutes les listes potentiellement volumineuses doivent être paginées :

* demandes ;
* sujets ;
* entreprises ;
* contacts ;
* historique.

Ne pas charger plusieurs milliers de lignes dans le navigateur.

---

# 59. Recherche

La recherche initiale peut utiliser PostgreSQL.

Ne pas introduire Elasticsearch, Algolia ou autre moteur externe dans le MVP.

La recherche sémantique est séparée et utilise pgvector.

---

# 60. Ce qui est explicitement hors périmètre

Ne pas développer :

* Jira ;
* Linear ;
* Slack ;
* Intercom ;
* Zendesk ;
* HubSpot ;
* Salesforce ;
* CRM complet ;
* SSO ;
* SCIM ;
* équipes ;
* permissions personnalisées ;
* workflows configurables ;
* Kanban ;
* scoring automatique ;
* priorisation automatique ;
* automatisations complexes ;
* réponse automatique aux emails ;
* découpage automatique des emails ;
* classification IA automatique à la réception ;
* détection automatique parfaite des doublons ;
* synchronisation bidirectionnelle avec un outil de backlog ;
* application mobile ;
* notifications push ;
* système de facturation ;
* marketplace ;
* dashboard analytique avancé.

---

# 61. Priorité de développement

Le développement doit suivre cet ordre.

## Phase 1 — Fondations

* projet Next.js ;
* TypeScript ;
* Docker ;
* PostgreSQL ;
* migrations ;
* authentification ;
* organisations ;
* utilisateurs ;
* rôles ;
* isolation multi-tenant.

## Phase 2 — Référentiels

* entreprises ;
* contacts ;
* catégories ;
* thèmes.

## Phase 3 — Demandes

* création manuelle ;
* liste ;
* détail ;
* modification ;
* filtres ;
* recherche ;
* statuts ;
* triage.

## Phase 4 — Inbox

* vue Inbox ;
* réception des demandes à trier ;
* actions de qualification ;
* actions groupées.

## Phase 5 — Sujets

* création ;
* modification ;
* liste Backlog ;
* détail ;
* rattachement des demandes ;
* retrait ;
* métriques.

## Phase 6 — Historique

* activity_logs ;
* affichage de l'historique ;
* traçabilité des actions.

## Phase 7 — Email

* OAuth Google ;
* connexion boîte Gmail ;
* récupération des emails ;
* transformation en demandes ;
* Inbox.

## Phase 8 — IA

* abstraction AIProvider ;
* analyse d'une demande ;
* stockage AIAnalysis ;
* propositions ;
* validation manuelle.

## Phase 9 — Similarité

* embeddings ;
* pgvector ;
* demandes similaires ;
* sujets similaires.

## Phase 10 — Production

* Docker ;
* déploiement OVHcloud ;
* HTTPS ;
* sauvegardes ;
* monitoring ;
* sécurisation ;
* tests ;
* documentation.

---

# 62. Critères d'acceptation du MVP

Le MVP est considéré comme fonctionnel lorsqu'un utilisateur peut effectuer le parcours complet suivant :

```text
1. Créer un compte
        ↓
2. Créer/rejoindre une organisation
        ↓
3. Connecter une boîte Gmail
        ↓
4. Recevoir un email
        ↓
5. Transformer automatiquement l'email en demande
        ↓
6. Voir la demande dans Inbox
        ↓
7. La qualifier
        ↓
8. Associer entreprise + contact
        ↓
9. Analyser avec l'IA
        ↓
10. Trouver des demandes/sujets similaires
        ↓
11. Rattacher la demande à un sujet
        ↓
12. Voir le sujet dans Backlog
        ↓
13. Voir nombre de demandes / entreprises / ARR
        ↓
14. Ajouter un ticket produit externe
        ↓
15. Faire évoluer le statut du sujet
        ↓
16. Retrouver toutes les actions dans l'historique
```

Le parcours manuel doit également fonctionner :

```text
Créer demande
→ qualifier
→ rattacher à sujet
→ suivre dans Backlog
```

---

# 63. Règle fondamentale de développement

Claude Code ne doit pas implémenter une fonctionnalité simplement parce qu'elle semble utile.

Toute fonctionnalité doit être :

1. présente dans ce cahier des charges ;
2. nécessaire au parcours MVP ;
3. ou explicitement validée avant développement.

Si une décision technique n'est pas spécifiée, Claude Code doit choisir la solution **la plus simple, maintenable et réversible**, sans ajouter de fonctionnalité produit.

---

# 64. Principe architectural final

Le système doit rester construit autour de trois objets métier centraux :

```text
DEMANDE
   │
   │ plusieurs demandes
   ▼
SUJET
   │
   │ référence
   ▼
TICKET PRODUIT
```

Avec :

```text
ENTREPRISE
     │
     └── CONTACT
             │
             └── DEMANDES
```

Et :

```text
DEMANDE
   │
   └── AI ANALYSIS

TOUTES LES ENTITÉS
   │
   └── ACTIVITY LOG
```

La priorité absolue du MVP est :

**capturer → qualifier → consolider → exploiter**

et non de construire un outil de gestion de projet complet.

---

# 65. Livrables attendus

Le développement doit produire :

* code source complet ;
* migrations PostgreSQL ;
* seed de développement ;
* Dockerfile ;
* Docker Compose ;
* `.env.example` ;
* tests ;
* documentation d'installation locale ;
* documentation de déploiement ;
* documentation des variables d'environnement ;
* documentation de l'architecture ;
* documentation du connecteur Gmail ;
* documentation de l'intégration IA ;
* procédure de sauvegarde/restauration.

Le README doit permettre à un développeur de cloner le projet et de lancer le MVP localement sans connaissance préalable du projet.
