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
| Auth | Google OAuth uniquement (OTP supprimé). Bearer token dans `localStorage` (`ba-session-token`) |
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

## Ce qui a été corrigé (session 2026-03-16 — suite)

### 1. Build Vercel échoué — `useStore is not exported from '@/store'` ✅
- **Problème :** `profile-client.tsx` et `dashboard-client.tsx` importaient `useStore`
  qui n'existe pas — le store exporte `useAppStore`.
- **Fix :** Remplacement `useStore` → `useAppStore` dans les deux fichiers.
- **Fichiers :** `apps/web/src/app/(dashboard)/profile/profile-client.tsx`,
  `apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx`

### 2. Logout cross-origin hang ✅
- **Problème :** `await signOut()` peut hanger indéfiniment en cross-origin (Vercel→Railway).
- **Fix :** `handleLogout()` non-async : vide localStorage + cookie `ba-logged-in` +
  `reset()` store → `signOut().catch()` fire & forget → `window.location.href = '/login'`.
- **Fichier :** `apps/web/src/components/shared/sidebar.tsx`

### 3. Bouton déconnexion mobile manquant ✅
- **Fix :** Bouton "Quitter" ajouté dans la bottom nav mobile (sidebar.tsx).

### 4. UX simplification majeure — login Google only ✅
- **Supprimé :** Tout le flow OTP (email input, code 6 chiffres, handleSendOtp, step state).
- **Gardé :** `verifySessionDirect()` redirect check + bouton Google OAuth uniquement.
- **Fichier :** `apps/web/src/app/(auth)/login/page.tsx`

### 5. Dashboard redesign — 3 onglets + Progress Ring SVG ✅
- **Supprimé :** `GroupFeed`, `HizbTracker`, `GroupStats` (composants retirés du dashboard).
- **Ajouté :** 3 tabs animés : Lecture 📖 (ring ambré) | Mémorisation 🌙 | Objectifs 🎯.
- **Progress Ring :** SVG animé `stroke-dashoffset` + `rotate(-90deg)`, transition 0.9s.
- **Partage :** `navigator.share()` natif iOS/Android, fallback clipboard desktop.
- **Fichier :** `apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx`

### 6. Responsive mobile complet ✅
- **Topbar :** `h-14 sm:h-16`, logo mobile `BookOpen`, `px-3 sm:px-4`.
- **Sidebar bottom nav :** `mobileLabel` courts ("Accueil", "Profil", "Sourates"…),
  `text-[10px]`, `py-2.5`, icônes `h-[22px] w-[22px]`.
- **GroupStats :** `shortLabel` par card, labels adaptatifs `sm:hidden / hidden sm:inline`.
- **Leaderboard :** avatars `w-8 h-8 sm:w-10 sm:h-10`, level name `hidden sm:inline`.
- **Layout :** `pb-24` mobile (espace bottom nav), `md:pb-6` desktop.
- **Profil modal :** bottom sheet sur mobile (`items-end sm:items-center`,
  `rounded-t-3xl sm:rounded-2xl`, `max-h-[90vh] overflow-y-auto`).

---

## Ce qui reste à faire

### PRIORITÉ 1 — Vérifier le build Vercel (commit `bca085c`) 🔴
Vérifier sur https://vercel.com que le déploiement du dernier commit est vert.
Si échoué, lire les logs build et corriger.

### PRIORITÉ 2 — Tester le flux Google OAuth complet en prod 🔴
1. `https://quran-tracker-web.vercel.app/login` → "Continuer avec Google"
2. Vérifier que le dashboard s'ouvre sans boucle login
3. Tester sur mobile (iOS Safari) — state_mismatch fix toujours actif

### PRIORITÉ 3 — Connecter Railway à GitHub (si pas encore fait) 🔴
Railway dashboard → service `api` → Settings → Source → connecter
repo `Iebk3398/quran-tracker` branch `main`.

