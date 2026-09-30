# Lot 2 — Référentiels : entreprises, contacts, catégories, thèmes

> Document de référence : `docs/cahier-des-charges.md` (cahier des charges MVP v1.0).
> Ce lot correspond à la **Phase 2 — Référentiels** (section 61) et s'appuie sur le Lot 1 déjà livré.

---

## 0. Méthode de travail (à lire en premier)

1. Lire ce document, le cahier des charges et le `README.md`.
2. **Ne rien coder avant validation.** Proposer d'abord :
   - un plan de réalisation par étapes ;
   - la liste des questions ou ambiguïtés restantes.
3. Après validation, travailler sur une branche `lot-2`.
4. Ne développer **que** ce qui est décrit ici (règle fondamentale, section 63 du cahier des charges). Si une décision technique n'est pas spécifiée, choisir la solution la plus simple, maintenable et réversible, et la signaler dans le compte rendu final.
5. Avant de terminer : `npm run lint`, `npm run typecheck` et `npm test` doivent passer.
6. Mettre à jour le `README.md` (fonctionnalités, routes, choix notables).
7. Terminer par un compte rendu court : ce qui a été fait, les choix pris, ce qui reste hors périmètre.

---

## 1. Objectif du lot

Permettre à une organisation de gérer ses référentiels, qui serviront ensuite à qualifier les demandes (Lot 3) :

- les **entreprises** clientes et leur MRR / ARR ;
- les **contacts** de ces entreprises ;
- les **catégories** et **thèmes** personnalisables.

Aucune fonctionnalité liée aux demandes, sujets, Inbox, Backlog, email ou IA dans ce lot.

---

## 2. Décisions déjà prises (ne pas remettre en cause)

| Sujet | Décision |
| --- | --- |
| Suppression | **Aucune suppression physique** dans l'application, pour aucune entité de ce lot. On **archive** (champ `active = false`) et on peut **réactiver**. Aucune route `DELETE`. |
| Archivage entreprises / contacts | Autorisé aux **Admin et Member**. |
| Catégories et thèmes | Consultables par tous ; **modifiables uniquement par les Admin**. |
| Devises | **Hors périmètre.** Pas de champ `currency` sur les entreprises. MRR et ARR sont de simples montants, sans devise. |
| Colonnes « Demandes » et « Sujets » des entreprises | **Hors périmètre** : elles seront ajoutées aux lots où ces objets existeront. |
| Historique (`activity_logs`) | **Hors périmètre** de ce lot (Phase 6). |
| Gestion / invitation des utilisateurs | **Hors périmètre** de ce lot. |
| Langue des URL de pages | **Toutes les pages en français** (voir section 3). Les routes API restent en anglais, conformément à la section 45 du cahier des charges. |

---

## 3. Renommage des pages existantes

| Actuel | Nouveau |
| --- | --- |
| `/login` | `/connexion` |
| `/register` | `/inscription` |
| `/dashboard` | `/tableau-de-bord` |
| `/settings` | `/parametres` |

- Mettre à jour tous les liens, redirections, la barre latérale, le `matcher` du middleware et les tests.
- Les anciennes URL n'ont pas besoin de redirection (aucun utilisateur réel à ce jour).
- Nouvelles sections privées de ce lot à ajouter au `matcher` : `/entreprises` et `/parametres` (déjà présente après renommage).

Navigation latérale à l'issue du lot : **Tableau de bord**, **Entreprises**, **Paramètres**.
(Inbox, Demandes et Backlog seront ajoutés dans les lots correspondants — ne pas créer de liens vers des pages inexistantes.)

---

## 4. Modèle de données

Toutes les tables : UUID, `organization_id` obligatoire, timestamps UTC `created_at` / `updated_at`, clés étrangères et index adaptés. Une migration Prisma dédiée à ce lot.

### 4.1 `companies`

| Champ | Règle |
| --- | --- |
| `id` | UUID |
| `organization_id` | obligatoire |
| `name` | obligatoire |
| `domain` | facultatif ; format de domaine valide, stocké en minuscules, sans `http://` ni chemin |
| `mrr` | facultatif ; montant décimal ≥ 0 |
| `arr` | facultatif ; montant décimal ≥ 0 |
| `active` | booléen, `true` par défaut |
| `created_at`, `updated_at` | |

