# MVP — Lot 1 : fondations techniques et multi-tenant

Next.js (App Router) · TypeScript strict · React · PostgreSQL · Prisma · Zod · Docker.

Fonctionnel : inscription (création d'une organisation + utilisateur Admin), connexion, déconnexion, dashboard protégé, isolation multi-tenant. Aucune fonctionnalité métier (demandes, entreprises, IA…) : voir le cahier des charges des lots suivants.

## Démarrage rapide (Docker)

```bash
git clone <url-du-repo>
cd MVP
cp .env.example .env
# Renseignez AUTH_SECRET (>= 32 caractères) : openssl rand -base64 32
docker compose up --build
```

Puis ouvrir <http://localhost:3000/register>, créer une organisation, se connecter et accéder au dashboard.

Au démarrage, le conteneur `app` applique automatiquement les migrations (`prisma migrate deploy`). L'application **refuse de démarrer** si `DATABASE_URL`, `AUTH_SECRET` ou `NEXT_PUBLIC_APP_URL` manque ou est invalide.

### Base de données

| Action                  | Commande                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| Initialiser / migrer    | automatique au `docker compose up` (ou `npm run db:deploy` en local)     |
| Lancer le seed          | `docker compose --profile tools run --rm tools npm run db:seed`          |
| Arrêter l'environnement | `docker compose down` (les données sont conservées dans `postgres_data`) |
| Réinitialiser la base   | `docker compose down -v` puis `docker compose up` (supprime le volume)   |

Les données persistent grâce au volume Docker `postgres_data`.

### Comptes de développement (seed)

**Uniquement pour le développement local — ne jamais utiliser en production.**

| Organisation      | Email                 | Rôle   | Mot de passe  |
| ----------------- | --------------------- | ------ | ------------- |
| Organisation Demo | `admin@example.test`  | ADMIN  | `password123` |
| Organisation Demo | `member@example.test` | MEMBER | `password123` |

## Développement sans Docker pour l'app

Prérequis : Node 22+, un PostgreSQL local (ou `docker compose up postgres`).

```bash
cp .env.example .env        # DATABASE_URL pointe sur localhost par défaut
npm install
npm run db:migrate          # crée/applique les migrations (prisma migrate dev)
npm run db:seed             # optionnel
npm run dev                 # http://localhost:3000
```

Scripts : `npm run lint`, `npm run typecheck`, `npm run format`, `npm test`, `npm run db:reset`.

## Tests

`npm test` utilise la base `mvp_test` (créée au préalable, ex. `createdb mvp_test`) ; les migrations y sont appliquées automatiquement. Une autre base peut être fournie via `TEST_DATABASE_URL`. **Les tests vident les tables** : ne jamais la faire pointer vers une base utile.

Couverture : authentification (inscription valide/invalide, connexion, mauvais mot de passe, déconnexion, accès sans session), isolation multi-tenant (lecture/modification/suppression/accès direct par ID entre deux organisations, dans les deux sens — **critère bloquant**), permissions Admin/Member, validation de l'environnement.

## Architecture

```
app/            pages et routes API (fines : validation → service → réponse)
  (auth)/       /login, /register
  (app)/        /dashboard, /settings (layout authentifié)
  api/          auth/{register,login,logout}, users, users/[id]
components/     composants UI réutilisables
lib/auth/       sessions (cookie signé), mots de passe, service inscription/connexion
lib/db/         client Prisma + accès données scopé par organisation (users.ts)
lib/permissions/ getCurrentUser, requireAuth, requireAdmin, getCurrentOrganization
lib/validation/ schémas Zod (RegisterSchema, LoginSchema, CreateOrganizationSchema…)
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
- Hors périmètre : SSO, OAuth, SCIM, MFA, mot de passe oublié, vérification d'email.

## Sécurité

Aucun secret n'est versionné : `.env` est ignoré par Git, seul `.env.example` (valeurs d'exemple vides) est commité. En production, définir un `AUTH_SECRET` fort et un `NEXT_PUBLIC_APP_URL` en `https://` (le cookie de session est alors marqué `Secure`), et ne pas exécuter le seed.
