/**
 * @file Tests unitaires — Algorithme SM-2
 * @description Vérifie les calculs de répétition espacée
 */
import { describe, it, expect } from 'vitest'
import { calculateSM2, isReviewDue, getRevisionPriority } from './spaced-repetition.js'

describe('SM-2 Algorithm', () => {
  describe('calculateSM2', () => {
    it('should handle perfect recall (quality=5)', () => {
      const result = calculateSM2({
        quality: 5,
        repetitionCount: 0,
        easeFactor: 2.5,
        intervalDays: 1,
      })

      expect(result.repetitionCount).toBe(1)
      expect(result.intervalDays).toBeGreaterThanOrEqual(1)
      expect(result.easeFactor).toBeGreaterThanOrEqual(2.5) // Good recall → same or higher EF
    })

    it('should handle good recall (quality=4)', () => {
      const result = calculateSM2({
        quality: 4,
        repetitionCount: 1,
        easeFactor: 2.5,
        intervalDays: 1,
      })

      expect(result.repetitionCount).toBe(2)
      expect(result.intervalDays).toBe(6) // Second repetition → 6 days
    })

    it('should reset on failure (quality<3)', () => {
      const result = calculateSM2({
        quality: 2,
        repetitionCount: 5,
        easeFactor: 2.5,
        intervalDays: 30,
      })

      expect(result.repetitionCount).toBe(0)
      expect(result.intervalDays).toBe(1) // Reset to 1 day
    })

    it('should decrease ease factor on poor recall', () => {
      const result = calculateSM2({
        quality: 2,
        repetitionCount: 2,
        easeFactor: 2.5,
        intervalDays: 6,
      })

      expect(result.easeFactor).toBeLessThan(2.5)
    })

    it('should not allow ease factor below 1.3', () => {
      const result = calculateSM2({
        quality: 0, // Worst possible recall
        repetitionCount: 1,
        easeFactor: 1.3,
        intervalDays: 1,
      })

      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
    })

    it('should set correct nextReviewAt date', () => {
      const before = new Date()
      const result = calculateSM2({
        quality: 4,
        repetitionCount: 0,
        easeFactor: 2.5,
        intervalDays: 1,
      })
      const after = new Date()

      expect(result.nextReviewAt).toBeInstanceOf(Date)
      expect(result.nextReviewAt.getTime()).toBeGreaterThan(before.getTime())

      // Next review should be approximately 1 day from now
      const oneDayMs = 24 * 60 * 60 * 1000
      const expectedTime = before.getTime() + oneDayMs
      expect(Math.abs(result.nextReviewAt.getTime() - expectedTime)).toBeLessThan(
        60000 // Within 1 minute tolerance
      )
    })
  })

  describe('isReviewDue', () => {
    it('should return true for past dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isReviewDue(yesterday)).toBe(true)
    })

    it('should return true for current date', () => {
      const now = new Date()
      expect(isReviewDue(now)).toBe(true)
    })

    it('should return false for future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isReviewDue(tomorrow)).toBe(false)
    })
  })

  describe('getRevisionPriority', () => {
    it('should return critical for overdue by 7+ days', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10)
      expect(getRevisionPriority(oldDate)).toBe('critical')
    })

    it('should return high for overdue by 2-6 days', () => {
      const date = new Date()
      date.setDate(date.getDate() - 3)
      expect(getRevisionPriority(date)).toBe('high')
    })

    it('should return medium for due today or tomorrow', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(getRevisionPriority(tomorrow)).toBe('medium')
    })

    it('should return low for future reviews', () => {
      const future = new Date()
      future.setDate(future.getDate() + 5)
      expect(getRevisionPriority(future)).toBe('low')
    })
  })
})
