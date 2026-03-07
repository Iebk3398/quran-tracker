/**
 * @file Logique des badges
 * @description Calcul et attribution des badges de gamification
 */

export interface BadgeCondition {
  id: string
  name: string
  check: (stats: UserStats) => boolean
}

export interface UserStats {
  memorizedCount: number
  consolidatedCount: number
  currentStreak: number
  totalXP: number
  hasCompletedJuzAmma: boolean
  hasCompletedHalfQuran: boolean
  isFullHafiz: boolean
}

/** Définitions des badges avec leurs conditions */
export const BADGE_CONDITIONS: BadgeCondition[] = [
  {
    id: 'first-surah',
    name: 'Première Sourate',
    check: (s) => s.memorizedCount >= 1,
  },
  {
    id: 'juz-amma',
    name: 'Juz Amma',
    check: (s) => s.hasCompletedJuzAmma,
  },
  {
    id: 'ten-surahs',
    name: 'Dix Sourates',
    check: (s) => s.memorizedCount >= 10,
  },
  {
    id: 'streak-7',
    name: 'Série 7 jours',
    check: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak-30',
    name: 'Série 30 jours',
    check: (s) => s.currentStreak >= 30,
  },
  {
    id: 'half-quran',
    name: 'Moitié du Coran',
    check: (s) => s.hasCompletedHalfQuran,
  },
  {
    id: 'hafiz',
    name: 'Hafiz',
    check: (s) => s.isFullHafiz,
  },
]

/**
 * Calcule les badges nouvellement gagnés
 * @param stats - Statistiques actuelles de l'utilisateur
 * @param existingBadgeIds - IDs des badges déjà obtenus
 * @returns Liste des IDs des nouveaux badges à attribuer
 */
export function getNewlyEarnedBadges(
  stats: UserStats,
  existingBadgeIds: string[]
): string[] {
  return BADGE_CONDITIONS
    .filter((badge) => !existingBadgeIds.includes(badge.id))
    .filter((badge) => badge.check(stats))
    .map((badge) => badge.id)
}

/**
 * Calcule le score XP total basé sur les activités
 */
export function calculateXP(params: {
  memorizedSurahs: number
  revisionSessions: number
  currentStreak: number
  validatedBySheikh: number
}): number {
  return (
    params.memorizedSurahs * 100 +
    params.revisionSessions * 10 +
    params.currentStreak * 5 +
    params.validatedBySheikh * 50
  )
}
