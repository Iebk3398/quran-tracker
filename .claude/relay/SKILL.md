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
- **Problème :** Safari ITP (Bounce Tracking Prevention) purge les cookies de
  `api.railway.app` après le redirect vers Google → `state_mismatch`.
- **Fix 1 :** `/auth/google` sauvegarde le state cookie dans Redis (TTL 10 min).
- **Fix 2 :** Route `/api/auth/callback/google` ajoutée avant le handler général.
  Si le state cookie manque, il est restauré depuis Redis avant de passer à Better Auth.
- **Fix 3 :** Le `callbackURL` passe par `/auth/relay` (same-origin API) qui extrait
  le bearer token et le passe en `?token=xxx` au frontend. Résout le manque de
  cookie cross-origin sur Safari après OAuth.
- **Fichier :** `apps/api/src/index.ts`

### 2. OTP "Session introuvable" sur mobile — login/page.tsx ✅
- **Problème :** `getSession()` après OTP échouait sur mobile (cold start Railway
  + réseau lent) → message d'erreur → user bloqué sur login.
- **Fix :** Retries jusqu'à 3 fois (0/800/2000ms). Même si tous les retries
  échouent, redirect vers /dashboard — AuthGuard valide et gère l'éventuel échec.
- **Fichier :** `apps/web/src/app/(auth)/login/page.tsx`

### 3. Relay skill renommé et réorganisé ✅
- `ikraa-relay` → `relay` (nom + triggers)
- `.claude/skills/ikraa-relay/` → `.claude/relay/`
- Copié dans `~/.claude/skills/relay/` (global)
- Procédure fin de session ajoutée (commit + merge + push + sync)

### 4. Cleanup worktrees stale ✅
- Suppression de `.claude/worktrees/elegant-ride` et `jolly-torvalds`
  qui bloquaient git (références à des containers Claude disparus).

---

## Ce qui reste à faire

### PRIORITÉ 1 — Connecter Railway à GitHub 🔴
**Pourquoi :** Sans ça, aucun fix déployé automatiquement.
**Comment :** Railway dashboard → service `api` → Settings → Source → connecter
repo `Iebk3398/quran-tracker` branch `main`.

### PRIORITÉ 2 — Vérifier le déploiement après connexion GitHub 🔴
Une fois GitHub connecté, Railway va rebuilder. Vérifier :
- Google OAuth mobile → plus de `state_mismatch`
- OTP mobile → accès dashboard sans boucle
- `POST https://api-production-e758.up.railway.app/api/users/me/hizb` → 200

### PRIORITÉ 3 — Vérifier que UPSTASH_REDIS_REST_URL est configuré sur Railway 🟡
Le fix Google OAuth mobile utilise Redis. S'assurer que les variables sont dans Railway :
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
Login mobile (OTP) :
  signIn.emailOtp() → onResponse capture set-auth-token → localStorage
  data.session.token → localStorage (fallback explicite)
  getSession() warm-up avec retries (0/800/2000ms)
  window.location.href = '/dashboard' (même si warm-up échoue)

Login mobile (Google OAuth) :
  /auth/google → loopback sign-in/social → state cookies dans Redis
  → redirect Google → /api/auth/callback/google
  Si state cookie manque : restauration depuis Redis
  → session créée → /auth/relay → ?token=xxx → dashboard
  AuthGuard lit ?token → localStorage → getSession() avec Bearer ✓

Auth-guard (dashboard) :
  getSession() avec Authorization: Bearer <token>
  3 tentatives (0/400/1500ms)
  Succès → setSessionCookie('ba-logged-in') → status 'ok'
  Échec serveur → clearAllSessionData() + redirect /login
  Échec réseau → redirect /login SANS vider le token
```

---

## Fichiers clés modifiés cette session

```
apps/api/src/index.ts                         ← Redis state backup + callback route + relay callbackURL
apps/web/src/app/(auth)/login/page.tsx        ← retries getSession() + redirect sans bloquer
.claude/relay/SKILL.md                        ← relay skill (ex ikraa-relay)
```

---

## Commits de cette session

```
97e1635  fix(auth): mobile Safari state_mismatch + OTP session warm-up
```

---

## Comment démarrer/terminer une session

**Début :** `/relay` ou **"relay"**
**Fin :** **"mets à jour le relay"** → commit + merge + push + mise à jour SKILL.md + sync global
