# 🕌 Ikraa Relay — Quran Tracker

> Fichier de relais de session. Mis à jour automatiquement en fin de chaque session.
> Pour reprendre : **"charge le contexte ikraa"**

---

## 📅 Dernière mise à jour
**2026-03-23** — Session longue : système lecture hizb/page complet

---

## ✅ Ce qui a été corrigé cette session

### 1. Suppression XP/niveaux dans le classement mémo + leaderboard simplifié
- **Problème** : Le classement mémo affichait XP, barres de niveau — pas pertinent pour la mémo
- **Fix** : Classement réduit à rang + avatar + nom + surahsMemorized + streak
- **Fichier** : `apps/web/src/components/group/leaderboard.tsx`

### 2. Compteur sourates toujours +1 trop élevé
- **Problème** : SQL `COUNT(CASE WHEN status = 'memorized')` pouvait double-compter
- **Fix** : `COUNT(DISTINCT CASE WHEN status IN ('memorized','consolidated') THEN surahId END)`
- **Fichier** : `apps/api/src/routes/groups.ts`

### 3. Vue hizb/page dans le lecteur Coran
- **Fix** : Carte marque-page avec barre de progression hizb + badges Hizb/Juz/Page
- **Fichier** : `apps/web/src/app/(dashboard)/quran/quran-client.tsx`

### 4. Sync automatique marque-page (suppression du prompt manuel)
- **Problème** : Prompt "Sync ✓ ?" à confirmer manuellement après chaque marque-page
- **Fix** : `handleVerseBookmark` appelle `onSyncHizbPosition` directement, toast de confirmation
- **Fichier** : `apps/web/src/app/(dashboard)/quran/quran-client.tsx`

### 5. Auth cassée après ajout colonne `current_reading_page`
- **Problème** : Ajout de la colonne Drizzle sans migration → Better Auth crashait
- **Fix** : Retrait temporaire, migration appliquée manuellement sur Supabase, réintégration
- **Fichiers** : `packages/db/src/schema/users.ts`, migration `0005_add_current_reading_page.sql`

### 6. Classement lecture dans le MAUVAIS composant
- **Problème** : J'avais modifié `hizb-tracker.tsx` mais le vrai classement visible en prod est dans `dashboard-client.tsx` (`HizbLectureTab`)
- **Fix** : Ajout badges H{n}/P.{x}/khatam + barre de progression dans `HizbLectureTab`
- **Fichier** : `apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx`

### 7. Double handler PUT /me/hizb — bug critique
- **Problème** : Deux `userRoutes.put('/me/hizb', ...)` empilés. Hono prenait toujours le PREMIER (ancien, sans `page`, sans logique cyclique). `currentReadingPage` jamais mis à jour.
- **Fix** : Suppression du premier handler obsolète
- **Fichier** : `apps/api/src/routes/users.ts`

### 8. Passage au khatam suivant bloqué
- **Problème** : `position (1) <= currentHizbs (60)` → ne passait jamais au khatam suivant
- **Fix** : Logique cyclique — si `currentCyclical == 60` et `position < cyclical` → nouveau khatam : `newHizbsRead = (khatam+1)*60 + position`
- **Fichier** : `apps/api/src/routes/users.ts`

### 9. Ring dashboard non cyclique — affichait 65/60
- **Problème** : `shownHizbs` utilisait la valeur brute accumulée (65, 120…) → ring débordait
- **Fix** : `shownHizbs = ((raw-1)%60)+1` (cyclique), `khatamCount = Math.floor(raw/60)`, badge ×N ✨, `tapHizb` sans cap à 60, bouton + jamais disabled
- **Fichier** : `apps/web/src/app/(dashboard)/dashboard/dashboard-client.tsx`

### 10. Invalidation queries incomplète après marque-page
- **Problème** : `markHizb.onSuccess` utilisait `['leaderboard']` (clé inexistante). Profile et DashboardClient outer query sans `staleTime:0`
- **Fix** : Toutes les mutations qui modifient hizb/page invalident `['group', refetchType:'all']` + `['user-profile', refetchType:'all']`. `staleTime:0, refetchOnMount:'always'` sur profil et leaderboard outer.
- **Fichiers** : `quran-client.tsx`, `dashboard-client.tsx`, `profile-client.tsx`

### 11. Profile affichait valeur brute (65 hizbs lus)
- **Problème** : Header "Lecture quotidienne" affichait `{hizbsRead} hizbs lus` = 65
- **Fix** : Header remplacé par `H{hizb}/60 · ×{khatams} ✨` (cyclique)
- **Fichiers** : `profile-client.tsx`, `dashboard-client.tsx`

---

## 🔴 Ce qui reste à faire (priorité)

### 🔴 Vérifier déploiement Railway
- Railway doit avoir déployé les commits `7987366` + `9297136` pour que le `PUT /me/hizb` fonctionne
- Tester : poser un marque-page à H1 depuis H60 → vérifier que `hizbsRead` passe à 61 en base

