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

## Ce qui a été corrigé (sessions précédentes)

### Bug déconnexion — sidebar.tsx ✅
- Ajout de `handleLogout()` qui vide localStorage + cookie + signOut() + redirect /login.

### Bug auth mobile OTP — login/page.tsx ✅ (v1)
- `signIn.emailOtp` → lecture `data.session.token` au lieu de `data.token` (undefined).

### Bug hizb tracker — hizb-tracker.tsx ✅
- `setCount(1)` après save + `variables * 5` pour le toast XP (closure stale).

### Bug session expiry — auth-guard.tsx ✅
- 3 tentatives (0/400/1500ms). Pas de clearAllSessionData() sur erreur réseau.

### Bug Docker build — Dockerfile ✅
- `npm install --ignore-scripts` + stub minimal `apps/web/package.json`.

### Tests d'intégration — setup partiel ✅
- Vitest + helper chain() + users/groups/progress/surahs tests.

---

## Ce qui a été corrigé cette session (2026-03-16)

### 1. Google OAuth state_mismatch sur mobile — index.ts ✅
- **Problème :** Safari ITP purge les cookies de `api.railway.app` → `state_mismatch`.
- **Fix :** Redis state backup + route callback custom + `/auth/relay` loopback bearer.
- **Fichier :** `apps/api/src/index.ts`

### 2. OTP warm-up retries — login/page.tsx ✅
- **Fix :** Retries jusqu'à 3 fois (0/800/2000ms). Redirect /dashboard même si warm-up échoue.
- **Fichier :** `apps/web/src/app/(auth)/login/page.tsx`

### 3. CORS expose set-auth-token — index.ts ✅
- **Fix :** Handler `app.on('/api/auth/*')` injecte manuellement les headers CORS
  et `Access-Control-Expose-Headers: set-auth-token` pour les origines autorisées.
- **Fichier :** `apps/api/src/index.ts`

### 4. Google OAuth redirect_uri_mismatch ✅ (fix manuel, sans commit)
- **Problème :** `BETTER_AUTH_URL=http://localhost:3001` sur Railway → redirect_uri=localhost.
- **Fix :** `BETTER_AUTH_URL` → `https://api-production-e758.up.railway.app` sur Railway +
  URI `https://api-production-e758.up.railway.app/api/auth/callback/google` dans Google Console.

### 5. Bug getSession() silencieux — verifySessionDirect() ✅
- **Problème :** `authClient.getSession()` de Better Auth ne faisait **aucun appel réseau**
  en production cross-origin (Vercel → Railway). Court-circuit interne faute de cookie
  de session côté client. Résultat : login page ne détectait pas la session → boucle login.
- **Diagnostic :** Confirmé via Chrome DevTools — aucune requête vers Railway depuis la page.
  Test JS direct `fetch('/api/auth/get-session', Authorization: Bearer)` → 200 + user ✅.
- **Fix :** Nouvelle fonction `verifySessionDirect()` dans `auth-client.ts` — fetch direct
  vers Railway avec le Bearer token, bypass complet du cache Better Auth.
  Utilisée dans `AuthGuard` et `login/page.tsx` à la place de `authClient.getSession()`.
- **Fichiers :**
  - `apps/web/src/lib/auth-client.ts` ← ajout de `verifySessionDirect()`
  - `apps/web/src/components/shared/auth-guard.tsx` ← utilise `verifySessionDirect()`
  - `apps/web/src/app/(auth)/login/page.tsx` ← utilise `verifySessionDirect()`

---

## Ce qui reste à faire

### PRIORITÉ 1 — Vérifier le flux Google OAuth complet en prod 🔴
Après redéploiement Vercel (commit `749a3a2` — verifySessionDirect), tester :
1. `https://quran-tracker-web.vercel.app/login` → "Continuer avec Google"
2. Vérifier que le dashboard s'ouvre sans boucle login

### PRIORITÉ 2 — Connecter Railway à GitHub (si pas encore fait) 🔴
Railway dashboard → service `api` → Settings → Source → connecter
repo `Iebk3398/quran-tracker` branch `main`.

### PRIORITÉ 3 — Vérifier UPSTASH_REDIS vars sur Railway 🟡
Le fix Google OAuth mobile utilise Redis. Variables requises :
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### PRIORITÉ 4 — Compléter les tests d'intégration 🟡
Tests restants dans `apps/api/src/__tests__/routes/` :
- `revisions.test.ts`
- `feed.test.ts`
- `notifications.test.ts`
- `objectives.test.ts`

### PRIORITÉ 5 — Objectifs (objectives.ts) 🟢
Fichier existant mais exclu du tsconfig ET non importé dans index.ts.

---

## Architecture auth (référence rapide)

```
Login OTP :
  signIn.emailOtp() → onResponse capture set-auth-token → localStorage
  data.session.token → localStorage (fallback explicite)
  window.location.href = '/dashboard'

Login Google OAuth :
  /auth/google → loopback sign-in/social → state cookies dans Redis
  → redirect Google → /api/auth/callback/google
  Si state cookie manque : restauration depuis Redis
  → session créée → /auth/relay → loopback get-session → set-auth-token
  → redirect /dashboard?token=xxx
  AuthGuard lit ?token → localStorage → verifySessionDirect() → 200 + user ✅

Auth-guard (dashboard) :
  verifySessionDirect() — fetch DIRECT Railway avec Bearer token (bypass cache BA)
  3 tentatives (0/400/1500ms)
  Succès → setSessionCookie('ba-logged-in') → status 'ok'
  Échec serveur → clearAllSessionData() + redirect /login
  Échec réseau → redirect /login SANS vider le token

Login page (detect existing session) :
  verifySessionDirect() → user → router.replace('/dashboard')
```

---

## Fichiers clés modifiés (toutes sessions)

```
apps/web/src/lib/auth-client.ts               ← verifySessionDirect() (NOUVEAU)
apps/web/src/components/shared/auth-guard.tsx  ← verifySessionDirect() + 3 retries
apps/web/src/app/(auth)/login/page.tsx         ← verifySessionDirect() + token fix
apps/web/src/components/shared/sidebar.tsx     ← logout handler
apps/web/src/components/group/hizb-tracker.tsx ← reset count + XP variables
apps/api/Dockerfile                            ← npm install + web stub
apps/api/src/index.ts                          ← /auth/google + /auth/relay + CORS
apps/api/src/lib/auth.ts                       ← Better Auth config + trustedOrigins
apps/api/src/__tests__/helpers/chain.ts        ← Drizzle mock helper
```

---

## Commits de cette session (dans l'ordre)

```
97e1635  fix(auth): mobile Safari state_mismatch + OTP session warm-up
267d4da  fix(auth): revert relay callbackURL — regression dashboard inaccessible
0a4501d  fix(auth): relay loopback get-session pour extraire le vrai bearer token
1797f2b  fix(auth): expose set-auth-token via CORS pour mobile Safari
749a3a2  fix(auth): bypass Better Auth cache with verifySessionDirect()
```

---

## Comment démarrer/terminer une session

**Début :** **"relay"** ou **"charge le contexte ikraa"**
**Fin :** **"mets à jour le relay"** → commit + push + mise à jour SKILL.md

Claude proposera de commencer par :
1. Tester le flux Google OAuth complet en prod
2. Connecter Railway à GitHub si pas encore fait
3. Reprendre les tests d'intégration manquants
