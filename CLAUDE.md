# 🕌 CLAUDE.md — Quran Tracker (Contexte Projet)

> **Fichier de référence principal pour Claude.**
> Ce fichier est **toujours mis à jour** après chaque changement majeur.
> Il permet à Claude de reprendre le contexte sans relire toute la conversation.

---

## 📌 MÉTA-INFORMATIONS

| Champ | Valeur |
|---|---|
| Projet | Quran Tracker — Suivi de mémorisation du Coran en groupe |
| Propriétaire | ilyas (iebk3398@gmail.com) |
| Dernière mise à jour | 2026-03-09 |
| Phase actuelle | ✅ DÉPLOYÉ EN PRODUCTION — Vercel + Railway |
| Repo GitHub | https://github.com/Iebk3398/quran-tracker |
| URL App (Frontend) | https://quran-tracker-web.vercel.app |
| URL API (Backend) | https://api-production-e758.up.railway.app |

---

## 🎯 OBJECTIF DU PROJET

Application web progressive (PWA) permettant à un groupe de personnes
(famille, halqa, école coranique) de **suivre visuellement et en temps réel**
leur progression dans la mémorisation du Coran.

**Utilisateurs cibles :** Sheikh/Enseignant · Élèves/Hafiz · Parents

---

## 🏗️ STACK TECHNOLOGIQUE

### Frontend
- **Framework :** Next.js 15 (App Router + Server Components)
- **Language :** TypeScript 5 (strict mode)
- **UI :** shadcn/ui + Tailwind CSS v4
- **Animations :** Framer Motion
- **State :** Zustand + TanStack Query v5
- **Charts :** Recharts
- **PWA :** Service Worker natif + manifest.json
- **i18n :** next-intl (Arabe 🇸🇦 · Français 🇫🇷 · Anglais 🇬🇧)

### Backend
- **Runtime :** Node.js 22
- **API :** Hono.js
- **Auth :** Better Auth (magic link + OAuth Google)
- **ORM :** Drizzle ORM
- **Realtime :** Supabase Realtime (WebSockets / PostgreSQL CDC)
- **Email :** Resend
- **Storage :** Cloudflare R2

### Base de données
- **Principal :** PostgreSQL via Supabase (serverless)
- **Cache :** Redis via Upstash

### IA (v2 — prochaine version)
- **LLM :** OpenAI GPT-4o (suggestions révision) — architecture prête, implémentation v2
- **STT :** Whisper API (validation vocale optionnelle) — prévu v2

### Infrastructure
- **Frontend :** Vercel
- **Backend :** Railway
- **CI/CD :** GitHub Actions
- **Monitoring :** Sentry + PostHog
- **Containers :** Docker + Docker Compose (dev local)
- **Task Tracking :** GitHub Issues (labels + milestones)

---

## 📁 STRUCTURE DU PROJET (Monorepo Turborepo)

