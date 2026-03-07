/**
 * @file Tests unitaires — Logique des badges
 */
import { describe, it, expect } from 'vitest'
import { getNewlyEarnedBadges, calculateXP } from './badges.js'
import type { UserStats } from './badges.js'

const baseStats: UserStats = {
  memorizedCount: 0,
  consolidatedCount: 0,
  currentStreak: 0,
  totalXP: 0,
  hasCompletedJuzAmma: false,
  hasCompletedHalfQuran: false,
  isFullHafiz: false,
}

describe('Badge Logic', () => {
  describe('getNewlyEarnedBadges', () => {
    it('should award first-surah badge when first surah memorized', () => {
      const stats: UserStats = { ...baseStats, memorizedCount: 1 }
      const newBadges = getNewlyEarnedBadges(stats, [])
      expect(newBadges).toContain('first-surah')
    })

    it('should not re-award existing badges', () => {
      const stats: UserStats = { ...baseStats, memorizedCount: 5 }
      const newBadges = getNewlyEarnedBadges(stats, ['first-surah'])
      expect(newBadges).not.toContain('first-surah')
    })

    it('should award streak-7 badge at 7-day streak', () => {
      const stats: UserStats = { ...baseStats, currentStreak: 7 }
      const newBadges = getNewlyEarnedBadges(stats, [])
      expect(newBadges).toContain('streak-7')
    })

    it('should not award streak-30 at 7-day streak', () => {
      const stats: UserStats = { ...baseStats, currentStreak: 7 }
      const newBadges = getNewlyEarnedBadges(stats, [])
      expect(newBadges).not.toContain('streak-30')
    })

    it('should award hafiz badge for full memorization', () => {
      const stats: UserStats = {
        ...baseStats,
        memorizedCount: 114,
        isFullHafiz: true,
        hasCompletedHalfQuran: true,
        hasCompletedJuzAmma: true,
      }
      const newBadges = getNewlyEarnedBadges(stats, [])
      expect(newBadges).toContain('hafiz')
    })

    it('should return empty array when no new badges earned', () => {
      const newBadges = getNewlyEarnedBadges(baseStats, [])
      expect(newBadges).toHaveLength(0)
    })
  })

  describe('calculateXP', () => {
    it('should calculate XP correctly', () => {
      const xp = calculateXP({
        memorizedSurahs: 5,
        revisionSessions: 10,
        currentStreak: 7,
        validatedBySheikh: 3,
      })

      // 5*100 + 10*10 + 7*5 + 3*50 = 500 + 100 + 35 + 150 = 785
      expect(xp).toBe(785)
    })

    it('should return 0 for no activity', () => {
      const xp = calculateXP({
        memorizedSurahs: 0,
        revisionSessions: 0,
        currentStreak: 0,
        validatedBySheikh: 0,
      })
      expect(xp).toBe(0)
    })
  })
})
