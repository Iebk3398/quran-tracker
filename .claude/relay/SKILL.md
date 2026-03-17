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

## ⚠️ Points critiques

### Railway → GitHub auto-deploy
Railway n'était **pas connecté à GitHub** — les déploiements se faisaient
manuellement via `railway up` CLI. **À vérifier** : Railway dashboard → service `api`
→ Settings → Source → connecter repo `Iebk3398/quran-tracker` branch `main`.

### Variables d'env Railway requises
Le fix Google OAuth mobile utilise Redis :
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

## Ce qui a été corrigé (sessions précédentes)

### Bug déconnexion — sidebar.tsx ✅
- Ajout de `handleLogout()` qui vide localStorage + cookie + signOut() + redirect /login.

### Bug auth mobile OTP — login/page.tsx ✅
- `signIn.emailOtp` → lecture `data.session.token` au lieu de `data.token` (undefined).

### Bug hizb tracker — hizb-tracker.tsx ✅
- `setCount(1)` après save + `variables * 5` pour le toast XP (closure stale).

### Bug session expiry — auth-guard.tsx ✅
- 3 tentatives (0/400/1500ms). Pas de clearAllSessionData() sur erreur réseau.

### Bug Docker build — Dockerfile ✅
- `npm install --ignore-scripts` + stub minimal `apps/web/package.json`.

### Tests d'intégration — setup partiel ✅
- Vitest + helper chain() + users/groups/progress/surahs tests.

### Google OAuth state_mismatch mobile Safari ✅
- Redis state backup + route callback custom + `/auth/relay` loopback bearer.

### OTP warm-up retries ✅
- Retries jusqu'à 3 fois (0/800/2000ms). Redirect /dashboard même si warm-up échoue.

### CORS expose set-auth-token ✅
- Handler `app.on('/api/auth/*')` injecte manuellement les headers CORS + `Access-Control-Expose-Headers`.

### verifySessionDirect() — bypass cache Better Auth ✅
- Nouvelle fonction fetch direct vers Railway avec Bearer token.
- Utilisée dans AuthGuard et login/page.tsx à la place de `authClient.getSession()`.

---

## Ce qui a été corrigé cette session (2026-03-17)

### 1. Refonte UI lecture Coran — suppression activité membre + lecture quotidienne ✅
- **Dashboard :** suppression des `MemberActivityCards` de l'onglet Lecture.
- **Profil :** masquage de "Lecture quotidienne" si l'utilisateur est déjà dans un groupe.
- **Fichiers :** `dashboard-client.tsx`, `profile-client.tsx`

### 2. Police Uthmanic Hafs + tajweed inline + marque-page par verset ✅
- Police `KFGQPC HAFS Uthmanic Script` + `UthmanicHafs` depuis qurancdn CDN + fallback Scheherazade New.
- Texte continu sans séparation par verset (flow naturel).
- Marque-page au niveau verset : tap → `VerseBookmark` en localStorage.
- Numéros de verset en cercles dorés (style mushaf).
- **Fichiers :** `quran-client.tsx`, `globals.css`

### 3. Fix tajweed colors — vrai format API quran.com ✅
- **Problème :** On cherchait `rule='qalqalah'` dans des `<span>` — l'API retourne `<tajweed class=qalaqah>` (tag custom, pas de guillemets).
- **Noms corrects vérifiés sur l'API :** `ikhafa` (pas `ikhfa`), `qalaqah` (pas `qalqalah`), `laam_shamsiyah` (pas `laam_shamsiyya`).
- **Fix :** regex `/<tajweed class=([a-z_]+)>/g` → injection `style="color:..."`.
- CSS backup : sélecteurs `tajweed[class="..."]` + règle `tajweed { display:inline }`.
- Animation page : perspective `rotateY` style tournage de livre.
- **Fichiers :** `quran-client.tsx`, `globals.css`

### 4. Sync marque-page → dashboard (position absolue) ✅
- **Nouveau endpoint :** `PUT /api/users/me/hizb` `{ position: number }` — SET hizbsRead = position si > actuel (jamais en arrière).
- XP calculé sur le delta, feed groupe + daily log mis à jour.
- **Frontend :** `onSyncHizbPosition(page, hizbNumber)` appelé au tap du marque-page.
- Pose bookmark au hizb 44 → dashboard affiche 44 (pas incrément de 1).
- **Fichiers :** `apps/api/src/routes/users.ts`, `quran-client.tsx`