```
quran-tracker/
├── apps/
│   ├── web/                    → Next.js 15 App
│   │   ├── app/
│   │   │   ├── (auth)/         → Login, Register, Magic link
│   │   │   ├── (dashboard)/    → Dashboard groupe, Profil, Leaderboard
│   │   │   │   └── layout.tsx  → Layout avec Sidebar + Topbar
│   │   │   ├── (sheikh)/       → Validation, Gestion groupe
│   │   │   └── api/            → Route handlers Next.js
│   │   │       └── push/       → Souscription notifications push
│   │   ├── components/
│   │   │   ├── ui/             → shadcn/ui components
│   │   │   ├── quran/          → SurahTree, HeatmapCalendar
│   │   │   ├── group/          → GroupFeed, Leaderboard, GroupStats, ActiveStreaks
│   │   │   └── shared/         → Sidebar, Topbar, Providers, Skeletons
│   │   ├── hooks/
│   │   │   ├── use-group-realtime.ts  → Supabase Realtime hook
│   │   │   └── use-push-notifications.ts → PWA push hook
│   │   ├── lib/
│   │   │   ├── auth-client.ts  → Better Auth client
│   │   │   ├── trpc.ts         → tRPC client
│   │   │   └── utils.ts        → cn(), formatNumber(), getInitials(), etc.
│   │   ├── messages/           → Traductions (fr.json, ar.json, en.json)
│   │   ├── store/
│   │   │   └── index.ts        → Zustand store (user, locale, theme, sidebar)
│   │   └── i18n/
│   │       └── request.ts      → next-intl server config
│   └── api/                    → Hono.js Backend
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── groups.ts       → CRUD groupes + leaderboard
│       │   ├── progress.ts     → Progression 114 sourates + validation sheikh
│       │   ├── revisions.ts    → Sessions révision + SM-2 update
│       │   ├── feed.ts         → Feed groupe + réactions
│       │   ├── notifications.ts
│       │   ├── surahs.ts
│       │   └── ai.ts           → Routes IA (stubs v1, GPT-4o en v2)
│       ├── middleware/
│       │   ├── auth.ts         → requireAuth, requireSheikh
│       │   └── ratelimit.ts    → Upstash rate limiting
│       ├── lib/
│       │   ├── auth.ts         → Better Auth config
│       │   └── badges.ts       → Logique badges + calcul XP
│       ├── vitest.config.ts
│       ├── Dockerfile
│       └── railway.json
├── packages/
│   ├── db/                     → Drizzle ORM
│   │   ├── schema/
│   │   │   ├── users.ts        → users, sessions, accounts, verifications
│   │   │   ├── groups.ts       → groups, group_members
│   │   │   ├── surahs.ts       → surahs (114 sourates)
│   │   │   ├── progress.ts     → memorization_progress, revision_sessions
│   │   │   ├── badges.ts       → badges, user_badges
│   │   │   └── feed.ts         → group_feed, notifications
│   │   ├── src/lib/
│   │   │   ├── spaced-repetition.ts       → Algo SM-2
│   │   │   └── spaced-repetition.test.ts  → Tests unitaires SM-2
│   │   ├── seed/
│   │   │   ├── surahs-data.ts  → Les 114 sourates (données réelles)
│   │   │   └── index.ts        → Seed script + 8 badges initiaux
│   │   └── vitest.config.ts
│   ├── ui/                     → Composants partagés (à compléter)
│   └── types/
│       └── src/index.ts        → Tous les types TypeScript partagés
├── scripts/
│   └── github-issues.sh        → Script création issues GitHub
├── .github/
│   └── workflows/
│       ├── ci.yml              → TypeCheck + Lint + Tests + Build
│       └── deploy.yml          → Vercel (web) + Railway (api) + Migrations
├── docker-compose.yml          → PostgreSQL 16 + Redis 7 + Adminer
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── CLAUDE.md                   ← CE FICHIER (toujours à jour)
└── TASKS.md                    → État des tâches du projet
```

---

## 🗃️ SCHÉMA BASE DE DONNÉES

```sql
-- Utilisateurs
users (id, name, email, role, avatar, createdAt)

-- Groupes
groups (id, name, description, sheikhId, inviteCode, createdAt)
group_members (userId, groupId, joinedAt, role)

-- Coran
surahs (id, nameAr, nameFr, nameEn, number, versesCount,
        juzNumber, hizbNumber, revelationType, pages)

-- Progression
memorization_progress (
  id, userId, surahId,
  status,              -- 'not_started' | 'in_progress' | 'memorized' | 'consolidated'
  verseFrom, verseTo,
  lastRevisedAt,
  validatedBySheikhAt,
  sheikhNotes,
  retentionScore,      -- Score SM-2 (Spaced Repetition)
  repetitionCount,
  intervalDays,
  nextReviewAt,
  easeFactor
)

-- Sessions de révision
revision_sessions (id, userId, surahId, duration, quality, createdAt)

-- Gamification
badges (id, name, nameAr, description, iconUrl, condition, xpReward)
user_badges (userId, badgeId, earnedAt)

-- Social
group_feed (id, groupId, userId, type, content, reactions, createdAt)
notifications (id, userId, type, payload, readAt, createdAt)
```

---

## 👥 RÔLES & PERMISSIONS

| Action | Super Admin | Sheikh | Élève | Parent |
|--------|-------------|--------|-------|--------|
| Créer un groupe | ✅ | ✅ | ❌ | ❌ |
| Inviter des membres | ✅ | ✅ | ❌ | ❌ |
| Valider une sourate | ✅ | ✅ | ❌ | ❌ |
| Saisir sa progression | ✅ | ✅ | ✅ | ❌ |
| Voir le dashboard | ✅ | ✅ | ✅ | 👁️ (lecture) |
| Gérer les badges | ✅ | ❌ | ❌ | ❌ |

