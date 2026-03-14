# 📋 TASKS.md — Quran Tracker

> Fichier synchronisé avec `CLAUDE.md` et GitHub Issues.
> **Mise à jour automatique par Claude après chaque tâche complétée.**
> Dernière mise à jour : 2026-03-08

---

## 📊 Progression globale

```
Phase 0 — Setup           ████████████ 100% ✅
Phase 1 — Base de données ████████████ 100% ✅
Phase 2 — API Backend     ████████████ 100% ✅
Phase 3 — Frontend        ████████████ 100% ✅
Phase 4 — Realtime        ████████████ 100% ✅
Phase 5 — PWA             ████████████ 100% ✅
Phase 6 — IA (v1)         ████████░░░░  75% 🟡 (GPT-4o en v2)
Phase 7 — Tests/Deploy    ████████████ 100% ✅
Run local (debug)         ████████████ 100% ✅
Pages connectées API      ████████████ 100% ✅

Total                     ████████████  99% ✅
```

---

## ✅ PHASE 0 — Setup Monorepo + Config (Issues #1→#5)

- [x] #1 — Initialiser Turborepo avec npm workspaces
- [x] #2 — Configurer TypeScript strict (tsconfig.base.json)
- [x] #3 — Docker Compose (PostgreSQL 16 + Redis 7 + Adminer)
- [x] #4 — Variables d'environnement (.env.example)
- [x] #5 — GitHub Actions CI/CD (ci.yml + deploy.yml)

**Fichiers créés :**
- `package.json` (root + workspaces)
- `turbo.json`
- `tsconfig.base.json`
- `.gitignore`
- `.env.example`
- `.prettierrc`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

---

## ✅ PHASE 1 — Base de données + Seed (Issues #6→#10)

- [x] #6 — Schema Drizzle ORM (6 tables)
- [x] #7 — Migrations initiales
- [x] #8 — Seed des 114 sourates (données réelles)
- [x] #9 — 8 badges initiaux
- [x] #10 — Algorithme SM-2 (Spaced Repetition)

**Fichiers créés :**
- `packages/db/src/schema/users.ts` — users, sessions, accounts, verifications
- `packages/db/src/schema/groups.ts` — groups, group_members
- `packages/db/src/schema/surahs.ts` — surahs (114 sourates)
- `packages/db/src/schema/progress.ts` — memorization_progress, revision_sessions
- `packages/db/src/schema/badges.ts` — badges, user_badges
- `packages/db/src/schema/feed.ts` — group_feed, notifications
- `packages/db/src/seed/surahs-data.ts` — 114 sourates complètes
- `packages/db/src/seed/index.ts` — script de seeding
- `packages/db/src/lib/spaced-repetition.ts` — algorithme SM-2

---

## ✅ PHASE 2 — API Backend Hono.js (Issues #11→#18)

- [x] #11 — Serveur Hono.js avec middlewares
- [x] #12 — Better Auth (magic link + Google OAuth)
- [x] #13 — Routes groupes (CRUD + leaderboard)
- [x] #14 — Routes progression (114 sourates + validation sheikh)
- [x] #15 — Routes révisions (sessions + SM-2)
- [x] #16 — Routes feed (timeline + réactions)
- [x] #17 — Routes notifications
- [x] #18 — Routes sourates

**Fichiers créés :**
- `apps/api/src/index.ts`
- `apps/api/src/lib/auth.ts`
- `apps/api/src/lib/badges.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/ratelimit.ts`
- `apps/api/src/routes/{auth,groups,progress,revisions,feed,notifications,surahs,ai}.ts`

---

## ✅ PHASE 3 — Frontend Next.js 15 (Issues #19→#28)

- [x] #19 — Layout racine (RTL, i18n, providers)
- [x] #20 — Page de connexion (magic link + Google) — **fonctionnelle**
- [x] #21 — Dashboard groupe (leaderboard + feed + stats)
- [x] #22 — Profil utilisateur (progression + heatmap)
- [x] #23 — Page validation sheikh
- [x] #24 — SurahTree (114 sourates visuelles)
- [x] #25 — HeatmapCalendar (style GitHub)
- [x] #26 — Sidebar + Topbar (responsive + RTL)
- [x] #27 — Zustand store global
- [x] #28 — i18n (FR/AR/EN)

