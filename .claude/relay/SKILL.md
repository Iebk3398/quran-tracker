---
name: relay
description: >
  Document de relais pour le projet Ikraa (Quran Tracker). À utiliser en début
  de session pour charger le contexte complet : stack technique, bugs corrigés,
  état du déploiement, et tâches restantes. Trigger : "relay", "charge le contexte",
  "reprends le projet", "où on en est", "mets à jour le relay".
---

# Relais de session — Projet Ikraa (Quran Tracker)

Quand ce skill est invoqué, lis ce document en entier et dis à l'utilisateur
exactement où en est le projet, ce qui a été fait, et propose de commencer
par les tâches restantes dans l'ordre indiqué.

---

## 🔄 Procédure de fin de session (à suivre à chaque "mets à jour le relay")

1. **Commit** tous les fichiers modifiés avec un message Conventional Commits
2. **Merge** la branche courante dans `main` si applicable
3. **Résoudre les conflits** éventuels (toujours préférer les changements actuels sauf indication contraire)
4. **Push** vers GitHub (`git push origin main`)
5. **Mettre à jour ce fichier SKILL.md** : section "Ce qui a été fait", "Ce qui reste", "Fichiers modifiés", "Commits"
6. **Sync** le fichier vers `~/.claude/skills/relay/SKILL.md`

---

## Stack technique

| Couche | Technologie |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| API | Hono.js + Better Auth + Drizzle ORM + PostgreSQL (Railway) |
| Frontend | Next.js 15 + React Query v5 + Zustand |
| Auth | emailOTP + Google OAuth. Bearer token dans `localStorage` (`ba-session-token`) |
| DB | PostgreSQL sur Railway. Drizzle ORM (fluent builder, pas de ORM classique) |
| Deploy API | Railway — Dockerfile dans `apps/api/Dockerfile` |
| Deploy Web | Vercel — auto-deploy sur push `main` |
| Tests | Vitest (configuré dans `apps/api/vitest.config.ts`) |

**Repo GitHub :** `https://github.com/Iebk3398/quran-tracker`
**URL prod API :** `https://api-production-e758.up.railway.app`
**URL prod Web :** `https://quran-tracker-web.vercel.app`

---

## ⚠️ Point critique Railway

Railway n'était **pas connecté à GitHub** — les déploiements se faisaient
manuellement via `railway up` CLI. **À faire en priorité absolue** au début
de la prochaine session : connecter GitHub dans Railway Settings → Source.

Sans ça, aucun `git push` ne déclenche de build automatique.

---

## Ce qui a été corrigé cette session

### 1. Bug déconnexion — sidebar.tsx ✅
- **Problème :** Le bouton logout n'avait aucun `onClick` → cliquer dessus ne faisait rien.
- **Fix :** Ajout de `handleLogout()` qui vide `ba-session-token` en localStorage,
  expire le cookie `ba-logged-in`, appelle `signOut()`, puis redirige vers `/login`.
- **Fichier :** `apps/web/src/components/shared/sidebar.tsx`

### 2. Bug auth mobile — login/page.tsx ✅
- **Problème :** `signIn.emailOtp` réponse → on lisait `data.token` (undefined).
  Le vrai chemin Better Auth est `data.session.token`. Token jamais sauvegardé
  en localStorage → `getSession()` sans Bearer header → redirect /login en boucle.
- **Fix :** `rawData?.session?.token ?? rawData?.token` avec fallback.
- **Fichier :** `apps/web/src/app/(auth)/login/page.tsx`

