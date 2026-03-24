# 🕌 Ikraa Relay — Quran Tracker

> Fichier de relais de session. Mis à jour automatiquement en fin de chaque session.
> Pour reprendre : **"charge le contexte ikraa"**

---

## 📅 Dernière mise à jour
**2026-03-24** — Session : police coranique UthmanicHafs + fix rendu tashkeel

---

## ✅ Ce qui a été corrigé cette session

### 1. Suppression XP/niveaux dans le classement mémo + leaderboard simplifié
- **Problème** : Le classement mémo affichait XP, barres de niveau — pas pertinent pour la mémo
- **Fix** : Classement réduit à rang + avatar + nom + surahsMemorized + streak
- **Fichier** : `apps/web/src/components/group/leaderboard.tsx`

### 2. Compteur sourates toujours +1 trop élevé
- **Fix** : `COUNT(DISTINCT CASE WHEN status IN ('memorized','consolidated') THEN surahId END)`
- **Fichier** : `apps/api/src/routes/groups.ts`

### 3. Système hizb/page cyclique complet (H1-H60, khatams)
- **Fix** : Logique cyclique `((hizbsRead-1)%60)+1`, khatams, double handler supprimé
- **Fichiers** : `apps/api/src/routes/users.ts`, `dashboard-client.tsx`, `profile-client.tsx`

### 4. Chevauchement tashkeel — police coranique
- **Problème** : `UthmanicHafs` depuis `qurancdn.com` bloquée CORS/CSP sur Vercel → fallback `Noto Naskh Arabic` → tashkeel superposés (shadda+kasra, etc.)
- **Fix** : Ajout `Amiri Quran` (Google Fonts) comme fallback fiable + `lineHeight: 3.2`
- **Commit** : `4a508ef`
- **Fichiers** : `globals.css`, `quran-client.tsx`

### 5. Police UthmanicHafs auto-hébergée
- **Problème** : Même avec Amiri Quran, les letterforms ne correspondaient pas exactement au Mushaf Madinah
- **Fix** : Téléchargement de `UthmanicHafs.otf` via npm `kfgqpc-uthmanic-script-hafs-regular` → copié dans `apps/web/public/fonts/` → chargé depuis `/fonts/` (même origine, jamais bloqué)
- **Commit** : `d92be02`
- **Fichier** : `apps/web/public/fonts/UthmanicHafs.otf`

### 6. Cercles orange aux positions de prolongement (madda)
- **Problème** : `text_uthmani_tajweed` contient U+0670 (alif poignard) + U+06D6–U+06ED (marques de récitation). La police UthmanicHafs npm rend U+0670 comme un glyph circulaire. Couplé à la couleur orange `madda_normal = #c47f17` → grands cercles orange visibles.
- **Fix partiel** : `stripUthmanicAnnotations()` supprime U+06D6–U+06ED + remplace U+0670 par ا
- **Fix final** : `madda_normal/permissible/obligatory` → `#1c1610` (couleur texte neutre)
- **Commit** : `12ca21b`
- **Fichier** : `apps/web/src/app/(dashboard)/quran/quran-client.tsx`

### 7. Cercles pointillés (◌) — glyphs manquants dans UthmanicHafs npm
- **Problème** : La version npm `kfgqpc-uthmanic-script-hafs-regular` est incomplète — certains glyphs arabes manquent → browser affiche ◌ (U+25CC placeholder)
- **Statut** : ⚠️ EN COURS — solution = remplacer par la police KFGQPC officielle
- **À faire** : Télécharger depuis [fonts.qurancomplex.gov.sa](https://fonts.qurancomplex.gov.sa) et déposer dans `apps/web/public/fonts/UthmanicHafs.otf`

---

## 🔴 Ce qui reste à faire (priorité)

### 🔴 Remplacer UthmanicHafs npm par la police KFGQPC officielle
- **Action utilisateur** : Télécharger depuis [fonts.qurancomplex.gov.sa](https://fonts.qurancomplex.gov.sa) → "KFGQPC Uthman Taha Naskh" ou "KFGQPC Uthmanic Script Hafs"
- Déposer dans `apps/web/public/fonts/UthmanicHafs.otf` (remplacer l'existant)
- Commiter et pousser
- **Résultat attendu** : Zéro cercle, zéro ◌, letterforms Mushaf Madinah parfaits

### 🔴 Vérifier déploiement Railway
- Railway doit avoir déployé les commits `7987366` + `9297136` pour que `PUT /me/hizb` fonctionne
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

## 📦 Commits de cette session (2026-03-24)

```
12ca21b fix(fonts): restaure UthmanicHafs + madda_normal en couleur neutre
2fd70cf fix(fonts): revient à Amiri Quran — UthmanicHafs npm rendait l'alif en cercle
ac13ab7 fix(quran): alif poignard U+0670 → ا au lieu d'être supprimé
f83a659 fix(quran): supprime les marques Uthmanic U+06D6–U+06ED (cercles visibles)
d92be02 fix(fonts): auto-héberge UthmanicHafs.otf — letterforms exacts style Mushaf Madinah
4a508ef fix(fonts): Amiri Quran en fallback + lineHeight 3.2 — corrige chevauchement tashkeel
```

---

## ⚠️ Points critiques à retenir

### Police coranique — état actuel
- **Police active** : `UthmanicHafs` (npm, incomplète) → `Amiri Quran` (fallback Google Fonts)
- **Problème résiduel** : UthmanicHafs npm manque certains glyphs → ◌ sur certains mots
- **Solution** : Remplacer `apps/web/public/fonts/UthmanicHafs.otf` par la version officielle KFGQPC

### Traitement texte Uthmanique (pipeline)
```
applyTajweedColors(
  stripUthmanicAnnotations(       ← U+0670 → ا, U+06D6–U+06ED supprimés
    stripVerseEndMarker(
      v.text_uthmani_tajweed
    )
  )
)
```

### Couleurs tajweed actuelles
- `madda_normal/permissible/obligatory` → `#1c1610` (neutre — évite les cercles orange)
- `madda_necessary` → `#1d4ed8` (bleu foncé)
- `ghunna` → `#16a34a` (vert)
- `idgham_*` → `#dc2626` (rouge)
- `qalaqah` → `#3b82f6` (bleu vif)

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

1. **Action prioritaire** : Télécharger la police KFGQPC officielle depuis [fonts.qurancomplex.gov.sa](https://fonts.qurancomplex.gov.sa) → remplacer `apps/web/public/fonts/UthmanicHafs.otf` → commiter
2. **Vérifier Railway** : confirmer commits `7987366` + `9297136` déployés → tester marque-page H60→H1
3. **Tester le flow complet** : Coran → poser marque-page → vérifier mise à jour Accueil + Profil

---

*🤖 Mis à jour automatiquement par Claude — 2026-03-24*
