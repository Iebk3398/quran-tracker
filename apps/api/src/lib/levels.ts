/**
 * @file Système de niveaux — Quran Tracker
 * @description Niveaux dual-condition (XP ET sourates mémorisées).
 * Partagé entre progress.ts et users.ts pour la détection de montée de niveau.
 */

export interface Level {
  /** Index du niveau (0 = débutant) */
  index: number
  /** Nom du niveau */
  name: string
  /** Nom arabe */
  nameAr: string
  /** Emoji représentatif */
  emoji: string
  /** XP minimum requis */
  min: number
  /** Nombre de sourates mémorisées minimum requis */
  minSurahs: number
}

/**
 * Définition des 5 niveaux du système gamification.
 * Un utilisateur atteint le niveau le plus élevé
 * où il satisfait LES DEUX conditions (XP ET sourates).
 */
export const LEVELS: Level[] = [
  { index: 0, name: 'Murîd',  nameAr: 'مريد',  emoji: '🌱', min: 0,     minSurahs: 0  },
  { index: 1, name: 'Taleb',  nameAr: 'طالب',  emoji: '📖', min: 500,   minSurahs: 1  },
  { index: 2, name: 'Qari',   nameAr: 'قارئ',  emoji: '📜', min: 1500,  minSurahs: 5  },
  { index: 3, name: 'Hafiz',  nameAr: 'حافظ',  emoji: '⭐', min: 4000,  minSurahs: 20 },
  { index: 4, name: 'Sheikh', nameAr: 'شيخ',   emoji: '🎓', min: 10000, minSurahs: 57 },
]

/**
 * Retourne l'index du niveau atteint pour un utilisateur donné.
 * Logique : niveau le plus élevé où XP ≥ min ET sourates ≥ minSurahs.
 *
 * @param xp            - XP total de l'utilisateur
 * @param surahs        - Nombre de sourates mémorisées (status = 'memorized' | 'consolidated')
 * @returns Index du niveau (0-4)
 */
export function getLevelIndex(xp: number, surahs: number): number {
  let level = 0
  for (const lvl of LEVELS) {
    if (xp >= lvl.min && surahs >= lvl.minSurahs) {
      level = lvl.index
    }
  }
  return level
}

/**
 * Retourne l'objet Level pour un utilisateur.
 *
 * @param xp     - XP total
 * @param surahs - Sourates mémorisées
 */
export function getLevel(xp: number, surahs: number): Level {
  return LEVELS[getLevelIndex(xp, surahs)]!
}
