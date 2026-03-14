/**
 * @file Routes progression mémorisation — /api/progress
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import {
  db, memorizationProgress, surahs, users, groupMembers, badges, userBadges,
} from '../../../../packages/db/src/index.ts'
import { eq, and, sql, inArray, or } from 'drizzle-orm'
import { requireAuth, requireSheikh } from '../middleware/auth.ts'
import { calculateSM2 } from '../../../../packages/db/src/lib/spaced-repetition.ts'
import { createFeedEvent } from './feed.ts'
import { getNewlyEarnedBadges, type UserStats } from '../lib/badges.ts'
import { getLevelIndex, LEVELS } from '../lib/levels.ts'

/** IDs des sourates du Juz Amma (sourates 78 à 114) */
const JUZ_30_SURAHS = Array.from({ length: 37 }, (_, i) => i + 78)

/** XP accordé selon la transition de statut */
function computeXpGain(
  previousStatus: string | undefined,
  newStatus: string,
  markForReview: boolean | undefined
): number {
  if (newStatus === 'memorized' && previousStatus !== 'memorized') return 100
  if (newStatus === 'in_progress' && (previousStatus === 'not_started' || !previousStatus)) return 20
  if (markForReview) return 10
  return 0
}

/** Incrémente le XP d'un utilisateur */
async function awardXp(userId: string, xpGain: number): Promise<void> {
  if (xpGain <= 0) return
  await db
    .update(users)
    .set({ xp: sql`(${users.xp}::integer + ${xpGain})::text` })
    .where(eq(users.id, userId))
}

/**
 * Attribue les nouveaux badges et vérifie la montée de niveau.
 * Appelé en fire-and-forget après une mémorisation ou une validation sheikh.
 */
async function awardBadgesAndCheckLevel(
  userId: string,
  userGroups: Array<{ groupId: string }>,
  memorizedIds: number[],
  xpBefore: number,
  xpAfter: number,
  streak: number,
): Promise<void> {
  if (userGroups.length === 0) return

  const existingBadgeRows = await db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId))

  const existingBadgeIds = existingBadgeRows.map((b) => b.badgeId)

  const stats: UserStats = {
    memorizedCount: memorizedIds.length,
    currentStreak: streak,
    totalXP: xpAfter,
    hasCompletedJuzAmma: JUZ_30_SURAHS.every((id) => memorizedIds.includes(id)),
    hasCompletedHalfQuran: memorizedIds.length >= 57,
    isFullHafiz: memorizedIds.length >= 114,
  }

  const newBadgeIds = getNewlyEarnedBadges(stats, existingBadgeIds)
  let totalBadgeXp = 0

  if (newBadgeIds.length > 0) {
    const badgeInfoRows = await db
      .select({ id: badges.id, name: badges.name, nameAr: badges.nameAr, iconUrl: badges.iconUrl, xpReward: badges.xpReward })
      .from(badges)
      .where(inArray(badges.id, newBadgeIds))

    for (const badge of badgeInfoRows) {
      await db.insert(userBadges).values({ id: nanoid(), userId, badgeId: badge.id, earnedAt: new Date() })
      const badgeXp = badge.xpReward ?? 0
      if (badgeXp > 0) { await awardXp(userId, badgeXp); totalBadgeXp += badgeXp }

      await Promise.all(userGroups.map((g) =>
        createFeedEvent({
          groupId: g.groupId, userId, type: 'badge_earned',
          content: { badgeId: badge.id, badgeName: badge.name, badgeNameAr: badge.nameAr, badgeIcon: badge.iconUrl },
        })
      ))
    }
  }

  // Vérification de la montée de niveau
  const prevSurahCount = Math.max(0, memorizedIds.length - 1)
  const levelBefore = getLevelIndex(xpBefore, prevSurahCount)
  const levelAfter  = getLevelIndex(xpAfter + totalBadgeXp, memorizedIds.length)

  if (levelAfter > levelBefore) {
    const newLevel = LEVELS[levelAfter]!
    await Promise.all(userGroups.map((g) =>
      createFeedEvent({
        groupId: g.groupId, userId, type: 'milestone_reached',
        content: { type: 'level_up', levelIndex: levelAfter, levelName: newLevel.name, levelEmoji: newLevel.emoji },
      })
    ))
  }
}

export const progressRoutes = new Hono()

const updateProgressSchema = z.object({
  surahId: z.number().int().min(1).max(114),
  status: z.enum(['not_started', 'in_progress', 'memorized', 'consolidated']),
  verseFrom: z.number().int().min(1).nullish(), // accepte number | null | undefined
  verseTo: z.number().int().min(1).nullish(),
  markForReview: z.boolean().optional(), // "À réviser" — programme une révision immédiate
})

const validateSchema = z.object({
  notes: z.string().max(1000).optional(),
})