- MRR et ARR sont **indépendants** : ne jamais calculer l'un à partir de l'autre (section 10 du cahier des charges).
- Utiliser un type décimal (pas de nombre flottant) pour les montants.

### 4.2 `contacts`

| Champ | Règle |
| --- | --- |
| `id` | UUID |
| `organization_id` | obligatoire |
| `company_id` | **obligatoire** ; l'entreprise doit appartenir à la **même organisation** |
| `name` | obligatoire |
| `email` | facultatif ; format email valide |
| `phone` | facultatif |
| `role` | facultatif ; texte libre (fonction du contact, ex. « CTO ») — sans lien avec les rôles utilisateurs |
| `active` | booléen, `true` par défaut (**ajout par rapport au cahier des charges**, pour l'archivage) |
| `created_at`, `updated_at` | |

### 4.3 `categories` et 4.4 `themes`

Même structure pour les deux tables :

| Champ | Règle |
| --- | --- |
| `id` | UUID |
| `organization_id` | obligatoire |
| `name` | obligatoire ; unique au sein d'une organisation (sans tenir compte des majuscules) |
| `active` | booléen, `true` par défaut |
| `is_default` | `true` pour les valeurs créées automatiquement |
| `sort_order` | entier, ordre d'affichage |
| `created_at`, `updated_at` | |

Valeurs initiales :

- **Catégories** : Feature, Bug, Amélioration, Question, Autre
- **Thèmes** : Reporting, API, Authentification, Interface, Performance, Intégration

Création automatique des valeurs initiales :
- à l'**inscription**, dans la même transaction que la création de l'organisation ;
- pour les organisations **déjà existantes** (migration ou script) ;
- dans le **seed**.

Les valeurs initiales se gèrent exactement comme les autres (renommer, désactiver, réordonner).

---

## 5. Règles d'isolation multi-tenant (critère bloquant)

Suivre **strictement** le modèle du Lot 1 (`usersOf(organizationId)` dans `lib/db/users.ts`) :

- l'`organization_id` vient **uniquement** de la session (`requireAuth()`), jamais de la requête ;
- tout accès passe par un accès scopé par organisation (ex. `companiesOf`, `contactsOf`, `categoriesOf`, `themesOf`) ;
- un élément d'une autre organisation se comporte comme un élément inexistant (**404**) ;
- **références croisées** : créer ou modifier un contact avec un `company_id` appartenant à une autre organisation doit être refusé, et se comporter comme une entreprise inexistante.

---

## 6. Permissions

| Action | Admin | Member |
| --- | --- | --- |
| Consulter entreprises et contacts | ✅ | ✅ |
| Créer / modifier entreprises et contacts | ✅ | ✅ |
| Archiver / réactiver entreprises et contacts | ✅ | ✅ |
| Consulter catégories et thèmes | ✅ | ✅ |
| Créer / renommer / désactiver / réactiver / réordonner catégories et thèmes | ✅ | ❌ (403) |

Contrôles **côté serveur** obligatoires ; l'interface masque en plus les actions non autorisées.

---

## 7. Interface

### 7.1 `/entreprises` — liste

- Colonnes : **Entreprise**, **Domaine**, **MRR**, **ARR**.
- Pagination côté serveur.
- Recherche côté serveur sur le nom et le domaine.
- Tri : nom, MRR, ARR, date de création.
- Filtre : **Actives** (par défaut) / **Archivées**.
- Bouton de création d'une entreprise.

### 7.2 `/entreprises/[id]` — page entreprise

- **Informations** : nom, domaine, MRR, ARR, statut (active / archivée), modifiables.
- Bouton **Archiver** / **Réactiver**.
- **Contacts** de l'entreprise : liste paginée (actifs par défaut, filtre archivés), création d'un contact, modification, archivage / réactivation.

Les contacts sont gérés **depuis la page de leur entreprise** : pas de page ni d'entrée de navigation « Contacts » séparée (non prévue dans la navigation du cahier des charges, section 42).

L'archivage d'une entreprise n'a **aucun effet en cascade** sur ses contacts.

### 7.3 `/parametres`

Sections de ce lot : **Catégories** et **Thèmes**.
(Organisation, Utilisateurs et Connecteurs viendront plus tard : ne pas les afficher.)

Pour chaque liste :
- affichage dans l'ordre `sort_order`, avec indication actif / inactif ;
- Admin : ajouter, renommer, désactiver, réactiver, réordonner (boutons monter / descendre, solution la plus simple) ;
- Member : lecture seule.

---

## 8. API

Organisation par domaine, sur le modèle des routes du Lot 1 (validation Zod → service scopé → réponse) :

```text
/api/companies              GET (liste paginée, recherche, tri, filtre)  POST
/api/companies/[id]         GET  PATCH (y compris archivage / réactivation)
/api/contacts               GET (liste paginée, filtre par entreprise)   POST
/api/contacts/[id]          GET  PATCH (y compris archivage / réactivation)
/api/categories             GET  POST
/api/categories/[id]        PATCH (renommer, activer / désactiver)
/api/categories/reorder     POST
/api/themes                 GET  POST
/api/themes/[id]            PATCH
/api/themes/reorder         POST
```

- **Aucune route `DELETE`.**
- Toutes les entrées validées avec Zod (corps, paramètres d'URL, paramètres de pagination / recherche).
- Réponses d'erreur génériques, comme au Lot 1.

---

## 9. Seed de développement

Compléter le seed existant pour l'organisation de démonstration :
- catégories et thèmes par défaut ;
- 5 entreprises (dont au moins une archivée) ;
- 5 contacts répartis sur ces entreprises.

Données clairement identifiées comme données de développement (noms / domaines fictifs, ex. `*.example.test`).

---

## 10. Tests

### Critiques (bloquants)
Pour **chaque** entité (entreprises, contacts, catégories, thèmes), dans les deux sens entre deux organisations A et B :
- lecture d'un élément de l'autre organisation → 404 ;
- modification / archivage d'un élément de l'autre organisation → 404 ;
- les listes ne renvoient jamais d'élément de l'autre organisation ;
- création ou modification d'un contact avec une entreprise de l'autre organisation → refusée.

### Permissions
- Member : création / modification / réordonnancement de catégorie ou de thème → 403.
- Member : création, modification et archivage d'entreprise et de contact → autorisés.
- Accès sans session → 401 / redirection vers `/connexion`.

### Fonctionnels
- Inscription : les catégories et thèmes par défaut sont créés pour la nouvelle organisation.
- Archivage puis réactivation (entreprise, contact) ; un élément archivé n'apparaît plus dans la liste par défaut.
- Désactivation / réactivation / réordonnancement des catégories et thèmes.
- Unicité des noms de catégorie / thème dans une organisation.
- Validation : MRR ou ARR négatif refusé, domaine et email invalides refusés, champs obligatoires.
- Pagination, recherche et tri des entreprises.
- MRR et ARR restent indépendants (modifier l'un ne change pas l'autre).
- Renommage des pages : les nouvelles URL fonctionnent et sont protégées par le middleware.

---

## 11. Hors périmètre de ce lot

Ne pas développer :
- demandes, Inbox, sujets, Backlog, métriques ;
- colonnes « Demandes » et « Sujets » des entreprises ;
- devises ;
- historique (`activity_logs`) ;
- gestion et invitation des utilisateurs, sections Organisation / Utilisateurs / Connecteurs des paramètres ;
- page « Contacts » séparée ;
- rapprochement automatique email → domaine → entreprise ;
- toute suppression physique ;
- import / export ;
- RLS PostgreSQL.

---

## 12. Critères d'acceptation

Le lot est terminé lorsque, en local avec `docker compose up` :

1. un nouvel utilisateur s'inscrit sur `/inscription` et trouve les catégories et thèmes par défaut dans `/parametres` ;
2. un Admin peut ajouter, renommer, désactiver, réactiver et réordonner catégories et thèmes ; un Member les voit en lecture seule ;
3. un utilisateur crée une entreprise avec domaine, MRR et ARR, la retrouve par recherche, la modifie, l'archive et la réactive ;
4. depuis la page d'une entreprise, il crée, modifie, archive et réactive un contact ;
5. aucune donnée d'une autre organisation n'est jamais visible ni modifiable ;
6. lint, typecheck et tous les tests passent ;
7. le README est à jour.
