/**
 * @file Algorithme de Spaced Repetition SM-2
 * @description Calcule les intervalles de révision optimaux
 * Basé sur l'algorithme SM-2 de SuperMemo
 */

export interface SM2Input {
  quality: number           // 0-5 (qualité de la révision)
  repetitionCount: number   // nombre de répétitions passées
  intervalDays: number      // intervalle actuel en jours
  retentionScore: number    // ease factor actuel (2.5 par défaut)
}

export interface SM2Output {
  nextIntervalDays: number
  nextRepetitionCount: number
  nextRetentionScore: number
  nextReviewAt: Date
}

/**
 * Calcule le prochain intervalle de révision selon l'algorithme SM-2
 * @param input - Données de la session de révision
 * @returns Nouvelles valeurs SM-2
 */
export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, repetitionCount, intervalDays, retentionScore } = input

  // Qualité < 3 = révision échouée, recommencer
  if (quality < 3) {
    return {
      nextIntervalDays: 1,
      nextRepetitionCount: 0,
      nextRetentionScore: Math.max(1.3, retentionScore - 0.8),
      nextReviewAt: addDays(new Date(), 1),
    }
  }

  // Calcul du nouvel ease factor
  const newEaseFactor = Math.max(
    1.3,
    retentionScore + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  // Calcul de l'intervalle suivant
  let nextInterval: number
  if (repetitionCount === 0) {
    nextInterval = 1
  } else if (repetitionCount === 1) {
    nextInterval = 6
  } else {
    nextInterval = Math.round(intervalDays * newEaseFactor)
  }

  return {
    nextIntervalDays: nextInterval,
    nextRepetitionCount: repetitionCount + 1,
    nextRetentionScore: newEaseFactor,
    nextReviewAt: addDays(new Date(), nextInterval),
  }
}

/**
 * Détermine si une sourate doit être révisée aujourd'hui
 * @param nextReviewAt - Date de prochaine révision
 * @returns true si la révision est due
 */
export function isReviewDue(nextReviewAt: Date | null): boolean {
  if (!nextReviewAt) return false
  return nextReviewAt <= new Date()
}

/**
 * Calcule le score de priorité de révision (0-100)
 * @param nextReviewAt - Date de prochaine révision
 * @returns Score de priorité
 */
export function getRevisionPriority(nextReviewAt: Date | null): number {
  if (!nextReviewAt) return 0
  const daysOverdue = Math.floor(
    (new Date().getTime() - nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysOverdue < 0) return 0
  return Math.min(100, 50 + daysOverdue * 10)
}

/** Helper: ajoute N jours à une date */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