### 3. Bug hizb tracker — hizb-tracker.tsx ✅
- **Problème 1 :** `count` non remis à 1 après save → modal s'ouvre avec valeur précédente.
- **Problème 2 :** Toast XP utilisait `count` (closure stale) au lieu de `variables`
  (valeur réellement envoyée à l'API).
- **Fix :** `setCount(1)` + `variables * 5` dans `onSuccess`.
- **Fichier :** `apps/web/src/components/group/hizb-tracker.tsx`

### 4. Bug session expiry — auth-guard.tsx ✅
- **Problème :** Sur cold start Railway (~15s), `getSession()` levait une exception
  réseau → `clearAllSessionData()` → utilisateur déconnecté à tort.
- **Fix :** 3 tentatives (0ms / 400ms / 1500ms). Si toutes les tentatives échouent
  avec une EXCEPTION (pas de réponse serveur), on ne vide PAS le localStorage.
  On efface seulement si le serveur répond explicitement "pas de session".
- **Fichier :** `apps/web/src/components/shared/auth-guard.tsx`

### 5. Bug Docker build — Dockerfile ✅
- **Problème :** `npm ci` dans le container Docker échouait car `apps/web/` absent
  du container mais déclaré dans le `package-lock.json` → Railway gardait une
  vieille image sans la route `/api/users/me/hizb` → 404 en prod.
- **Fix :** Remplacement de `npm ci` par `npm install --ignore-scripts` + stub
  minimal `apps/web/package.json` créé avec `RUN echo` (0 deps → Next.js pas
  installé dans l'image API).
- **Fichier :** `apps/api/Dockerfile`

### 6. Tests d'intégration — setup partiel ✅
- Vitest ajouté en devDependency dans `apps/api/package.json` + scripts `test` / `test:watch`.
- Helper Drizzle mock : `apps/api/src/__tests__/helpers/chain.ts`
- Tests créés : `users.test.ts`, `groups.test.ts`, `progress.test.ts`, `surahs.test.ts`

---

## Ce qui reste à faire

### PRIORITÉ 1 — Connecter Railway à GitHub 🔴
**Pourquoi :** Sans ça, aucun fix déployé automatiquement.
**Comment :** Railway dashboard → service `api` → Settings → Source → connecter
repo `Iebk3398/quran-tracker` branch `main`.

### PRIORITÉ 2 — Vérifier le déploiement après connexion GitHub 🔴
Une fois GitHub connecté, Railway va rebuilder. Vérifier :
- `POST https://api-production-e758.up.railway.app/api/users/me/hizb` → 200
- Connexion sur mobile → accès dashboard sans boucle

### PRIORITÉ 3 — Compléter les tests d'intégration 🟡
Tests restants à créer dans `apps/api/src/__tests__/routes/` :
- `revisions.test.ts` — POST /api/revisions, GET /api/revisions/history/:userId
- `feed.test.ts` — GET /api/feed/group/:groupId, POST /api/feed/:id/react
- `notifications.test.ts` — GET, PATCH /read, PATCH /read-all, unread-count
- `objectives.test.ts` — CRUD objectifs (fichier `objectives.ts` exclu du tsconfig ⚠️)

**Pour lancer les tests localement :**
```bash
cd apps/api
pnpm test
# ou
pnpm test:watch
```

**Note importante sur les mocks :** Utiliser le helper `chain()` de
`src/__tests__/helpers/chain.ts` pour mocker l'API fluente de Drizzle.
`vi.mock('../../../../packages/db/src/index.ts', ...)` pour mocker le DB.
`vi.mock('../../middleware/auth.ts', ...)` pour injecter l'utilisateur de test.

### PRIORITÉ 4 — CI/CD : lancer les tests avant chaque merge 🟡
Ajouter un GitHub Action dans `.github/workflows/test.yml` :
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm --filter @quran-tracker/api test
```

### PRIORITÉ 5 — Objectifs (objectives.ts) 🟢
Le fichier `apps/api/src/routes/objectives.ts` existe mais est exclu du
`tsconfig.json` ET non importé dans `index.ts`. Il faut :
1. L'ajouter dans `apps/api/src/index.ts` : `import { objectivesRoutes } from './routes/objectives.ts'`
2. Le retirer de l'`exclude` dans `apps/api/tsconfig.json`
3. Vérifier que les routes fonctionnent

---

## Architecture auth (référence rapide)

```
Login mobile (OTP) :
  signIn.emailOtp() → data.session.token → localStorage['ba-session-token']
  getSession() warm-up → onResponse capture set-auth-token header
  window.location.href = '/dashboard'

Auth-guard (dashboard) :
  getSession() avec Authorization: Bearer <token>
  3 tentatives (0/400/1500ms)
  Succès → setSessionCookie('ba-logged-in') → status 'ok'
  Échec serveur → clearAllSessionData() + redirect /login
  Échec réseau → redirect /login SANS vider le token

apiFetch (requêtes API) :
  Lit localStorage['ba-session-token']
  Ajoute Authorization: Bearer <token> sur toutes les requêtes
  Throws si res.ok === false
```

---

## Fichiers clés modifiés cette session

```
apps/web/src/components/shared/sidebar.tsx       ← logout handler
apps/web/src/app/(auth)/login/page.tsx            ← token path fix (session.token)
apps/web/src/components/group/hizb-tracker.tsx   ← reset count + XP variables
apps/web/src/components/shared/auth-guard.tsx    ← 3 retries + no clear on network error
apps/api/Dockerfile                              ← npm install + web stub
apps/api/package.json                            ← vitest added
apps/api/src/__tests__/helpers/chain.ts          ← Drizzle mock helper
apps/api/src/__tests__/routes/users.test.ts      ← tests intégration users
apps/api/src/__tests__/routes/groups.test.ts     ← tests intégration groups
apps/api/src/__tests__/routes/progress.test.ts   ← tests intégration progress
apps/api/src/__tests__/routes/surahs.test.ts     ← tests intégration surahs
```

---

## Commits de cette session (dans l'ordre)

```
ae52a10  fix: logout button et session persistence mobile
0e1c7a5  fix: hizb-tracker — reset count + correct XP toast
fafc006  fix(deploy): Dockerfile + session expiry + tests d'intégration (setup)
dfc388b  fix(auth+docker): token mobile path + Dockerfile stub minimal
14ab7c6  fix(docker): npm install au lieu de npm ci pour le build Railway
```

---

## Comment démarrer/terminer une session

**Début :** `/relay` ou **"relay"**
**Fin :** **"mets à jour le relay"** → commit + merge + push + mise à jour SKILL.md + sync global

Claude proposera de commencer par :
1. Connecter Railway à GitHub (5 min)
2. Vérifier que la route hizb fonctionne en prod
3. Reprendre les tests d'intégration manquants
