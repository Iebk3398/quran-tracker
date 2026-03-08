<div align="center">

# 🕌 Quran Tracker

**Suivez la mémorisation du Coran en groupe — en temps réel**

[![CI](https://github.com/Iebk3398/quran-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/Iebk3398/quran-tracker/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[🐛 Signaler un bug](https://github.com/Iebk3398/quran-tracker/issues)

</div>

---

## ✨ Présentation

**Quran Tracker** est une application web progressive (PWA) conçue pour les familles, les halaqas et les écoles coraniques qui souhaitent suivre collectivement leur progression dans la mémorisation du Coran.

Chaque membre du groupe peut enregistrer sa progression sourate par sourate, le sheikh peut valider les mémorisations, et tout le groupe voit l'avancement en temps réel sur un tableau de bord interactif.

### 🎯 Pour qui ?

| Rôle | Usage |
|------|-------|
| **Sheikh / Enseignant** | Valider les mémorisations, suivre chaque élève, ajouter des notes |
| **Élève / Hafiz** | Enregistrer sa progression, réviser via la répétition espacée (SM-2) |
| **Parent** | Consulter la progression de son enfant en lecture seule |

---

## 🖼️ Fonctionnalités

### Dashboard Groupe
- **Tableau de bord temps réel** — Progression du groupe via Supabase Realtime (WebSockets)
- **Classement (Leaderboard)** — Classement par XP, sourates mémorisées et série de jours
- **Fil d'actualité** — Timeline des activités avec réactions emoji (MashaAllah, Dua, etc.)
- **Statistiques de groupe** — Vue d'ensemble des performances collectives

### Progression Individuelle
- **Vue des 114 sourates** — Carte visuelle avec codes couleur par statut
  - ⬜ Non commencé · 🟡 En cours · 🟢 Mémorisé · 🔵 Consolidé
- **Heatmap calendrier** — Calendrier style GitHub montrant l'intensité des révisions
- **Répétition espacée (SM-2)** — Algorithme qui planifie les révisions au moment optimal

### Validation & Gamification
- **Validation sheikh** — Les enseignants valident les sourates et ajoutent des notes de correction
- **8 Badges** — Juz Amma, Hafiz, Première Sourate, séries 7j/30j, etc.
- **XP & Niveaux** — Système de points d'expérience pour motiver les membres

### PWA & Notifications
- **Progressive Web App** — Installable sur mobile comme une app native
- **Notifications push** — Rappels de révision, validations et activité du groupe
- **Mode hors ligne** — Pages clés disponibles sans connexion via Service Worker

### Internationalisation
- **3 langues** — Français 🇫🇷, Arabe 🇸🇦 (RTL natif), Anglais 🇬🇧
- **Polices adaptées** — Inter pour les langues latines, Noto Naskh Arabic pour l'arabe

---

## 🏗️ Architecture

Ce projet est un **monorepo Turborepo** composé de 4 packages :

```
quran-tracker/
├── apps/
│   ├── web/          → Frontend Next.js 15 (App Router + Server Components)
│   └── api/          → Backend Hono.js (Node.js 22)
└── packages/
    ├── db/           → Drizzle ORM + schémas + seed 114 sourates
    ├── types/        → Types TypeScript partagés
    └── ui/           → Composants UI partagés (à compléter)
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Next.js 15, TypeScript 5 strict, Tailwind CSS v4, shadcn/ui, Framer Motion |
| **État client** | Zustand (global), TanStack Query v5 (cache serveur) |
| **Backend** | Hono.js, Node.js 22, Better Auth (magic link + Google OAuth) |
| **Base de données** | PostgreSQL via Supabase, Drizzle ORM |
| **Cache** | Redis via Upstash |
| **Temps réel** | Supabase Realtime (PostgreSQL CDC) |
| **Email** | Resend |
| **Stockage** | Cloudflare R2 |
| **Tests** | Vitest (SM-2, badges/XP) |
| **CI/CD** | GitHub Actions → Vercel (web) + Railway (api) |

---

## 🚀 Installation locale

### Prérequis

- Node.js 22+
- Docker & Docker Compose
- npm 10+

### 1. Cloner le repo

```bash
git clone https://github.com/Iebk3398/quran-tracker.git
cd quran-tracker
```

### 2. Variables d'environnement

```bash
cp .env.example .env.local
# Remplir les valeurs dans .env.local
```

Les variables requises (voir `.env.example`) :
- **Supabase** : `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Auth** : `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Email** : `RESEND_API_KEY`
- **Redis** : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### 3. Démarrer la base de données locale

```bash
docker-compose up -d
# PostgreSQL → localhost:5432
# Redis → localhost:6379
# Adminer → http://localhost:8080
```

### 4. Installer les dépendances

```bash
npm install
```

### 5. Initialiser la base de données

```bash
npm run db:generate   # Génère les migrations Drizzle
npm run db:migrate    # Applique les migrations
npm run db:seed       # Seed les 114 sourates + 8 badges
```

### 6. Lancer le développement

```bash
npm run dev
# Web  → http://localhost:3000
# API  → http://localhost:3001
# DB Studio → npm run db:studio
```

---

## 🧪 Tests

```bash
npm run test                              # Tous les tests
npm run test --workspace=packages/db      # Tests SM-2
npm run test --workspace=apps/api         # Tests badges/XP
npm run test -- --coverage                # Avec coverage
```

---

## 📦 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance tous les services en développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification TypeScript strict |
| `npm run lint` | ESLint sur tous les packages |
| `npm run test` | Tests Vitest |
| `npm run db:generate` | Génère les migrations Drizzle |
| `npm run db:migrate` | Applique les migrations |
| `npm run db:seed` | Seed les données initiales |
| `npm run db:studio` | Ouvre Drizzle Studio |
| `npm run db:reset` | Remet la BDD à zéro |

---

## 🌍 Déploiement

### URLs de production

| Service | URL |
|---------|-----|
| **Frontend** | https://quran-tracker-web.vercel.app |
| **API** | https://api-production-e758.up.railway.app |
| **Health check** | https://api-production-e758.up.railway.app/health |

### Backend → Railway

L'API est déployée via **Dockerfile** sur Railway (Node.js 22 Alpine, sans build step grâce à `--experimental-strip-types`).

```bash
# Premier déploiement
railway login
railway link   # Lier au projet Railway existant
railway up     # Deploy depuis la racine du monorepo

# Vérifier les logs
railway logs

# Variables d'environnement requises sur Railway :
# DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
# NEXT_PUBLIC_APP_URL, RESEND_API_KEY,
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

Le `railway.json` à la racine pointe sur `apps/api/Dockerfile` :
```json
{ "build": { "builder": "DOCKERFILE", "dockerfilePath": "apps/api/Dockerfile" } }
```

### Frontend → Vercel

Le frontend est déployé sur **Vercel** depuis la racine du monorepo (Turborepo détecté automatiquement).

```bash
# Premier déploiement
vercel login
vercel --prod   # Depuis la racine du monorepo (pas apps/web/)

# Variables d'environnement requises sur Vercel :
# NEXT_PUBLIC_API_URL (= URL Railway)
# NEXT_PUBLIC_APP_URL (= URL Vercel)
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

> **Important :** Toujours déployer depuis la **racine du monorepo**, pas depuis `apps/web/`.
> Vercel détecte Turborepo et installe les dépendances correctement pour tous les workspaces.

### Notes CORS

Le CORS est configuré pour accepter :
- L'URL de production Vercel (`NEXT_PUBLIC_APP_URL`)
- Toutes les URLs de preview Vercel (`*.vercel.app`)
- `localhost:3000` en développement

---

## 🗃️ Schéma de base de données

| Table | Description |
|-------|-------------|
| `users` | Comptes avec rôles (super_admin, sheikh, student, parent) |
| `groups` + `group_members` | Groupes de mémorisation et membres |
| `surahs` | Les 114 sourates (données complètes : AR/FR/EN, versets, juz, hizb) |
| `memorization_progress` | Progression par sourate avec SM-2 (retentionScore, nextReviewAt, easeFactor) |
| `revision_sessions` | Historique des sessions avec qualité (0-5) |
| `badges` + `user_badges` | Système de badges et attributions |
| `group_feed` | Fil d'actualité avec réactions |
| `notifications` | Notifications utilisateurs |

---

## 🤖 IA (v2 — prochaine version)

L'architecture IA est prête dans `apps/api/src/routes/ai.ts` mais retourne des données stub en v1.
Les fonctionnalités suivantes seront développées en **v2** :

- **Suggestions GPT-4o** — Analyse vos patterns SM-2 et recommande les révisions prioritaires
- **Assistant conversationnel** — Chat Hifz (motivation, planning, Q&A en arabe/français)
- **Plan quotidien IA** — Plan de révision personnalisé généré chaque matin
- **Validation vocale** — Whisper API pour valider les récitations à l'oral

---

## 🤝 Contribuer

1. Fork le repo
2. Créer une branche : `git checkout -b feat/ma-feature`
3. Commiter : `git commit -m 'feat: ajouter ma feature'`
4. Push : `git push origin feat/ma-feature`
5. Ouvrir une Pull Request

Voir les [issues ouvertes](https://github.com/Iebk3398/quran-tracker/issues) pour les contributions bienvenues.

---

## 📄 Licence

MIT © [Ilyas](https://github.com/Iebk3398)

---

<div align="center">

Fait avec ❤️ pour la communauté des mémorisateurs du Coran

</div>
