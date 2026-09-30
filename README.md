# MVP — Lots 1 et 2 : fondations multi-tenant et référentiels

Next.js (App Router) · TypeScript strict · React · PostgreSQL · Prisma · Zod · Docker.

Fonctionnel :

- **Lot 1** : inscription (création d'une organisation + utilisateur Admin), connexion, déconnexion, tableau de bord protégé, isolation multi-tenant.
- **Lot 2** (`docs/lot-2.md`) : référentiels — **entreprises** (MRR / ARR), **contacts** (gérés depuis la page de leur entreprise), **catégories** et **thèmes** personnalisables.

Pas encore de demandes, sujets, Inbox, Backlog, email ni IA (lots suivants, voir `docs/cahier-des-charges.md`).

## Démarrage rapide (Docker)

```bash
git clone <url-du-repo>
cd MVP
cp .env.example .env
docker compose up --build
```

Puis ouvrir <http://localhost:3000/inscription>, créer une organisation (les catégories et thèmes par défaut sont créés), se connecter et accéder au tableau de bord.

`AUTH_SECRET` peut rester vide dans `.env` pour le développement local Docker : `docker-compose.yml` utilise alors un secret de développement **public et non sécurisé** (préfixe `dev-only-insecure-`). L'application le refuse dès que `NEXT_PUBLIC_APP_URL` est en `https://`. Pour tout autre usage, définir un vrai secret : `openssl rand -base64 32`. Hors Docker (`npm run dev`), `AUTH_SECRET` est obligatoire dans `.env`.

Au démarrage, le conteneur `app` applique automatiquement les migrations (`prisma migrate deploy`). L'application **refuse de démarrer** si `DATABASE_URL`, `AUTH_SECRET` ou `NEXT_PUBLIC_APP_URL` manque ou est invalide.

### Base de données

| Action                  | Commande                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| Initialiser / migrer    | automatique au `docker compose up` (ou `npm run db:deploy` en local)     |
| Lancer le seed          | `docker compose --profile tools run --rm tools npm run db:seed`          |
| Arrêter l'environnement | `docker compose down` (les données sont conservées dans `postgres_data`) |
| Réinitialiser la base   | `docker compose down -v` puis `docker compose up` (supprime le volume)   |

Les données persistent grâce au volume Docker `postgres_data`.

Le seed crée aussi, pour l'organisation de démonstration, les catégories et thèmes par défaut, 5 entreprises (dont une archivée) et 5 contacts fictifs (`*.example.test`). Il est rejouable sans doublon.

### Comptes de développement (seed)

**Uniquement pour le développement local — ne jamais utiliser en production.**

| Organisation      | Email                 | Rôle   | Mot de passe  |
| ----------------- | --------------------- | ------ | ------------- |
| Organisation Demo | `admin@example.test`  | ADMIN  | `password123` |
| Organisation Demo | `member@example.test` | MEMBER | `password123` |

## Développement sans Docker pour l'app

Prérequis : Node 22+, un PostgreSQL local (ou `docker compose up postgres`).

```bash
cp .env.example .env        # DATABASE_URL pointe sur localhost par défaut ; renseigner AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:migrate          # crée/applique les migrations (prisma migrate dev)
npm run db:seed             # optionnel
npm run dev                 # http://localhost:3000
```

Scripts : `npm run lint`, `npm run typecheck`, `npm run format`, `npm test`, `npm run db:reset`.

## Tests

`npm test` utilise la base `mvp_test` (créée au préalable, ex. `createdb mvp_test`) ; les migrations y sont appliquées automatiquement. Une autre base peut être fournie via `TEST_DATABASE_URL`. **Les tests vident les tables** : ne jamais la faire pointer vers une base utile.

Couverture : authentification (inscription valide/invalide, connexion, mauvais mot de passe, déconnexion, accès sans session), isolation multi-tenant (lecture/modification/suppression/accès direct par ID entre deux organisations, dans les deux sens — **critère bloquant**), permissions Admin/Member, validation de l'environnement ; Lot 2 : isolation multi-tenant des entreprises, contacts, catégories et thèmes (dont références croisées `company_id`), permissions (Member en lecture seule sur catégories/thèmes), archivage/réactivation, unicité des noms, validation (montants, domaine, email), pagination/recherche/tri, valeurs par défaut à l'inscription.

## Architecture

```
app/            pages et routes API (fines : validation → service → réponse)
  (auth)/       /connexion, /inscription
  (app)/        /tableau-de-bord, /entreprises, /entreprises/[id], /parametres (layout authentifié)
  api/          auth/{register,login,logout}, users, companies, contacts, categories, themes (+ [id], reorder)
components/     composants UI réutilisables
lib/auth/       sessions (cookie signé), mots de passe, service inscription/connexion
lib/db/         client Prisma + accès données scopé par organisation (users, companies, contacts, referentials = catégories/thèmes, defaults)
lib/permissions/ getCurrentUser, requireAuth, requireAdmin, getCurrentOrganization
lib/validation/ schémas Zod (auth, referentials)
prisma/         schema.prisma, migrations, seed.ts
tests/          tests automatisés (Vitest)
```

### Choix notables

- **Session** : cookie `httpOnly` signé (JWT HS256 via `jose`) ne contenant que l'id utilisateur, 7 jours. L'utilisateur, son rôle et son organisation sont relus en base à chaque requête (un compte désactivé perd son accès immédiatement). Le mécanisme est isolé dans `lib/auth/session.ts` + `password.ts` pour pouvoir être remplacé. La déconnexion supprime le cookie ; il n'y a pas de révocation côté serveur d'un jeton déjà émis (à traiter si besoin dans un lot ultérieur).
- **Multi-tenant** : l'`organizationId` vient toujours de la session (`requireAuth()`), jamais de la requête. Tout accès aux données d'une organisation passe par un accès scopé (`usersOf(organizationId)`) ; une ligne d'une autre organisation se comporte comme une ligne inexistante (404). Les lots suivants doivent suivre ce même modèle.
- **Email unique globalement** (et non seulement par organisation) : la connexion ne demande que email + mot de passe, l'email doit donc identifier un seul compte.
- **Colonne `password_hash`** ajoutée à `users` (nécessaire à l'authentification, non listée dans les champs du cahier des charges).
- **API `/api/users`** : minimale, sert de première ressource scopée par organisation pour les tests d'isolation (lecture, modification et suppression réservées aux Admin pour les deux dernières).
- **Erreurs** : réponses JSON génériques, pages `404` et `error` sans détail technique ; les détails ne sont jamais renvoyés au client.
- **Dernier Admin protégé** : suppression, désactivation ou rétrogradation du dernier Admin actif d'une organisation refusées (409 `LAST_ADMIN`). Les changements d'Admin d'une organisation sont sérialisés par un verrou de ligne sur l'organisation (pas de course entre deux Admins).
- **Routes protégées** : le middleware ne cible que les préfixes privés (`/tableau-de-bord`, `/entreprises`, `/parametres`, liste `matcher` de `middleware.ts`) ; les URL inconnues affichent la page 404 pour tous. **Toute nouvelle section privée doit être ajoutée à ce `matcher`** (et appeler `requireAuth()`).
- **Image Docker** : `node:22-alpine` (OpenSSL et certificats déjà inclus), sortie Next.js `standalone`, exécution sous l'utilisateur `node`. L'image de base est paramétrable (`--build-arg NODE_IMAGE=...`), utile derrière un proxy d'entreprise.
- **Pages en français, API en anglais** : `/connexion`, `/inscription`, `/tableau-de-bord`, `/entreprises`, `/parametres` (les anciennes URL ne redirigent pas).
- Hors périmètre : SSO, OAuth, SCIM, MFA, mot de passe oublié, vérification d'email.

### Lot 2 — choix notables

- **Aucune suppression physique** des entreprises, contacts, catégories et thèmes : archivage / désactivation via `active` (PATCH), aucune route `DELETE`. L'archivage d'une entreprise n'affecte pas ses contacts.
- **Permissions** : entreprises et contacts (création, modification, archivage) ouverts aux Admin et Member ; catégories et thèmes en lecture pour tous, écriture réservée aux Admin (403 pour un Member, contrôlé côté serveur ; l'interface masque en plus les actions).
- **Isolation** : `companiesOf`, `contactsOf`, `categoriesOf`, `themesOf` (comme `usersOf`). Un `company_id` d'une autre organisation se comporte comme une entreprise inexistante (404), à la création, à la modification et en filtre.
- **Montants** : `Decimal(14,2)`, `mrr` et `arr` indépendants, sans devise, `CHECK >= 0` en base ; arrondis à 2 décimales. Exposés en chaînes dans le JSON.
- **Domaine** : normalisé (minuscules, sans schéma ni chemin) puis validé ; non unique.
- **Noms de catégories / thèmes** : unicité par organisation insensible à la casse, via un index SQL sur `(organization_id, lower(name))` dans la migration (Prisma ne sait pas l'exprimer : `prisma migrate dev` peut le signaler comme dérive, ne pas le supprimer).
- **Valeurs par défaut** : créées dans la transaction d'inscription (`lib/db/defaults.ts`), remplies par la migration pour les organisations existantes et par le seed.
- **Réordonnancement** : `POST /api/{categories,themes}/reorder` avec `{ "ids": [...] }` = tous les identifiants de l'organisation dans le nouvel ordre (sinon 404). Boutons monter / descendre dans l'interface.
- **Listes d'entreprises** : pagination serveur (20 par page, 100 max), recherche insensible à la casse sur nom et domaine, tri nom (insensible à la casse) / MRR / ARR / date (valeurs vides en dernier), filtre actives (défaut) / archivées.

## Sécurité

Aucun secret n'est versionné : `.env` est ignoré par Git, seul `.env.example` (valeurs d'exemple vides) est commité. En production, définir un `AUTH_SECRET` fort et un `NEXT_PUBLIC_APP_URL` en `https://` (le cookie de session est alors marqué `Secure`), et ne pas exécuter le seed.