### 5. Message onboarding first-time sur la section Coran ✅
- Bannière explicative affichée une seule fois (localStorage `ikraa_quran_onboarded`).
- Explique : marque-page + sync, navigation swipe, code couleur tajweed.
- Bouton "Compris, commencer la lecture" ferme définitivement.
- **Fichier :** `quran-client.tsx`

---

## Ce qui reste à faire

### PRIORITÉ 1 — Vérifier le flux Google OAuth complet en prod 🔴
Tester depuis un mobile Safari :
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

### PRIORITÉ 6 — Migration DB pour PUT /api/users/me/hizb 🟡
Le nouveau endpoint PUT hizb fait `SET hizbsRead = position` (valeur absolue).
Vérifier que la colonne `hizbsRead` accepte bien des valeurs absolues (pas juste incrémentales).
Pas de migration nécessaire a priori mais à confirmer en prod.

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

## Architecture Coran — lecture (référence rapide)

```
API : https://api.quran.com/api/v4/verses/by_page/{page}
  ?fields=text_uthmani_tajweed,juz_number,hizb_number,page_number
  Format tajweed : <tajweed class=ham_wasl>ٱ</tajweed>  (tag custom, class sans guillemets)
  Fin de verset : <span class=end>١</span>

Marque-page verset :
  localStorage key : ikraa_verse_bookmark
  Interface : { verseKey, page, hizbNumber, juzNumber, surahNameTranslit, surahNameAr, verseNumber }
  Au tap : onSyncHizbPosition(page, hizb) → PUT /api/users/me/hizb { position }

Sync hizb dashboard :
  PUT /api/users/me/hizb { position: N }
  → SET hizbsRead = N si N > current (jamais en arrière)
  → XP delta = (N - current) * 5
  → feed groupe + daily log

Pages lues :
  localStorage key : ikraa_pages_read  (Set<number> sérialisé)

Onboarding :
  localStorage key : ikraa_quran_onboarded  (affiché 1 seule fois)
```

---

## Fichiers clés modifiés (toutes sessions)

```
apps/web/src/lib/auth-client.ts               ← verifySessionDirect()
apps/web/src/components/shared/auth-guard.tsx  ← verifySessionDirect() + 3 retries
apps/web/src/app/(auth)/login/page.tsx         ← verifySessionDirect() + token fix
apps/web/src/components/shared/sidebar.tsx     ← logout handler
apps/web/src/components/group/hizb-tracker.tsx ← reset count + XP variables
apps/api/Dockerfile                            ← npm install + web stub
apps/api/src/index.ts                          ← /auth/google + /auth/relay + CORS
apps/api/src/lib/auth.ts                       ← Better Auth config + trustedOrigins
apps/api/src/__tests__/helpers/chain.ts        ← Drizzle mock helper
apps/web/src/app/(dashboard)/quran/quran-client.tsx  ← lecture Coran complète
apps/web/src/app/globals.css                   ← police Uthmanic + tajweed CSS + animations
apps/api/src/routes/users.ts                   ← PUT /api/users/me/hizb (position absolue)
apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx  ← suppression MemberActivityCards
apps/web/src/app/(dashboard)/profile/profile-client.tsx      ← masquage lecture quotidienne si groupe
```

---

## Commits de cette session (dans l'ordre)

```
20bbefe feat(quran): sync hizb position absolue + message onboarding first-time
73c0287 feat(quran): sync marque-page → dashboard + animation plus lente
aecac9d fix(quran): correct tajweed format — tag <tajweed class=xxx> API réel
b0ccf80 fix(quran): tajweed guillemets simples, numéros versets cercles dorés, line-height 3.8
23c7303 feat(quran): police Uthmanic Hafs, tajweed inline, transition slide, marque-page par verset + hizb
9b71b45 feat(quran): police Scheherazade New, tajweed coloré, texte continu, sans transition, flèches masquées mobile
2d125a6 feat(ui): suppression activité membre du dashboard + lecture quotidienne masquée dans profil si dans un groupe
```

---

## Comment démarrer/terminer une session

**Début :** **"charge le contexte ikraa"**
**Fin :** **"mets à jour le relay"** → commit + push + mise à jour SKILL.md

Claude proposera de commencer par :
1. Tester le flux Google OAuth complet en prod (mobile Safari)
2. Connecter Railway à GitHub si pas encore fait
3. Vérifier les vars UPSTASH_REDIS sur Railway