**Fichiers créés/modifiés :**
- `apps/web/src/app/page.tsx` — redirect vers /login
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/(auth)/login/page.tsx` — magic link réel
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/profile/page.tsx`
- `apps/web/src/app/(sheikh)/validate/page.tsx`
- `apps/web/src/components/quran/{surah-tree,heatmap-calendar}.tsx`
- `apps/web/src/components/group/{leaderboard,group-stats,group-feed,active-streaks}.tsx`
- `apps/web/src/components/shared/{sidebar,topbar,providers,skeletons}.tsx`
- `apps/web/src/store/index.ts`
- `apps/web/src/i18n/request.ts`
- `apps/web/src/messages/{fr,ar,en}.json`
- `apps/web/src/lib/{utils,auth-client}.ts`
- `apps/web/postcss.config.mjs` — Tailwind v4
- `apps/web/tsconfig.json` — alias @/

---

## ✅ PHASE 4 — Realtime WebSockets (Issues #29→#32)

- [x] #29 — Hook useGroupRealtime (Supabase CDC)
- [x] #30 — Invalidation cache TanStack Query
- [x] #31 — Écoute group_feed INSERT
- [x] #32 — Écoute memorization_progress changes

**Fichiers créés :**
- `apps/web/src/hooks/use-group-realtime.ts`

---

## ✅ PHASE 5 — PWA + Notifications Push (Issues #33→#36)

- [x] #33 — manifest.json (icônes, raccourcis, screenshots)
- [x] #34 — Service Worker (cache-first + network-first)
- [x] #35 — Push Notifications (VAPID + subscription)
- [x] #36 — Route API push/subscribe

**Fichiers créés :**
- `apps/web/public/manifest.json`
- `apps/web/public/sw.js`
- `apps/web/src/hooks/use-push-notifications.ts`
- `apps/web/src/app/api/push/subscribe/route.ts`

---

## 🟡 PHASE 6 — IA + Spaced Repetition (Issues #37→#40)

- [x] #37 — Algorithme SM-2 complet (calculateSM2, isReviewDue, getRevisionPriority)
- [x] #38 — Architecture routes IA (stubs v1)
- [ ] #39 — Intégration GPT-4o (suggestions intelligentes) **→ v2**
- [ ] #40 — Whisper API (validation vocale) **→ v2**

**Fichiers créés :**
- `packages/db/src/lib/spaced-repetition.ts` (SM-2 complet)
- `apps/api/src/routes/ai.ts` (architecture prête, stubs pour v1)

---

## ✅ PHASE 7 — Tests + CI/CD + Déploiement (Issues #41→#45)

- [x] #41 — Tests unitaires SM-2 (Vitest)
- [x] #42 — Tests unitaires badges + XP
- [x] #43 — CI GitHub Actions (typecheck + lint + test + build)
- [x] #44 — Config déploiement Vercel (web)
- [x] #45 — Config déploiement Railway (api) + Dockerfile

**Fichiers créés :**
- `packages/db/src/lib/spaced-repetition.test.ts`
- `packages/db/vitest.config.ts`
- `apps/api/src/lib/badges.test.ts`
- `apps/api/vitest.config.ts`
- `apps/web/vercel.json`
- `apps/api/railway.json`
- `apps/api/Dockerfile`

---

## 🐛 CORRECTIONS & HOTFIXES (2026-03-08)

### Fix — Setup local complet (run local)

**Problème de rendu frontend :**
- [x] Créé `apps/web/src/app/page.tsx` (manquant → 404 sur `/`)
- [x] Supprimé `apps/web/app/` vide qui shadowing `src/app/`
- [x] Supprimé import Google Fonts (inaccessible en local)
- [x] Corrigé `globals.css` : `@apply border-border` → CSS plain (Tailwind v4)
- [x] Créé `apps/web/postcss.config.mjs` (requis pour Tailwind v4)
- [x] Créé `apps/web/tsconfig.json` avec alias `@/` → `./src/`

