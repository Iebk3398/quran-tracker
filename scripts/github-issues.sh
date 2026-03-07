#!/bin/bash
# ============================================================
# 🕌 Quran Tracker — Script de création des GitHub Issues
# ============================================================
# Usage:
#   chmod +x scripts/github-issues.sh
#   GITHUB_TOKEN=ghp_xxx GITHUB_REPO=username/quran-tracker ./scripts/github-issues.sh
#
# Prérequis: gh CLI installé (https://cli.github.com)
# ============================================================

set -e

REPO="${GITHUB_REPO:-username/quran-tracker}"
echo "🕌 Création des GitHub Issues pour : $REPO"
echo "=================================================="

# ─── Fonction helper ──────────────────────────────────────
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  local milestone="$4"

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --milestone "$milestone" 2>/dev/null || \
    echo "⚠️  Issue déjà existante ou erreur : $title"
}

# ─── Créer les labels ─────────────────────────────────────
echo "📌 Création des labels..."
gh label create "phase:setup"    --color "0075ca" --description "Setup & Configuration"       --repo "$REPO" 2>/dev/null || true
gh label create "phase:database" --color "e4e669" --description "Base de données & Schema"    --repo "$REPO" 2>/dev/null || true
gh label create "phase:backend"  --color "d93f0b" --description "API & Backend"               --repo "$REPO" 2>/dev/null || true
gh label create "phase:frontend" --color "0e8a16" --description "Interface utilisateur"       --repo "$REPO" 2>/dev/null || true
gh label create "phase:realtime" --color "1d76db" --description "WebSockets & Realtime"       --repo "$REPO" 2>/dev/null || true
gh label create "phase:pwa"      --color "5319e7" --description "PWA & Notifications"         --repo "$REPO" 2>/dev/null || true
gh label create "phase:ai"       --color "f9d0c4" --description "IA & Spaced Repetition"      --repo "$REPO" 2>/dev/null || true
gh label create "phase:devops"   --color "bfd4f2" --description "Tests, CI/CD, Déploiement"   --repo "$REPO" 2>/dev/null || true
gh label create "priority:high"  --color "b60205" --description "Priorité haute"              --repo "$REPO" 2>/dev/null || true
gh label create "priority:med"   --color "fbca04" --description "Priorité moyenne"            --repo "$REPO" 2>/dev/null || true
gh label create "status:todo"    --color "ededed" --description "À faire"                     --repo "$REPO" 2>/dev/null || true
gh label create "status:doing"   --color "0075ca" --description "En cours"                    --repo "$REPO" 2>/dev/null || true
gh label create "status:done"    --color "0e8a16" --description "Terminé"                     --repo "$REPO" 2>/dev/null || true
echo "✅ Labels créés"

# ─── Créer les Milestones ─────────────────────────────────
echo "🎯 Création des milestones..."
gh api repos/$REPO/milestones --method POST -f title="Phase 0 — Setup"       -f description="Monorepo Turborepo + Docker + Config"       2>/dev/null || true
gh api repos/$REPO/milestones --method POST -f title="Phase 1 — Database"    -f description="Drizzle Schema + Migrations + Seed Coran"   2>/dev/null || true
gh api repos/$REPO/milestones --method POST -f title="Phase 2 — Backend"     -f description="Hono.js API + tRPC + Auth"                  2>/dev/null || true
gh api repos/$REPO/milestones --method POST -f title="Phase 3 — Frontend"    -f description="Next.js 15 + shadcn/ui + Pages principales" 2>/dev/null || true
gh api repos/$REPO/milestones --method POST -f title="Phase 4 — Realtime"    -f description="WebSockets + Dashboard live"                2>/dev/null || true
gh api repos/$REPO/milestones --method POST -f title="Phase 5 — PWA"         -f description="Service Worker + Push Notifications"        2>/dev/null || true
gh api repos/$REPO/milestones --method POST -f title="Phase 6 — IA"          -f description="Spaced Repetition + OpenAI"                 2>/dev/null || true
gh api repos/$REPO/milestones --method POST -f title="Phase 7 — DevOps"      -f description="Tests + CI/CD + Déploiement Production"     2>/dev/null || true
echo "✅ Milestones créés"

