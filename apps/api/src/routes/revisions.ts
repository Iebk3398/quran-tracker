/**
 * @file Routes sessions de révision — /api/revisions
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db, revisionSessions, memorizationProgress } from '@quran-tracker/db'
import { eq, and, desc } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'
import { calculateSM2 } from '@quran-tracker/db/lib/spaced-repetition'

export const revisionRoutes = new Hono()

const createRevisionSchema = z.object({
  surahId: z.number().int().min(1).max(114),
  duration: z.number().int().min(1).max(300),
  quality: z.number().int().min(0).max(5),
  notes: z.string().max(500).optional(),
})

/** POST /api/revisions — Enregistrer une session de révision */
revisionRoutes.post('/', requireAuth, zValidator('json', createRevisionSchema), async (c) => {
  const user = c.get('user')
  const { surahId, duration, quality, notes } = c.req.valid('json')

  // Créer la session
  const session = await db
    .insert(revisionSessions)
    .values({ id: nanoid(), userId: user.id, surahId, duration, quality, notes: notes ?? null })
    .returning()

  // Mettre à jour SM-2 sur la progression
  const progress = await db
    .select()
    .from(memorizationProgress)
    .where(and(eq(memorizationProgress.userId, user.id), eq(memorizationProgress.surahId, surahId)))
    .limit(1)

  if (progress[0]) {
    const sm2 = calculateSM2({
      quality,
      repetitionCount: progress[0].repetitionCount,
      intervalDays: progress[0].intervalDays,
      retentionScore: progress[0].retentionScore,
    })

    await db
      .update(memorizationProgress)
      .set({
        retentionScore: sm2.nextRetentionScore,
        repetitionCount: sm2.nextRepetitionCount,
        intervalDays: sm2.nextIntervalDays,
        nextReviewAt: sm2.nextReviewAt,
        lastRevisedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(memorizationProgress.id, progress[0].id))
  }

  return c.json({ success: true, data: session[0] }, 201)
})

/** GET /api/revisions/history/:userId — Historique des révisions */
revisionRoutes.get('/history/:userId', requireAuth, async (c) => {
  const userId = c.req.param('userId')
  const history = await db
    .select()
    .from(revisionSessions)
    .where(eq(revisionSessions.userId, userId))
    .orderBy(desc(revisionSessions.createdAt))
    .limit(50)

  return c.json({ success: true, data: history })
})