**Fix packages Linux dans root package.json :**
- [x] Retiré `@esbuild/linux-arm64`, `@next/swc-linux-arm64-gnu` (ajoutés par erreur en sandbox Linux)
- [x] Retiré `next@16` ajouté par erreur (`npm i next@latest`)

**Fix ESM hoisting + chargement env :**
- [x] Tous les scripts db (`migrate`, `seed`, `reset`) utilisent `--env-file-if-exists=../../.env.local`
- [x] Script `dev` de l'API utilise `--env-file-if-exists=../../.env.local`
- [x] Suppression des appels `dotenv.config()` dans `seed/index.ts` (inutiles car hissage ESM)
- [x] Ajout `"type": "module"` dans `packages/db/package.json` et `apps/api/package.json`

**Fix Better Auth :**
- [x] `auth-client.ts` : `baseURL` pointe vers `localhost:3001` (API) via `NEXT_PUBLIC_API_URL`
- [x] `auth.ts` : ajout `trustedOrigins: ['http://localhost:3000']`
- [x] `auth.ts` : correction des clés schema `{ user, session, account, verification }` (singulier)
- [x] `auth.ts` : montage direct `app.on(['GET','POST'], '/api/auth/*', ...)` au lieu du sub-router Hono
- [x] `BETTER_AUTH_URL` mis à jour vers `http://localhost:3001` dans `.env.local`
- [x] `NEXT_PUBLIC_API_URL=http://localhost:3001` ajouté dans `.env.local`

**Fix schema Drizzle :**
- [x] `emailVerified` : `timestamp` → `boolean` (Better Auth v1.x passe `true`/`false`)
- [x] Migration `0001` générée et appliquée (ALTER TABLE users)
- [x] `callbackURL` dans le formulaire login : URL absolue `http://localhost:3000/dashboard`

**Fix dependencies :**
- [x] `resend` installé dans `apps/api` (manquait → `ERR_MODULE_NOT_FOUND`)

**Ajout script db:reset :**
- [x] `packages/db/src/reset.ts` — nettoie toutes les tables/types/schéma drizzle
- [x] `db:reset` ajouté dans `packages/db/package.json`, `package.json` (root), `turbo.json`

---

## ✅ PAGES CONNECTÉES À L'API (2026-03-08)