### PRIORITÉ 4 — Onglet Objectifs : brancher l'API 🟡
L'onglet "Objectifs 🎯" du dashboard affiche un stub. Il faut :
- Créer/vérifier `apps/api/src/routes/objectives.ts`
- Brancher le composant `GroupGoal` ou similaire dans le tab
- L'activer dans `apps/api/src/index.ts`

### PRIORITÉ 5 — Compléter les tests d'intégration 🟡
Tests restants dans `apps/api/src/__tests__/routes/` :
- `revisions.test.ts`
- `feed.test.ts`
- `notifications.test.ts`
- `objectives.test.ts`

### PRIORITÉ 6 — Vérifier UPSTASH_REDIS vars sur Railway 🟢
Le fix Google OAuth mobile utilise Redis. Variables requises :
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

## Architecture auth (référence rapide)

```
Login (Google OAuth uniquement — OTP supprimé) :
  /auth/google → loopback sign-in/social → state cookies dans Redis
  → redirect Google → /api/auth/callback/google
  Si state cookie manque : restauration depuis Redis (fix Safari ITP)
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

Logout :
  localStorage.removeItem('ba-session-token')
  document.cookie = 'ba-logged-in=; expires=...' (supprime cookie)
  reset() Zustand store
  signOut().catch() — fire & forget, jamais await (cross-origin hang)
  window.location.href = '/login'
```

---

## Fichiers clés modifiés (toutes sessions)

```
apps/web/src/lib/auth-client.ts                          ← verifySessionDirect() (NOUVEAU)
apps/web/src/components/shared/auth-guard.tsx             ← verifySessionDirect() + 3 retries
apps/web/src/app/(auth)/login/page.tsx                   ← Google only, verifySessionDirect()
apps/web/src/components/shared/sidebar.tsx               ← logout + mobile bottom nav
apps/web/src/components/shared/topbar.tsx                ← responsive mobile (h-14 sm:h-16)
apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx ← redesign 3 tabs + ProgressRing SVG
apps/web/src/app/(dashboard)/profile/profile-client.tsx  ← bottom sheet + useAppStore fix
apps/web/src/app/(dashboard)/layout.tsx                  ← padding responsive mobile/desktop
apps/web/src/components/group/group-stats.tsx            ← shortLabel responsive
apps/web/src/components/group/leaderboard.tsx            ← responsive avatars + labels
apps/web/src/components/group/hizb-tracker.tsx           ← reset count + XP variables
apps/api/Dockerfile                                      ← npm install + web stub
apps/api/src/index.ts                                    ← /auth/google + /auth/relay + CORS
apps/api/src/lib/auth.ts                                 ← Better Auth config + trustedOrigins
apps/api/src/__tests__/helpers/chain.ts                  ← Drizzle mock helper
```

---

## Commits de cette session (dans l'ordre)

```
97e1635  fix(auth): mobile Safari state_mismatch + OTP session warm-up
267d4da  fix(auth): revert relay callbackURL — regression dashboard inaccessible
0a4501d  fix(auth): relay loopback get-session pour extraire le vrai bearer token
1797f2b  fix(auth): expose set-auth-token via CORS pour mobile Safari
749a3a2  fix(auth): bypass Better Auth cache with verifySessionDirect()
87cdc83  fix(profile): useAppStore au lieu de useStore (export correct du store)
782d08a  fix(ux): logout fonctionnel + mobile logout + responsive + useSession cross-origin
dcfbcfa  feat(dashboard): bouton Partager le code d'invitation du groupe
b782137  feat(ux): simplification majeure — login Google only + dashboard 2 modes
81b8804  feat(dashboard): redesign 3 tabs + progress ring SVG + UX épuré
bca085c  fix(responsive): optimisation mobile complète — espaces, textes, composants
```

---

## Comment démarrer/terminer une session

**Début :** **"relay"** ou **"charge le contexte ikraa"**
**Fin :** **"mets à jour le relay"** → commit + push + mise à jour SKILL.md

Claude proposera de commencer par :
1. Vérifier le build Vercel (commit `bca085c`) — logs Vercel
2. Tester le flux Google OAuth complet en prod sur mobile et desktop
3. Brancher l'onglet Objectifs avec l'API `objectives.ts`
