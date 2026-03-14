/**
 * @file Routes progression mémorisation — /api/progress
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db, memorizationProgress, surahs, users, groupMembers } from '../../../../packages/db/src/index.ts'
import { eq, and, sql } from 'drizzle-orm'
import { requireAuth, requireSheikh } from '../middleware/auth.ts'
import { calculateSM2 } from '../../../../packages/db/src/lib/spaced-repetition.ts'
import { createFeedEvent } from './feed.ts'

export const progressRoutes = new Hono()

const updateProgressSchema = z.object({
  surahId: z.number().int().min(1).max(114),
  status: z.enum(['not_started', 'in_progress', 'memorized']),
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
      // Destructure out surahId to avoid TS2783 (duplicate key in spread)
      const { surahId: _sid, ...rest } = entry
      return { surahId, ...rest }
    }
    return {
      surahId,
      status: 'not_started' as const,
      retentionScore: 2.5,
      repetitionCount: 0,
    }
  })

  return c.json({ success: true, data: fullProgress })
})

/** POST /api/progress — Enregistrer ou mettre à jour la progression */
progressRoutes.post('/', requireAuth, zValidator('json', updateProgressSchema), async (c) => {
  const user = c.get('user')
  const { surahId, status, verseFrom, verseTo, markForReview } = c.req.valid('json')

  const existing = await db
    .select()
    .from(memorizationProgress)
    .where(and(eq(memorizationProgress.userId, user.id), eq(memorizationProgress.surahId, surahId)))
    .limit(1)

  const wasMemorized = existing[0]?.status === 'memorized'
  const becomesMemorized = status === 'memorized' && !wasMemorized

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

    // Créer un événement feed si la sourate vient d'être mémorisée
    if (becomesMemorized) {
      await createFeedEventForMemorized(user.id, surahId).catch(() => {})
    }

    return c.json({ success: true, data: updated[0] })
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

  // Créer un événement feed si la sourate est directement marquée comme mémorisée
  if (becomesMemorized) {
    await createFeedEventForMemorized(user.id, surahId).catch(() => {})
  }

  return c.json({ success: true, data: created[0] }, 201)
})

/**
 * Crée un événement feed `surah_memorized` dans tous les groupes de l'utilisateur.
 * Fire-and-forget : les erreurs ne bloquent pas la réponse principale.
 */
async function createFeedEventForMemorized(userId: string, surahId: number) {
  const [surahInfo, userGroups] = await Promise.all([
    db.select({ nameFr: surahs.nameFr, nameAr: surahs.nameAr, number: surahs.number })
      .from(surahs)
      .where(eq(surahs.id, surahId))
      .limit(1),
    db.select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId)),
  ])

  const surah = surahInfo[0]
  if (!surah || userGroups.length === 0) return

  await Promise.all(
    userGroups.map((g) =>
      createFeedEvent({
        groupId: g.groupId,
        userId,
        type: 'surah_memorized',
        content: {
          surahId,
          surahName: surah.nameFr,
          surahNameAr: surah.nameAr,
          surahNumber: surah.number,
        },
      })
    )
  )
}

/** POST /api/progress/:id/validate — Validation sheikh */
progressRoutes.post('/:id/validate', requireSheikh, zValidator('json', validateSchema), async (c) => {
  const sheikh = c.get('user')
  const progressId = c.req.param('id')
  const { notes } = c.req.valid('json')

  // Lire la progression avant mise à jour pour connaître userId et surahId
  const before = await db
    .select({ userId: memorizationProgress.userId, surahId: memorizationProgress.surahId })
    .from(memorizationProgress)
    .where(eq(memorizationProgress.id, progressId))
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

  // Créer un événement feed de validation sheikh
  if (before[0]) {
    await createFeedEventForValidated(before[0].userId, before[0].surahId, sheikh.id).catch(() => {})
  }

  return c.json({ success: true, data: updated[0] })
})

/**
 * Crée un événement feed `surah_validated` dans tous les groupes de l'utilisateur.
 */
async function createFeedEventForValidated(userId: string, surahId: number, sheikhId: string) {
  const [surahInfo, userGroups, sheikhInfo] = await Promise.all([
    db.select({ nameFr: surahs.nameFr, nameAr: surahs.nameAr, number: surahs.number })
      .from(surahs)
      .where(eq(surahs.id, surahId))
      .limit(1),
    db.select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId)),
    db.select({ name: users.name })
      .from(users)
      .where(eq(users.id, sheikhId))
      .limit(1),
  ])

  const surah = surahInfo[0]
  if (!surah || userGroups.length === 0) return

  await Promise.all(
    userGroups.map((g) =>
      createFeedEvent({
        groupId: g.groupId,
        userId,
        type: 'surah_validated',
        content: {
          surahId,
          surahName: surah.nameFr,
          surahNameAr: surah.nameAr,
          surahNumber: surah.number,
          sheikhName: sheikhInfo[0]?.name ?? 'Sheikh',
        },
      })
    )
  )
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