### 🟡 Page et surah dans profile — vérifier en prod
- `currentReadingPage` doit s'afficher en vert (P.xx) dans Lecture quotidienne du profil
- Si toujours gris (~P.xx estimé) → Railway n'a pas déployé le fix du double handler

### 🟡 IA v2 (GPT-4o)
- Routes stubs dans `apps/api/src/routes/ai.ts`
- `GET /api/ai/suggestions/:userId` → suggestions basées sur SM-2
- `POST /api/ai/chat` → assistant conversationnel
- `GET /api/ai/daily-plan/:userId` → plan quotidien personnalisé

### 🟡 Validation vocale (Whisper API)
- Architecture prête dans `ai.ts`, implémentation prévue v2

### 🟢 Tests E2E
- Vitest config présente mais couverture limitée
- Ajouter tests pour routes critiques : auth, progress, hizb sync

### 🟢 Notifications push
- PWA push configuré (`use-push-notifications.ts`) mais non testé en prod

---

## 📦 Commits de cette session (2026-03-23)

```
ecc2f0a fix(ui): affichage cyclique H1-60 partout — jamais de valeur > 60
62f388c fix(sync): invalidation complète après mise à jour du marque-page
4317dda fix(dashboard): ring cyclique + khatams multiples dans HizbLectureTab
7987366 fix(api): supprime le double handler PUT /me/hizb qui bloquait tout
9297136 fix(api): PUT /me/hizb gère le passage au khatam suivant
c7de7e7 fix(lecture): classement hizb/page dans le vrai composant dashboard
c685ff9 fix(build): nameTranslit → nameEn sur le type Surah partagé
ffb789a fix(lecture): sync hizb/page toujours visible — leaderboard + profil
19209a1 feat(lecture): sync automatique du marque-page + position hizb/page en badges
6b7382c fix(build): ajoute currentReadingPage dans interface HizbEntry
74fd127 fix(build): corrige syntax error quran-client — onSuccess mutation tronqué
f8ab14b feat(lecture): réintègre current_reading_page — migration appliquée en base
05b40db fix(auth): retire current_reading_page du schéma Drizzle — restaure la connexion
bdc3525 fix(lecture): sync marque-page + page réelle par membre dans classement
6073317 fix(ui): supprime XP/niveaux, simplifie leaderboard mémo, corrige compteur sourates
7fec5d5 feat(ui): hizb cyclique 1-60, vue position lecture, suppression XP
```

---

## ⚠️ Points critiques à retenir

### Architecture lecture hizb
- `hizbsRead` en DB = valeur **accumulée** (peut valoir 65, 120, 183…)
- Affichage = **toujours cyclique** : `((hizbsRead - 1) % 60) + 1` → H1-H60
- Khatams = `Math.floor(hizbsRead / 60)`
- `PUT /me/hizb` reçoit `position` (1-60) + `page` (1-604)

### Logique avancement khatam (PUT /me/hizb)
```
currentCyclical = ((hizbsRead-1)%60)+1
currentKhatam   = Math.floor((hizbsRead-1)/60)

if position > currentCyclical → même khatam : new = khatam*60 + position
if position < currentCyclical && currentCyclical == 60 → nouveau khatam : new = (khatam+1)*60 + position
sinon → lecture en arrière, ne pas reculer (update page seulement)
```

### Deux composants classement (NE PAS CONFONDRE)
- `hizb-tracker.tsx` → utilisé dans **onglet Coran** uniquement (QuranClient)
- `HizbLectureTab` dans `dashboard-client.tsx` → **vrai classement onglet Lecture** (Accueil)

### Query keys TanStack Query
```
['group', groupId, 'leaderboard']  → classement lecture + mémo
['user-profile']                   → données profil (/api/users/me)
['progress', userId]               → progression mémorisation
['surahs']                         → liste sourates (staleTime: Infinity)
```

### Git workaround
- `.git/index.lock` présent dans le workspace → tous les commits depuis `/tmp/quran-tracker-tmp`
- `git log` : toujours dans `/tmp/quran-tracker-tmp`

### Migration DB appliquée
- `0005_add_current_reading_page.sql` : appliquée manuellement sur Supabase SQL Editor
- Colonne `current_reading_page integer` dans la table `users`

---

## 🚀 Comment démarrer la prochaine session

1. **Vérifier Railway** : confirmer que les commits `7987366` (double handler) et `9297136` (logique khatam) sont bien déployés sur Railway → tester en posant un marque-page à H1 depuis H60
2. **Tester le flow complet** : Coran → poser marque-page → vérifier mise à jour dans Accueil (classement) + Profil (H{n}/60, P.{page}, surah)
3. **Si Railway OK** : passer à IA v2 (GPT-4o suggestions) ou tests E2E selon priorité

---

*🤖 Mis à jour automatiquement par Claude — 2026-03-23*