---

## 🚀 PHASES DU PROJET

| Phase | Titre | Statut | Fichiers clés |
|-------|-------|--------|---------------|
| 0 | Setup Monorepo + Config | ✅ Terminé | package.json, turbo.json, docker-compose.yml, CI/CD |
| 1 | Base de données + Seed | ✅ Terminé | packages/db/schema/*, seed/surahs-data.ts |
| 2 | API Backend (Hono.js) | ✅ Terminé | apps/api/src/routes/* |
| 3 | Frontend Next.js | ✅ Terminé | apps/web/src/components/*, store, i18n |
| 4 | Realtime WebSockets | ✅ Terminé | hooks/use-group-realtime.ts |
| 5 | PWA + Notifications push | ✅ Terminé | manifest.json, sw.js, use-push-notifications.ts |
| 6 | IA + Spaced Repetition | 🟡 SM-2 ✅ / GPT-4o en v2 | routes/ai.ts (stubs), lib/spaced-repetition.ts |
| 7 | Tests + CI/CD + Déploiement | ✅ Terminé | vitest.config.ts, .github/workflows/*, Dockerfile |

---

## 🤖 FONCTIONNALITÉS IA — PROCHAINE VERSION (v2)

Les routes IA sont architecturalement prêtes dans `apps/api/src/routes/ai.ts` mais retournent des stubs en v1.

**Prévu en v2 :**
- `GET /api/ai/suggestions/:userId` → Suggestions GPT-4o basées sur SM-2
- `POST /api/ai/chat` → Assistant conversationnel (motivation, planning, Q&A)
- `GET /api/ai/daily-plan/:userId` → Plan quotidien personnalisé
- Validation vocale via Whisper API (Speech-to-Text)

---

## 🎨 DESIGN SYSTEM

- **Couleurs :** Vert émeraude `#10b981` · Or `#f59e0b` · Fond `#fafaf9`
- **Dark mode :** Natif (Tailwind dark:)
- **Typo AR :** Noto Naskh Arabic
- **Typo FR/EN :** Inter
- **Direction :** RTL auto pour l'arabe, LTR pour FR/EN
- **Mobile-first :** Breakpoints sm/md/lg/xl

---

## ⚙️ RÈGLES CLAUDE (Conventions à toujours respecter)

1. **TypeScript strict** — Aucun `any`, toujours typer explicitement
2. **Server Components** — Préférer les RSC, minimiser le `use client`
3. **Zod partout** — Validation côté serveur sur toutes les entrées
4. **Commentaires JSDoc** — Sur chaque fonction exportée
5. **Nommage :** camelCase (variables), PascalCase (composants), kebab-case (fichiers)
6. **Commits :** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
7. **Mise à jour CLAUDE.md** — Après CHAQUE changement architectural
8. **Mise à jour TASKS.md** — Après CHAQUE tâche complétée
9. **GitHub Issues** — Créer une issue avant de commencer chaque phase

---

## 📝 HISTORIQUE DES DÉCISIONS

| Date | Décision | Raison |
|------|----------|--------|
| 2026-03-07 | Choix Turborepo (monorepo) | Partage de types et composants entre web et api |
| 2026-03-07 | Choix Hono.js vs Express | Edge-ready, ultra-léger, TypeScript natif |
| 2026-03-07 | Choix Drizzle vs Prisma | Meilleure perf, type-safe natif |
| 2026-03-07 | GitHub Issues pour tasks | Suivi versionné, lié aux commits et PRs |
| 2026-03-07 | Node.js 22 au lieu de Bun | Bun non disponible dans l'environnement CI |
| 2026-03-07 | IA GPT-4o → v2 | Architecture prête, développement complet prévu en v2 |
| 2026-03-07 | Service Worker natif | Contrôle total du caching et des notifications push |
| 2026-03-08 | `db:generate` via `tsx` | drizzle-kit (CJS) incompatible ESM — `tsx node_modules/.bin/drizzle-kit generate` requis |
| 2026-03-08 | Magic link `callbackURL` absolu | URL relative redirige vers `baseURL` de l'API (3001) — toujours passer une URL absolue frontend |
| 2026-03-08 | `--env-file-if-exists` Node 22 | Seul moyen fiable de charger l'env avant le hissage ESM des imports |
| 2026-03-08 | Better Auth `trustedOrigins` | Sans cette config, les requêtes cross-port (3000→3001) sont rejetées (403) |
| 2026-03-08 | Better Auth schema clés singulier | Le Drizzle adapter attend `{ user, session, account, verification }` (singulier) |
| 2026-03-08 | Better Auth montage Hono direct | `app.on(['GET','POST'], '/api/auth/*', handler)` — le sub-router modifie l'URL et casse le routing Better Auth |
| 2026-03-08 | `emailVerified` boolean | Better Auth v1.x passe `true`/`false` — colonne doit être `boolean`, pas `timestamp` |
| 2026-03-08 | `BETTER_AUTH_URL` = port API | Doit pointer vers le serveur auth (3001), pas le frontend (3000) |
| 2026-03-08 | `apiFetch` avec `credentials: 'include'` | Obligatoire pour envoyer le cookie de session cross-port (3000→3001) |
| 2026-03-08 | `GET /api/groups/me` avant `GET /api/groups/:id` | Routes spécifiques déclarées avant les routes paramétrées dans Hono |
| 2026-03-08 | Stats groupe calculées client-side | Évite un endpoint supplémentaire — calculées depuis le leaderboard |
| 2026-03-11 | `bearer()` plugin Better Auth | Auth cross-origin Vercel→Railway via `Authorization: Bearer` + `set-auth-token` header |
| 2026-03-11 | `SessionBootstrap` component | Bootstrappe le bearer token après Google OAuth (redirect serveur ne passe pas par onResponse) |
| 2026-03-11 | `apps/web/.env.local` requis | Next.js ne lit pas le `.env.local` racine — `NEXT_PUBLIC_*` doivent être dans `apps/web/.env.local` |
| 2026-03-11 | Google OAuth local : URI port 3001 uniquement | Seul `http://localhost:3001/api/auth/callback/google` dans Google Console — pas le port 3000 |
| 2026-03-14 | `window.location.href` après OTP | `router.push('/dashboard')` causait une race condition avec `AuthGuard.getSession()` avant que le bearer token soit prêt — full reload résout le problème |
| 2026-03-14 | `createFeedEvent` jamais appelé | La fonction existait dans `feed.ts` mais n'était pas appelée depuis `progress.ts` — ajout de `createFeedEventForMemorized` et `createFeedEventForValidated` |
| 2026-03-14 | Query keys `['group', id, 'feed']` | `useGroupRealtime` invalide `['group', id, 'feed']` — dashboard utilisait `['feed', id]` (mismatch) — clés uniformisées |
| 2026-03-14 | `refetchInterval: 30_000` sur feed | Polling de secours si Supabase Realtime non configuré en production |
| 2026-03-14 | Niveaux dual-condition (AND) | `getXpLevel(xp, surahs)` — niveau le plus élevé où XP ≥ seuil ET sourates ≥ seuil. Murîd(0/0), Taleb(500/1), Qari(1500/5), Hafiz(4000/20), Sheikh(10000/57) |

---

## 🔗 LIENS UTILES

- **Docs Next.js 15 :** https://nextjs.org/docs
- **Docs Hono.js :** https://hono.dev
- **Docs Drizzle :** https://orm.drizzle.team
- **Docs shadcn/ui :** https://ui.shadcn.com
- **Quran API (seed) :** https://api.alquran.cloud/v1/surah
- **Supabase :** https://supabase.com/docs
- **Repo GitHub :** https://github.com/Iebk3398/quran-tracker

---

## 🚀 POUR DÉMARRER EN LOCAL

```bash
# 1. Cloner le repo
git clone https://github.com/Iebk3398/quran-tracker.git
cd quran-tracker

# 2. Copier les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# 3. Lancer la base de données locale
docker-compose up -d

# 4. Installer les dépendances
npm install

# 5. Générer et appliquer les migrations
npm run db:generate
npm run db:migrate

# 6. Seeder les données initiales (114 sourates + badges)
npm run db:seed

# 7. Lancer le développement
npm run dev
```

---

*🤖 Ce fichier est géré automatiquement par Claude. Ne pas éditer manuellement.*
*Dernière mise à jour : 2026-03-14 — Fix OTP login loop · badges leaderboard · feed realtime (createFeedEvent + query keys + useGroupRealtime) · CI fixes*