/** GET /api/progress/:userId — Progression complète d'un utilisateur */
progressRoutes.get('/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId')

  const progress = await db
    .select()
    .from(memorizationProgress)
    .where(eq(memorizationProgress.userId, userId))

  // Retourner un tableau de 114 entrées (une par sourate)
  const allSurahIds = Array.from({ length: 114 }, (_, i) => i + 1)
  const progressMap = new Map(progress.map((p) => [p.surahId, p]))

  const fullProgress = allSurahIds.map((surahId) => {
    const entry = progressMap.get(surahId)
    if (entry) {
      // Spread sans re-déclarer surahId (évite la duplication de clé TS5.9+)
      const { surahId: _sid, ...rest } = entry
      return { surahId, ...rest }
    }
    return { surahId, status: 'not_started' as const, retentionScore: 2.5, repetitionCount: 0 }
  })

  return c.json({ success: true, data: fullProgress })
})

/** POST /api/progress — Enregistrer ou mettre à jour la progression */
progressRoutes.post('/', requireAuth, zValidator('json', updateProgressSchema), async (c) => {
  const user = c.get('user')
  const { surahId, status, verseFrom, verseTo, markForReview } = c.req.valid('json')

  // Récupère la progression existante ET les stats de l'utilisateur en parallèle
  const [existing, userRow] = await Promise.all([
    db
      .select()
      .from(memorizationProgress)
      .where(and(eq(memorizationProgress.userId, user.id), eq(memorizationProgress.surahId, surahId)))
      .limit(1),
    db
      .select({ xp: users.xp, currentStreak: users.currentStreak })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
  ])

  const xpGain        = computeXpGain(existing[0]?.status, status, markForReview)
  const becomesMemorized = status === 'memorized' && existing[0]?.status !== 'memorized'
  const xpBefore      = parseInt(userRow[0]?.xp ?? '0')
  const streak        = parseInt(userRow[0]?.currentStreak ?? '0')

  if (existing[0]) {
    const updated = await db
      .update(memorizationProgress)
      .set({
        status,
        verseFrom: verseFrom ?? null,
        verseTo: verseTo ?? null,
        lastRevisedAt: new Date(),
        ...(markForReview && { nextReviewAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(memorizationProgress.id, existing[0].id))
      .returning()

    await awardXp(user.id, xpGain)

    if (becomesMemorized) {
      await handlePostMemorizationEvents(user.id, surahId, xpBefore, xpGain, streak).catch(() => {})
    }

    return c.json({ success: true, data: updated[0], xpGain })
  }

  const created = await db
    .insert(memorizationProgress)
    .values({
      id: nanoid(),
      userId: user.id,
      surahId,
      status,
      verseFrom: verseFrom ?? null,
      verseTo: verseTo ?? null,
      lastRevisedAt: new Date(),
      ...(markForReview && { nextReviewAt: new Date() }),
    })
    .returning()

  await awardXp(user.id, xpGain)

  if (becomesMemorized) {
    await handlePostMemorizationEvents(user.id, surahId, xpBefore, xpGain, streak).catch(() => {})
  }

  return c.json({ success: true, data: created[0], xpGain }, 201)
})

/**
 * Gère les événements post-mémorisation :
 * feed surah_memorized + attribution badges + vérification niveau.
 */
async function handlePostMemorizationEvents(
  userId: string,
  surahId: number,
  xpBefore: number,
  xpGain: number,
  streak: number,
): Promise<void> {
  const xpAfter = xpBefore + xpGain

  const [surahInfo, userGroups, memorizedRows] = await Promise.all([
    db.select({ nameFr: surahs.nameFr, nameAr: surahs.nameAr, number: surahs.number })
      .from(surahs).where(eq(surahs.id, surahId)).limit(1),
    db.select({ groupId: groupMembers.groupId })
      .from(groupMembers).where(eq(groupMembers.userId, userId)),
    db.select({ surahId: memorizationProgress.surahId })
      .from(memorizationProgress)
      .where(and(
        eq(memorizationProgress.userId, userId),
        or(eq(memorizationProgress.status, 'memorized'), eq(memorizationProgress.status, 'consolidated')),
      )),
  ])

  const surah = surahInfo[0]
  if (!surah || userGroups.length === 0) return

  const memorizedIds = memorizedRows.map((r) => r.surahId)

  // Feed event surah_memorized
  await Promise.all(userGroups.map((g) =>
    createFeedEvent({
      groupId: g.groupId, userId, type: 'surah_memorized',
      content: { surahId, surahName: surah.nameFr, surahNameAr: surah.nameAr, surahNumber: surah.number },
    })
  ))

  // Badges + niveau
  await awardBadgesAndCheckLevel(userId, userGroups, memorizedIds, xpBefore, xpAfter, streak)
}

/** POST /api/progress/:id/validate — Validation sheikh */
progressRoutes.post('/:id/validate', requireSheikh, zValidator('json', validateSchema), async (c) => {
  const sheikh = c.get('user')
  const progressId = c.req.param('id')
  const { notes } = c.req.valid('json')

  // Récupère le propriétaire, le statut et la sourate avant la mise à jour
  const [existing] = await db
    .select({
      userId: memorizationProgress.userId,
      status: memorizationProgress.status,
      surahId: memorizationProgress.surahId,
    })
    .from(memorizationProgress)
    .where(eq(memorizationProgress.id, progressId))
    .limit(1)

  if (!existing) return c.json({ success: false, message: 'Not found' }, 404)

  const userRow = await db
    .select({ xp: users.xp, currentStreak: users.currentStreak })
    .from(users)
    .where(eq(users.id, existing.userId))
    .limit(1)

  const updated = await db
    .update(memorizationProgress)
    .set({
      status: 'memorized',
      validatedBySheikhAt: new Date(),
      validatedBySheikhId: sheikh.id,
      sheikhNotes: notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(memorizationProgress.id, progressId))
    .returning()

  // +100 XP si pas déjà mémorisé + 50 XP bonus validation sheikh
  const xpGain   = (existing.status !== 'memorized' ? 100 : 0) + 50
  const xpBefore = parseInt(userRow[0]?.xp ?? '0')
  const streak   = parseInt(userRow[0]?.currentStreak ?? '0')
  await awardXp(existing.userId, xpGain)

  await handlePostValidationEvents(existing.userId, existing.surahId, xpBefore, xpGain, streak, sheikh.id).catch(() => {})

  return c.json({ success: true, data: updated[0] })
})

/**
 * Gère les événements post-validation sheikh :
 * feed surah_validated + attribution badges + vérification niveau.
 */
async function handlePostValidationEvents(
  userId: string,
  surahId: number,
  xpBefore: number,
  xpGain: number,
  streak: number,
  sheikhId: string,
): Promise<void> {
  const xpAfter = xpBefore + xpGain

  const [surahInfo, userGroups, sheikhInfo, memorizedRows] = await Promise.all([
    db.select({ nameFr: surahs.nameFr, nameAr: surahs.nameAr, number: surahs.number })
      .from(surahs).where(eq(surahs.id, surahId)).limit(1),
    db.select({ groupId: groupMembers.groupId })
      .from(groupMembers).where(eq(groupMembers.userId, userId)),
    db.select({ name: users.name })
      .from(users).where(eq(users.id, sheikhId)).limit(1),
    db.select({ surahId: memorizationProgress.surahId })
      .from(memorizationProgress)
      .where(and(
        eq(memorizationProgress.userId, userId),
        or(eq(memorizationProgress.status, 'memorized'), eq(memorizationProgress.status, 'consolidated')),
      )),
  ])

  const surah = surahInfo[0]
  if (!surah || userGroups.length === 0) return

  const memorizedIds = memorizedRows.map((r) => r.surahId)

  // Feed event surah_validated
  await Promise.all(userGroups.map((g) =>
    createFeedEvent({
      groupId: g.groupId, userId, type: 'surah_validated',
      content: { surahId, surahName: surah.nameFr, surahNameAr: surah.nameAr, surahNumber: surah.number, sheikhName: sheikhInfo[0]?.name ?? 'Sheikh' },
    })
  ))

  // Badges + niveau
  await awardBadgesAndCheckLevel(userId, userGroups, memorizedIds, xpBefore, xpAfter, streak)
}

/** GET /api/progress/group/:groupId — Vue agrégée du groupe */
progressRoutes.get('/group/:groupId', requireAuth, async (c) => {
  const groupId = c.req.param('groupId')

  const stats = await db
    .select({
      userId: users.id,
      name: users.name,
      avatar: users.avatar,
      memorized: sql<number>`COUNT(CASE WHEN ${memorizationProgress.status} = 'memorized' THEN 1 END)`,
      inProgress: sql<number>`COUNT(CASE WHEN ${memorizationProgress.status} = 'in_progress' THEN 1 END)`,
    })
    .from(users)
    .leftJoin(memorizationProgress, eq(memorizationProgress.userId, users.id))
    .groupBy(users.id, users.name, users.avatar)

  return c.json({ success: true, data: stats })
})

/** GET /api/progress/due/:userId — Sourates à réviser aujourd'hui (SM-2) */
progressRoutes.get('/due/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId')
  const now = new Date()

  const due = await db
    .select({
      id: memorizationProgress.id,
      surahId: memorizationProgress.surahId,
      nextReviewAt: memorizationProgress.nextReviewAt,
      retentionScore: memorizationProgress.retentionScore,
      surahNameAr: surahs.nameAr,
      surahNameFr: surahs.nameFr,
    })
    .from(memorizationProgress)
    .innerJoin(surahs, eq(surahs.id, memorizationProgress.surahId))
    .where(
      and(
        eq(memorizationProgress.userId, userId),
        sql`${memorizationProgress.nextReviewAt} <= ${now.toISOString()}`
      )
    )

  return c.json({ success: true, data: due })
})
