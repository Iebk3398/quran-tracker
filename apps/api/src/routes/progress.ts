/**
 * @file Routes progression mémorisation — /api/progress
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db, memorizationProgress, surahs, users } from '../../../../packages/db/src/index.ts'
import { eq, and, sql } from 'drizzle-orm'
import { requireAuth, requireSheikh } from '../middleware/auth.ts'
import { calculateSM2 } from '../../../../packages/db/src/lib/spaced-repetition.ts'

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

  return c.json({ success: true, data: created[0] }, 201)
})

/** POST /api/progress/:id/validate — Validation sheikh */
progressRoutes.post('/:id/validate', requireSheikh, zValidator('json', validateSchema), async (c) => {
  const sheikh = c.get('user')
  const progressId = c.req.param('id')
  const { notes } = c.req.valid('json')

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

  return c.json({ success: true, data: updated[0] })
})

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