### Dashboard — données live
- [x] Endpoint `GET /api/groups/me` ajouté (groupes de l'utilisateur connecté)
- [x] `apps/web/src/lib/api.ts` — utilitaire `apiFetch` (credentials + base URL)
- [x] `dashboard-client.tsx` — leaderboard, stats groupe, feed, streaks depuis l'API
- [x] Si aucun groupe : formulaire "Rejoindre avec code d'invitation"
- [x] Stats groupe calculées client-side depuis le leaderboard

### Profil — données réelles
- [x] `profile-client.tsx` — session utilisateur, progression 114 sourates depuis l'API
- [x] Nombre de sourates mémorisées calculé dynamiquement
- [x] XP, streak, longestStreak depuis la session Better Auth
- [x] HeatmapCalendar alimenté par les dates de révision réelles
- [x] SurahTree alimenté par la progression réelle

### Page Settings — nouvelle page
- [x] `apps/web/src/app/(dashboard)/settings/page.tsx` créée (résout le 404)
- [x] Sélecteur de langue (fr/ar/en) — connecté au Zustand store
- [x] Sélecteur de thème (light/dark/system) — connecté au Zustand store
- [x] Affichage infos compte (nom, email depuis session)
- [x] Bouton déconnexion (signOut Better Auth + redirect /login)

**Fichiers créés/modifiés :**
- `apps/api/src/routes/groups.ts` — `GET /api/groups/me`
- `apps/web/src/lib/api.ts` — `apiFetch` utility
- `apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx` — nouveau
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — simplifié
- `apps/web/src/app/(dashboard)/profile/profile-client.tsx` — nouveau
- `apps/web/src/app/(dashboard)/profile/page.tsx` — simplifié
- `apps/web/src/app/(dashboard)/settings/page.tsx` — nouveau

---

## ✅ CORRECTIONS UX + AUTH (2026-03-11)

### Fix — Bearer token + Google OAuth local

- [x] `bearer()` plugin ajouté à Better Auth (auth cross-origin Vercel → Railway)
- [x] `auth-client.ts` : `onResponse` capture `set-auth-token` → stocké dans `localStorage`
- [x] `api.ts` : `apiFetch` envoie `Authorization: Bearer <token>` sur tous les appels
- [x] `SessionBootstrap` component : bootstrap du bearer token après Google OAuth (redirect serveur)
- [x] `dashboard/layout.tsx` : `<SessionBootstrap />` monté au chargement du dashboard
- [x] `login/page.tsx` : fallback localhost pour Google OAuth en dev local
- [x] `apps/web/.env.local` créé : `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_APP_URL` pour Next.js
- [x] Google Console : URI `http://localhost:3001/api/auth/callback/google` enregistrée
- [x] Google Console : URI incorrecte `http://localhost:3000/api/auth/callback/google` supprimée

### Fix — Profile edit (OTP users)

- [x] `profile-client.tsx` : `openEdit()` pré-remplit le nom depuis l'email si vide
- [x] Champ nom : attribut `required` supprimé (bloquait la sauvegarde OTP users)
- [x] Correction rôle `super_admin` dans le formulaire d'édition

### Fix — Page Sourates

- [x] Sauvegarde statut : `onSuccess` ferme le menu, `onError` garde le menu ouvert + affiche l'erreur
- [x] Mise à jour optimiste inclut `verseFrom`/`verseTo`
- [x] Sections Juz repliables (état `Set<number>` + bouton chevron)

### Améliorations UX

- [x] `ThemeSync` component : applique la classe `.dark` sur `<html>` depuis Zustand store
- [x] Page Settings : changement de langue avec `router.refresh()` + infos profil complètes (avatar, rôle)
- [x] `HeatmapCalendar` : 3 vues (7 jours / ce mois / 12 mois) avec tab switcher
- [x] Page Profil : barre de progression, stats colorées, section progression Coran enrichie

**Fichiers modifiés :**
- `apps/api/src/lib/auth.ts` — bearer plugin
- `apps/api/src/lib/badges.test.ts` — fix test baseStats
- `apps/web/src/lib/auth-client.ts` — onResponse capture token
- `apps/web/src/lib/api.ts` — Bearer header dans apiFetch
- `apps/web/src/components/shared/session-bootstrap.tsx` — nouveau
- `apps/web/src/components/shared/providers.tsx` — ThemeSync
- `apps/web/src/app/(dashboard)/layout.tsx` — SessionBootstrap
- `apps/web/src/app/(auth)/login/page.tsx` — fallback localhost OAuth
- `apps/web/src/app/(dashboard)/profile/profile-client.tsx` — UX améliorée
- `apps/web/src/app/(dashboard)/settings/page.tsx` — profil + locale fix
- `apps/web/src/app/(dashboard)/surahs/surahs-client.tsx` — save fix + Juz repliable
- `apps/web/src/components/quran/heatmap-calendar.tsx` — 3 vues
- `apps/web/.env.local` — env vars Next.js local

---

## ✅ FEED EVENTS + FIX AUTH OTP (2026-03-14)

### Feed events complets

- [x] Nouveau module `apps/api/src/lib/levels.ts` — `LEVELS[]` + `getLevelIndex(xp, surahs)` + `getLevel()` partagé
- [x] `progress.ts` — `awardBadgesAndCheckLevel()` : attribution badges + event `badge_earned` + vérification montée niveau après mémorisation et validation sheikh
- [x] `progress.ts` — `handlePostMemorizationEvents()` / `handlePostValidationEvents()` : feed `surah_memorized` / `surah_validated` + badges + level_up
- [x] `users.ts` — `handlePostHizbEvents()` : event `milestone_reached(type=hizb_read)` + level_up si montée de niveau (imports statiques, suppression des dynamic imports)
- [x] `group-feed.tsx` — affiche **numéro + nom arabe** des sourates · gère `milestone_reached` sub-types (`hizb_read` / `level_up`) · `getFeedIcon()` dynamique · nom arabe badge

### Fix boucle infinie auth OTP

- [x] `auth-guard.tsx` — `clearAllSessionData()` vide AUSSI `localStorage` (`ba-session-token`) en cas d'échec session, + retry unique 350ms avant redirect `/login`
- [x] `login/page.tsx` — vérifie `getSession()` après `signIn.emailOtp()` avant de rediriger : affiche un message d'erreur si la session n'est pas établie

### Fix query key + XP toast

- [x] `hizb-tracker.tsx` — query key corrigée : `['group', groupId, 'leaderboard']` au lieu de `['leaderboard', groupId]`
- [x] `hizb-tracker.tsx` — XP toast corrigé : 5 XP/hizb (était affiché à 10 par erreur)

### Fix schéma DB

- [x] `packages/db/src/schema/progress.ts` — `'consolidated'` ajouté à `memorizationStatusEnum`
- [x] `packages/types/src/index.ts` — `'consolidated'` ajouté à `MemorizationStatus`
- [x] `apps/api/src/routes/progress.ts` — `'consolidated'` ajouté au Zod enum `updateProgressSchema`
- [ ] ⚠️ Migration SQL en attente : `ALTER TYPE memorization_status ADD VALUE 'consolidated';`

**Fichiers créés/modifiés :**
- `apps/api/src/lib/levels.ts` — **nouveau**
- `apps/api/src/routes/progress.ts`
- `apps/api/src/routes/users.ts`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/components/group/group-feed.tsx`
- `apps/web/src/components/group/hizb-tracker.tsx`
- `apps/web/src/components/shared/auth-guard.tsx`
- `packages/db/src/schema/progress.ts`
- `packages/types/src/index.ts`

---

## 🔮 BACKLOG v2

| Feature | Description | Priorité |
|---------|-------------|----------|
| GPT-4o Suggestions | Suggestions de révision intelligentes | 🔴 Haute |
| Whisper STT | Validation vocale des récitations | 🟡 Moyenne |
| Objectifs partagés | Fixer des objectifs de mémorisation + partage entre users | 🔴 Haute |
| Sentry Integration | Monitoring des erreurs en production | 🟡 Moyenne |
| PostHog Analytics | Analytics comportementales | 🟢 Basse |
| packages/ui | Composants UI partagés entre web et api | 🟡 Moyenne |
| Page offline PWA | Page dédiée mode hors ligne | 🟢 Basse |
| Rate limiting | Middleware Upstash complet | 🟡 Moyenne |
| Tests E2E | Playwright end-to-end tests | 🟡 Moyenne |

---

## ✅ DÉPLOIEMENT PRODUCTION (2026-03-08)

### API → Railway
- [x] Dockerfile `node:22-alpine` + `--experimental-strip-types` (pas de build step)
- [x] `railway.json` avec builder DOCKERFILE
- [x] Variables d'environnement Railway configurées : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [x] Domaine Railway : **https://api-production-e758.up.railway.app**
- [x] Health check : `GET /health` → `{ status: 'ok' }`

### Frontend → Vercel
- [x] `vercel.json` avec Turborepo + rootDirectory config
- [x] Variables Vercel configurées : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] URL production : **https://quran-tracker-web.vercel.app**

### CORS & Auth fix
- [x] CORS Hono : origin function qui accepte tous les `*.vercel.app` (previews inclus)
- [x] Better Auth `trustedOrigins` : regex `/^https:\/\/.*\.vercel\.app$/`
- [x] `BETTER_AUTH_URL` = URL Railway (pour les redirects magic link)
- [x] `callbackURL` magic link = URL absolue Vercel

### Prochaines étapes (à valider)
- [x] Google OAuth local fonctionnel (URI enregistrée dans Google Console)
- [ ] Activer Sentry + PostHog (monitoring)
- [ ] Configurer domaine custom (qurantracker.app)
- [ ] Implémenter objectifs partagés (feature demandée)

---

*🤖 Dernière mise à jour : 2026-03-14 — Feed events complets (hizbs/badges/level_up) · Fix boucle auth OTP · levels.ts · 'consolidated' enum · group-feed noms arabes*