echo ""
echo "📋 Création des Issues..."
echo ""

# ═══════════════════════════════════════════════════════════
# PHASE 0 — SETUP & CONFIGURATION
# ═══════════════════════════════════════════════════════════
echo "━━━ PHASE 0 — Setup ━━━"

create_issue \
  "[P0] Initialiser le monorepo Turborepo" \
  "## Objectif
Mettre en place la structure monorepo avec Turborepo et Bun.

## Tâches
- [ ] \`bun init\` à la racine
- [ ] Configurer \`turbo.json\` avec les pipelines (build, dev, lint, test)
- [ ] Créer les workspaces : \`apps/web\`, \`apps/api\`, \`packages/db\`, \`packages/ui\`, \`packages/types\`
- [ ] Configurer \`tsconfig.json\` partagé en mode strict
- [ ] Configurer ESLint + Prettier partagés
- [ ] Ajouter \`.gitignore\` complet

## Résultat attendu
\`bun dev\` lance tous les services en parallèle depuis la racine.

## Référence
Voir \`CLAUDE.md\` section Structure du projet." \
  "phase:setup,priority:high,status:todo" \
  "Phase 0 — Setup"

create_issue \
  "[P0] Configurer Docker Compose pour le développement local" \
  "## Objectif
Environnement de développement reproductible via Docker.

## Services à configurer
- [ ] PostgreSQL 16
- [ ] Redis (Upstash-compatible)
- [ ] Adminer (UI base de données)

## Fichiers à créer
- \`docker-compose.yml\`
- \`docker-compose.override.yml\` (config locale)
- \`.env.example\` avec toutes les variables requises

## Variables d'environnement requises
\`\`\`
DATABASE_URL=
REDIS_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
BETTER_AUTH_SECRET=
\`\`\`" \
  "phase:setup,priority:high,status:todo" \
  "Phase 0 — Setup"

create_issue \
  "[P0] Initialiser Next.js 15 (apps/web)" \
  "## Objectif
Bootstrapper l'application Next.js 15 avec toutes les configs.

## Tâches
- [ ] \`bunx create-next-app@latest apps/web\` avec TypeScript, Tailwind, App Router
- [ ] Installer et configurer shadcn/ui
- [ ] Configurer Tailwind CSS v4
- [ ] Installer Framer Motion, Zustand, TanStack Query v5
- [ ] Configurer next-intl (FR/AR/EN + RTL)
- [ ] Configurer next-pwa
- [ ] Créer le layout principal (sidebar + header)
- [ ] Configurer les métadonnées et favicon islamique

## Structure des dossiers à créer
\`app/(auth)/\`, \`app/(dashboard)/\`, \`app/(sheikh)/\`" \
  "phase:setup,phase:frontend,priority:high,status:todo" \
  "Phase 0 — Setup"

create_issue \
  "[P0] Initialiser Hono.js API (apps/api)" \
  "## Objectif
Bootstrapper le backend Hono.js avec Bun.

## Tâches
- [ ] Setup Hono.js avec Bun runtime
- [ ] Configurer tRPC + Zod
- [ ] Configurer CORS (origines autorisées)
- [ ] Middleware de logging (Hono logger)
- [ ] Middleware rate limiting (Upstash)
- [ ] Health check endpoint \`GET /health\`
- [ ] Structure des routes : auth, groups, progress, revisions, feed

## Test
\`curl http://localhost:3001/health\` → \`{ status: 'ok' }\`" \
  "phase:setup,phase:backend,priority:high,status:todo" \
  "Phase 0 — Setup"

create_issue \
  "[P0] Configurer GitHub Actions CI/CD" \
  "## Objectif
Pipeline d'intégration et déploiement continu.

## Workflows à créer
- [ ] \`.github/workflows/ci.yml\` → lint, typecheck, tests à chaque PR
- [ ] \`.github/workflows/deploy-preview.yml\` → preview Vercel sur PR
- [ ] \`.github/workflows/deploy-prod.yml\` → déploiement main → production
- [ ] Protection de branche \`main\` (PR obligatoire + CI vert)

## Secrets GitHub requis
\`VERCEL_TOKEN\`, \`RAILWAY_TOKEN\`, \`DATABASE_URL\`" \
  "phase:setup,phase:devops,priority:med,status:todo" \
  "Phase 0 — Setup"

# ═══════════════════════════════════════════════════════════
# PHASE 1 — DATABASE
# ═══════════════════════════════════════════════════════════
echo "━━━ PHASE 1 — Database ━━━"

create_issue \
  "[P1] Créer le schéma Drizzle ORM complet" \
  "## Objectif
Définir toutes les tables selon le schéma dans CLAUDE.md.

## Tables à créer dans \`packages/db/schema/\`
- [ ] \`users.ts\` — Utilisateurs + rôles
- [ ] \`groups.ts\` — Groupes + membres
- [ ] \`surahs.ts\` — Les 114 sourates (référentiel)
- [ ] \`progress.ts\` — Progression mémorisation par user/sourate
- [ ] \`revisions.ts\` — Sessions de révision avec qualité
- [ ] \`badges.ts\` — Badges + user_badges
- [ ] \`feed.ts\` — Feed groupe + notifications

## Contraintes
- Toutes les relations avec \`references()\` Drizzle
- Index sur les colonnes fréquemment filtrées (userId, groupId, surahId)
- Timestamps \`createdAt\` et \`updatedAt\` sur toutes les tables" \
  "phase:database,priority:high,status:todo" \
  "Phase 1 — Database"

create_issue \
  "[P1] Seed des 114 sourates avec données réelles" \
  "## Objectif
Pré-remplir la table \`surahs\` avec les données complètes du Coran.

## Données par sourate
\`\`\`typescript
{
  number: 1,           // Numéro (1-114)
  nameAr: 'الفاتحة',  // Nom en arabe
  nameFr: 'L'Ouverture',
  nameEn: 'The Opening',
  versesCount: 7,
  juzNumber: 1,
  hizbNumber: 1,
  revelationType: 'meccan' | 'medinan',
  startPage: 1,        // Page Mushaf Madani
  endPage: 1,
}
\`\`\`

## Source des données
Utiliser l'API : https://api.alquran.cloud/v1/surah (données libres de droit)

## Tâches
- [ ] Script fetch API → générer le fichier seed TypeScript
- [ ] \`packages/db/seed/surahs.ts\`
- [ ] Vérifier que les 114 sourates sont correctes
- [ ] \`bun run db:seed\` fonctionnel" \
  "phase:database,priority:high,status:todo" \
  "Phase 1 — Database"

create_issue \
  "[P1] Migrations Drizzle + connexion Supabase" \
  "## Objectif
Mettre en place le pipeline de migrations.

## Tâches
- [ ] Configurer \`drizzle.config.ts\` avec connexion Supabase
- [ ] Générer la première migration : \`bun run db:generate\`
- [ ] Appliquer en dev : \`bun run db:migrate\`
- [ ] Script \`db:studio\` → Drizzle Studio pour visualiser les données
- [ ] Vérifier Row Level Security (RLS) Supabase pour chaque table

## Scripts package.json
\`\`\`json
{
  \"db:generate\": \"drizzle-kit generate\",
  \"db:migrate\": \"drizzle-kit migrate\",
  \"db:studio\": \"drizzle-kit studio\",
  \"db:seed\": \"bun run packages/db/seed/index.ts\"
}
\`\`\`" \
  "phase:database,priority:high,status:todo" \
  "Phase 1 — Database"

# ═══════════════════════════════════════════════════════════
# PHASE 2 — BACKEND API
# ═══════════════════════════════════════════════════════════
echo "━━━ PHASE 2 — Backend ━━━"

create_issue \
  "[P2] Implémenter l'authentification (Better Auth)" \
  "## Objectif
Système d'auth complet avec magic link et OAuth.

## Tâches
- [ ] Configurer Better Auth avec Drizzle adapter
- [ ] Magic link (email via Resend)
- [ ] OAuth Google (optionnel)
- [ ] Middleware JWT de vérification sur toutes les routes protégées
- [ ] Routes : POST /auth/signin, POST /auth/signout, GET /auth/session
- [ ] Gestion des rôles dans le JWT payload

## Sécurité
- Rate limiting sur les endpoints auth
- Tokens avec expiration courte (15min) + refresh tokens" \
  "phase:backend,priority:high,status:todo" \
  "Phase 2 — Backend"

create_issue \
  "[P2] API Routes — Groupes & Membres" \
  "## Objectif
CRUD complet pour la gestion des groupes.

## Endpoints
- [ ] \`POST /groups\` — Créer un groupe (Sheikh)
- [ ] \`GET /groups/:id\` — Détails groupe
- [ ] \`POST /groups/:id/join\` — Rejoindre avec code d'invitation
- [ ] \`GET /groups/:id/members\` — Liste des membres
- [ ] \`DELETE /groups/:id/members/:userId\` — Retirer un membre
- [ ] \`GET /groups/:id/leaderboard\` — Classement temps réel
- [ ] Génération de \`inviteCode\` unique (nanoid)" \
  "phase:backend,priority:high,status:todo" \
  "Phase 2 — Backend"

create_issue \
  "[P2] API Routes — Progression Mémorisation" \
  "## Objectif
Endpoints pour saisir et consulter la progression.

## Endpoints
- [ ] \`GET /progress/:userId\` — Progression complète (114 sourates)
- [ ] \`POST /progress\` — Enregistrer avancement sur une sourate
- [ ] \`PATCH /progress/:id\` — Mettre à jour statut
- [ ] \`POST /progress/:id/validate\` — Validation Sheikh (✅ mémorisé)
- [ ] \`GET /progress/group/:groupId\` — Vue agrégée du groupe
- [ ] Calcul automatique du score de rétention SM-2 à chaque mise à jour" \
  "phase:backend,priority:high,status:todo" \
  "Phase 2 — Backend"

create_issue \
  "[P2] API Routes — Feed & Notifications" \
  "## Objectif
Système de feed social du groupe et notifications.

## Endpoints
- [ ] \`GET /groups/:id/feed\` — Timeline du groupe (paginée)
- [ ] \`POST /feed/:id/react\` — Réaction (Masha'Allah, Du'a)
- [ ] \`POST /notifications\` — Créer une notification (Sheikh)
- [ ] \`PATCH /notifications/:id/read\` — Marquer comme lue
- [ ] \`GET /notifications/unread-count\` — Badge compteur

## Événements auto dans le feed
- Sourate validée, Badge obtenu, Milestone atteint, Streak record" \
  "phase:backend,priority:med,status:todo" \
  "Phase 2 — Backend"

# ═══════════════════════════════════════════════════════════
# PHASE 3 — FRONTEND
# ═══════════════════════════════════════════════════════════
echo "━━━ PHASE 3 — Frontend ━━━"

create_issue \
  "[P3] Page Dashboard Groupe — Vue d'ensemble" \
  "## Objectif
Dashboard principal visible par tous les membres du groupe.

## Composants à créer
- [ ] \`GroupStats\` — Statistiques globales (% khatm, membres actifs)
- [ ] \`Leaderboard\` — Top membres avec avatar et progression
- [ ] \`GroupFeed\` — Timeline des activités récentes
- [ ] \`ActiveStreaks\` — Membres avec streak actif (🔥)
- [ ] Header avec code d'invitation affiché pour le Sheikh

## Design
- Grid responsive 3 colonnes (desktop) → 1 colonne (mobile)
- Couleurs selon le design system défini dans CLAUDE.md" \
  "phase:frontend,priority:high,status:todo" \
  "Phase 3 — Frontend"

create_issue \
  "[P3] Composant SurahTree — Arbre des 114 Sourates" \
  "## Objectif
Visualisation interactive de toutes les sourates avec leur statut.

## Fonctionnalités
- [ ] Grille de 114 cartes sourates (numéro, nom AR, nom FR)
- [ ] Couleur selon statut : ⬜ non commencé / 🟡 en cours / 🟢 mémorisé / 🔵 consolidé
- [ ] Filtres : par Juz, par statut, par révélation (mecquoise/médinoise)
- [ ] Click sur sourate → modal de mise à jour rapide
- [ ] Barre de progression globale (% des versets mémorisés)
- [ ] Vue Juz (groupée par Juz 1→30)

## Performance
- Virtualisé si nécessaire (114 items = acceptable sans virtual scroll)" \
  "phase:frontend,priority:high,status:todo" \
  "Phase 3 — Frontend"

create_issue \
  "[P3] Composant HeatmapCalendar — Calendrier de révision" \
  "## Objectif
Visualisation style GitHub Contributions des sessions de révision.

## Fonctionnalités
- [ ] Grille 52 semaines × 7 jours
- [ ] Intensité de couleur selon nombre de versets révisés ce jour
- [ ] Tooltip au hover : date + sourates révisées + durée
- [ ] Calcul et affichage du streak actuel et record
- [ ] Navigation mois précédent/suivant" \
  "phase:frontend,priority:med,status:todo" \
  "Phase 3 — Frontend"

create_issue \
  "[P3] Page Profil Individuel" \
  "## Objectif
Page de profil avec toutes les statistiques personnelles.

## Sections
- [ ] Avatar + Nom + Niveau Hafiz
- [ ] Statistiques : sourates mémorisées, versets total, streak, XP
- [ ] SurahTree personnel (filtré par userId)
- [ ] HeatmapCalendar personnel
- [ ] Badges et achievements obtenus
- [ ] Historique des validations du Sheikh
- [ ] Prochaines sourates à réviser (SM-2)" \
  "phase:frontend,priority:high,status:todo" \
  "Phase 3 — Frontend"

create_issue \
  "[P3] Interface Sheikh — Validation & Gestion" \
  "## Objectif
Interface dédiée pour le Sheikh pour valider et gérer le groupe.

## Pages
- [ ] Liste des élèves avec progression rapide
- [ ] Page validation : voir les sourates en attente de validation
- [ ] Formulaire validation : note, commentaire, date
- [ ] Génération et téléchargement du certificat PDF (arabesque)
- [ ] Envoi d'annonce au feed du groupe" \
  "phase:frontend,priority:high,status:todo" \
  "Phase 3 — Frontend"

# ═══════════════════════════════════════════════════════════
# PHASE 4 — REALTIME
# ═══════════════════════════════════════════════════════════
echo "━━━ PHASE 4 — Realtime ━━━"

create_issue \
  "[P4] WebSockets — Dashboard Groupe Temps Réel" \
  "## Objectif
Mettre à jour le dashboard automatiquement sans refresh.

## Événements temps réel
- [ ] Nouvel item dans le feed groupe
- [ ] Mise à jour du leaderboard
- [ ] Nouvelle validation Sheikh
- [ ] Nouveau membre rejoint
- [ ] Badge obtenu par un membre

## Implémentation
- Supabase Realtime (PostgreSQL CDC)
- Hook React \`useGroupRealtime(groupId)\`
- Optimistic updates sur les mutations TanStack Query" \
  "phase:realtime,priority:med,status:todo" \
  "Phase 4 — Realtime"

# ═══════════════════════════════════════════════════════════
# PHASE 5 — PWA
# ═══════════════════════════════════════════════════════════
echo "━━━ PHASE 5 — PWA ━━━"

create_issue \
  "[P5] PWA + Push Notifications de révision" \
  "## Objectif
App installable sur mobile avec rappels de révision intelligents.

## Tâches
- [ ] Configurer next-pwa + Service Worker
- [ ] \`manifest.json\` avec icônes islamiques (512x512, 192x192)
- [ ] Push notifications via Web Push API
- [ ] Cron job quotidien (Upstash QStash) → envoyer rappels SM-2
- [ ] Page paramètres : activer/désactiver notifications, heure préférée
- [ ] Fonctionnement offline (cache des données Coran)" \
  "phase:pwa,priority:med,status:todo" \
  "Phase 5 — PWA"

# ═══════════════════════════════════════════════════════════
# PHASE 6 — IA
# ═══════════════════════════════════════════════════════════
echo "━━━ PHASE 6 — IA ━━━"

create_issue \
  "[P6] Algorithme Spaced Repetition (SM-2)" \
  "## Objectif
Système de rappel intelligent pour consolider la mémorisation.

## Algorithme SM-2
\`\`\`
interval_suivant = interval_précédent × ease_factor
ease_factor ajusté selon qualité de révision (0-5)
\`\`\`

## Tâches
- [ ] Implémenter SM-2 dans \`packages/db/lib/spaced-repetition.ts\`
- [ ] Calculer et stocker \`nextReviewAt\` sur chaque progress record
- [ ] Widget 'À réviser aujourd'hui' sur le dashboard
- [ ] Trier automatiquement les sourates par urgence de révision" \
  "phase:ai,priority:med,status:todo" \
  "Phase 6 — IA"

create_issue \
  "[P6] Intégration OpenAI — Suggestions personnalisées" \
  "## Objectif
IA qui analyse les patterns et suggère un plan de mémorisation.

## Fonctionnalités
- [ ] Analyse des sessions passées (fréquence, durée, qualité)
- [ ] Génération d'un plan personnalisé (GPT-4o)
- [ ] Suggestions de techniques (tajweed, répétition, écoute)
- [ ] Résumé hebdomadaire par email (Resend)
- [ ] Cache des réponses IA (Redis, 24h) pour économiser les tokens" \
  "phase:ai,priority:med,status:todo" \
  "Phase 6 — IA"

# ═══════════════════════════════════════════════════════════
# PHASE 7 — DEVOPS & TESTS
# ═══════════════════════════════════════════════════════════
echo "━━━ PHASE 7 — DevOps & Tests ━━━"

create_issue \
  "[P7] Tests unitaires et d'intégration (Vitest)" \
  "## Objectif
Couverture de tests sur les fonctions critiques.

## À tester
- [ ] Algorithme SM-2 (calcul intervals)
- [ ] Calcul % progression (versets mémorisés)
- [ ] Logique de badges (conditions d'attribution)
- [ ] Endpoints API (Hono test utils)
- [ ] Composants UI critiques (SurahTree, ProgressBar)

## Target : 80% de couverture sur packages/db et apps/api" \
  "phase:devops,priority:med,status:todo" \
  "Phase 7 — DevOps"

create_issue \
  "[P7] Déploiement Production — Vercel + Railway" \
  "## Objectif
Mettre l'application en production avec monitoring.

## Checklist déploiement
- [ ] Variables d'environnement configurées (Vercel + Railway)
- [ ] Base de données Supabase production créée
- [ ] Redis Upstash production configuré
- [ ] Domaine personnalisé configuré
- [ ] Certificat SSL automatique
- [ ] Sentry configuré (frontend + backend)
- [ ] PostHog analytics configuré
- [ ] Alertes uptime configurées
- [ ] Test de charge basique (k6)" \
  "phase:devops,priority:high,status:todo" \
  "Phase 7 — DevOps"

echo ""
echo "=================================================="
echo "✅ Toutes les issues ont été créées !"
echo "🔗 Voir : https://github.com/$REPO/issues"
echo ""
echo "📊 Récapitulatif :"
echo "   Phase 0 (Setup)    → 5 issues"
echo "   Phase 1 (Database) → 3 issues"
echo "   Phase 2 (Backend)  → 4 issues"
echo "   Phase 3 (Frontend) → 5 issues"
echo "   Phase 4 (Realtime) → 1 issue"
echo "   Phase 5 (PWA)      → 1 issue"
echo "   Phase 6 (IA)       → 2 issues"
echo "   Phase 7 (DevOps)   → 2 issues"
echo "   ─────────────────────────────"
echo "   TOTAL              → 23 issues"
echo "=================================================="
