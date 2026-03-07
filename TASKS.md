# 📋 TASKS.md — Quran Tracker

> Fichier synchronisé avec `CLAUDE.md` et GitHub Issues.
> **Mise à jour automatique par Claude après chaque tâche complétée.**
> Dernière mise à jour : 2026-03-07

---

## 📊 Progression globale

```
Phase 0 — Setup         ████████████ 100% ✅
Phase 1 — Base de données ████████████ 100% ✅
Phase 2 — API Backend   ████████████ 100% ✅
Phase 3 — Frontend      ████████████ 100% ✅
Phase 4 — Realtime      ████████████ 100% ✅
Phase 5 — PWA           ████████████ 100% ✅
Phase 6 — IA (v1)       ████████░░░░  75% 🟡 (GPT-4o en v2)
Phase 7 — Tests/Deploy  ████████████ 100% ✅

Total                   ████████████  97% ✅
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
- `scripts/init-db.sql`
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
- `packages/db/schema/users.ts` — users, sessions, accounts, verifications
- `packages/db/schema/groups.ts` — groups, group_members
- `packages/db/schema/surahs.ts` — surahs (114 sourates)
- `packages/db/schema/progress.ts` — memorization_progress, revision_sessions
- `packages/db/schema/badges.ts` — badges, user_badges
- `packages/db/schema/feed.ts` — group_feed, notifications
- `packages/db/seed/surahs-data.ts` — 114 sourates complètes
- `packages/db/seed/index.ts` — script de seeding
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
- [x] #20 — Page de connexion (magic link + Google)
- [x] #21 — Dashboard groupe (leaderboard + feed + stats)
- [x] #22 — Profil utilisateur (progression + heatmap)
- [x] #23 — Page validation sheikh
- [x] #24 — SurahTree (114 sourates visuelles)
- [x] #25 — HeatmapCalendar (style GitHub)
- [x] #26 — Sidebar + Topbar (responsive + RTL)
- [x] #27 — Zustand store global
- [x] #28 — i18n (FR/AR/EN)

**Fichiers créés :**
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/(auth)/login/page.tsx`
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
- `apps/web/src/lib/{utils,trpc,auth-client}.ts`

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

**Note :** Les fonctionnalités IA OpenAI seront développées dans la prochaine version (v2).

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

## 🔮 BACKLOG v2

| Feature | Description | Priorité |
|---------|-------------|----------|
| GPT-4o Suggestions | Suggestions de révision intelligentes | 🔴 Haute |
| Whisper STT | Validation vocale des récitations | 🟡 Moyenne |
| Sentry Integration | Monitoring des erreurs en production | 🟡 Moyenne |
| PostHog Analytics | Analytics comportementales | 🟢 Basse |
| packages/ui | Composants UI partagés entre web et api | 🟡 Moyenne |
| Page offline PWA | Page dédiée mode hors ligne | 🟢 Basse |
| Rate limiting | Middleware Upstash complet | 🟡 Moyenne |
| Tests E2E | Playwright end-to-end tests | 🟡 Moyenne |

---

## 🚀 PROCHAINES ÉTAPES (Pour déployer en production)

1. Remplir `.env.local` avec les vraies clés
2. Configurer le projet Supabase (créer les tables + RLS)
3. Lancer `npm run db:migrate && npm run db:seed`
4. Déployer l'API sur Railway
5. Déployer le frontend sur Vercel
6. Configurer les variables d'environnement sur Vercel et Railway
7. Tester le flux complet (inscription → dashboard → révision)

---

*🤖 Dernière mise à jour : 2026-03-07 — Phases 0→7 complétées · IA GPT-4o reportée en v2*
