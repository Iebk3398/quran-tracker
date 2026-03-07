<div align="center">

# 🕌 Quran Tracker

**Suivez la mémorisation du Coran en groupe — en temps réel**

[![CI](https://github.com/Iebk3398/quran-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/Iebk3398/quran-tracker/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[🚀 Démo](#) · [📖 Documentation](#documentation) · [🐛 Signaler un bug](https://github.com/Iebk3398/quran-tracker/issues)

</div>

---

## ✨ Présentation

**Quran Tracker** est une application web progressive (PWA) conçue pour les familles, les halaqas et les écoles coraniques qui souhaitent suivre collectivement leur progression dans la mémorisation du Coran.

Chaque membre du groupe peut enregistrer sa progression sourate par sourate, le sheikh peut valider les mémorisations, et tout le groupe voit l'avancement en temps réel sur un tableau de bord interactif.

### 🎯 Pour qui ?

| Rôle | Usage |
|------|-------|
| **Sheikh / Enseignant** | Valider les mémorisations, suivre chaque élève, attribuer des notes |
| **Élève / Hafiz** | Enregistrer sa progression, réviser via la répétition espacée (SM-2) |
| **Parent** | Consulter la progression de son enfant en lecture seule |

---

## 🖼️ Fonctionnalités

### Dashboard Groupe
- **Tableau de bord temps réel** — Progression du groupe mise à jour instantanément via Supabase Realtime
- **Classement (Leaderboard)** — Classement des membres par XP, sourates mémorisées et série de jours
- **Fil d'actualité** — Timeline des activités du groupe (mémorisations, validations, badges) avec réactions emoji
- **Statistiques de groupe** — Vue d'ensemble des performances collectives

### Progression Individuelle
- **Vue des 114 sourates** — Carte visuelle de toutes les sourates avec codes couleur par statut
  - ⬜ Non commencé · 🟡 En cours · 🟢 Mémorisé · 🔵 Consolidé
- **Heatmap calendrier** — Calendrier style GitHub montrant l'intensité des révisions
- **Répétition espacée (SM-2)** — Algorithme scientifique qui planifie les révisions au moment optimal

### Validation & Gamification
- **Validation sheikh** — Les enseignants peuvent valider les sourates et ajouter des notes
- **Badges** — 8 badges à débloquer (Juz Amma, Hafiz, streaks, etc.)
- **XP & Niveaux** — Système de points d'expérience pour motiver les membres

### PWA & Notifications
- **Progressive Web App** — Installable sur mobile comme une app native
- **Notifications push** — Rappels de révision, validations et activité du groupe
- **Mode hors ligne** — Les pages clés sont disponibles sans connexion

### Internationalisation
- **3 langues** — Français 🇫🇷, Arabe 🇸🇦 (RTL natif), Anglais 🇬🇧
- **Polices adaptées** — Inter pour les langues latines, Noto Naskh Arabic pour l'arabe

---

## 🏗️ Architecture

Ce projet est un **monorepo Turborepo** composé de 4 packages :

```
quran-tracker/
├── apps/
│   ├── web/          → Frontend Next.js 15 (App Router)
│   └── api/          → Backend Hono.js (Node.js 22)
└── packages/
    ├── db/           → Drizzle ORM + schémas + seed
    ├── types/        → Types TypeScript partagés
    └── ui/           → Composants UI partagés (en cours)
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Next.js 15, TypeScript 5, Tailwind CSS v4, shadcn/ui, Framer Motion |
| **État client** | Zustand (global), TanStack Query v5 (serveur) |
| **Backend** | Hono.js, Node.js 22, Better Auth |
| **Base de données** | PostgreSQL (Supabase), Drizzle ORM |
| **Cache** | Redis (Upstash) |
| **Temps réel** | Supabase Realtime (PostgreSQL CDC) |
| **Email** | Resend |
| **Stockage** | Cloudflare R2 |
| **Tests** | Vitest |
| **CI/CD** | GitHub Actions → Vercel + Railway |

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
```

Remplir les valeurs dans `.env.local` :

```env
# Supabase (créer un projet sur supabase.com)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"

# Auth
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
GOOGLE_CLIENT_ID="[GOOGLE_OAUTH_CLIENT_ID]"
GOOGLE_CLIENT_SECRET="[GOOGLE_OAUTH_CLIENT_SECRET]"

# Email (resend.com)
RESEND_API_KEY="re_[API_KEY]"

# Redis (upstash.com)
UPSTASH_REDIS_REST_URL="https://[ENDPOINT].upstash.io"
UPSTASH_REDIS_REST_TOKEN="[TOKEN]"
```

### 3. Démarrer la base de données locale

```bash
docker-compose up -d
# PostgreSQL disponible sur localhost:5432
# Redis disponible sur localhost:6379
# Adminer sur http://localhost:8080
```

### 4. Installer les dépendances

```bash
npm install
```

### 5. Initialiser la base de données

```bash
# Générer les migrations Drizzle
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Seeder les 114 sourates + 8 badges
npm run db:seed
```

### 6. Lancer le développement

```bash
npm run dev
# Web → http://localhost:3000
# API → http://localhost:3001
# DB Studio → http://localhost:4983 (npm run db:studio)
```

---

## 🧪 Tests

```bash
# Lancer tous les tests
npm run test

# Tests d'un package spécifique
npm run test --workspace=packages/db
npm run test --workspace=apps/api

# Avec coverage
npm run test -- --coverage
```

Les tests couvrent :
- Algorithme SM-2 (spaced repetition)
- Logique des badges et calcul XP
- Routes API (à venir)

---

## 📦 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance tous les services en développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint sur tous les packages |
| `npm run test` | Tests Vitest |
| `npm run db:generate` | Génère les migrations Drizzle |
| `npm run db:migrate` | Applique les migrations |
| `npm run db:seed` | Seed les données initiales |
| `npm run db:studio` | Ouvre Drizzle Studio |
| `npm run db:reset` | Remet la BDD à zéro |

---

## 🌍 Déploiement

### Frontend → Vercel

```bash
# Via CLI
vercel --prod

# Ou automatiquement via GitHub Actions au push sur main
```

Variables à configurer sur Vercel :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_URL`

### Backend → Railway

```bash
# Via CLI
railway up

# Ou automatiquement via GitHub Actions
```

Variables à configurer sur Railway :
- Toutes les variables de `.env.example`

---

## 🗃️ Schéma de base de données

```sql
users              → Comptes utilisateurs (avec rôles)
groups             → Groupes de mémorisation
group_members      → Appartenance aux groupes
surahs             → Les 114 sourates du Coran
memorization_progress → Progression par sourate (avec SM-2)
revision_sessions  → Historique des révisions
badges             → Badges disponibles
user_badges        → Badges obtenus
group_feed         → Fil d'actualité du groupe
notifications      → Notifications utilisateurs
```

---

## 🤖 IA (v2 — prochaine version)

L'architecture IA est prête dans `apps/api/src/routes/ai.ts`. Les fonctionnalités suivantes seront développées en v2 :

- **Suggestions intelligentes** — GPT-4o analyse vos patterns de révision et recommande les sourates prioritaires
- **Assistant conversationnel** — Chat avec un assistant spécialisé Hifz (motivation, planning, Q&A)
- **Plan quotidien** — Plan de révision personnalisé généré chaque matin
- **Validation vocale** — Whisper API pour valider les récitations à l'oral

---

## 🤝 Contribuer

1. Fork le repo
2. Créer une branche (`git checkout -b feat/ma-feature`)
3. Commiter (`git commit -m 'feat: ajouter ma feature'`)
4. Push (`git push origin feat/ma-feature`)
5. Ouvrir une Pull Request

Voir les [issues ouvertes](https://github.com/Iebk3398/quran-tracker/issues) pour les contributions bienvenues.

---

## 📄 Licence

MIT © [Ilyas](https://github.com/Iebk3398)

---

<div align="center">

Fait avec ❤️ pour la communauté des mémorisateurs du Coran

</div>
