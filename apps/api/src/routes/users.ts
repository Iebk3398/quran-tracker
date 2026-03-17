/**
 * @file Routes utilisateurs — /api/users
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, users, groupMembers, memorizationProgress, hizbDailyLog } from '../../../../packages/db/src/index.ts'
import { eq, sql, and, or } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { requireAuth } from '../middleware/auth.ts'
import { createFeedEvent } from './feed.ts'
import { getLevelIndex, LEVELS } from '../lib/levels.ts'

export const userRoutes = new Hono()

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().nullish(), // accepte toute chaîne ou null (pas de validation URL stricte)
  role: z.enum(['student', 'sheikh', 'parent']).optional(),
})

/** PATCH /api/users/me — Mettre à jour son profil */
userRoutes.patch('/me', requireAuth, zValidator('json', updateUserSchema), async (c) => {
  const user = c.get('user')
  const { name, avatar, role } = c.req.valid('json')

  const updated = await db
    .update(users)
    .set({
      ...(name !== undefined && { name }),
      ...(avatar !== undefined && { avatar }),
      ...(role !== undefined && { role }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning()

  return c.json({ success: true, data: updated[0] })
})

/** PUT /api/users/me/hizb — Synchroniser la position de lecture (MAX update, jamais en arrière) */
userRoutes.put(
  '/me/hizb',
  requireAuth,
  zValidator('json', z.object({ position: z.number().int().min(1).max(60) })),
  async (c) => {
    const user = c.get('user')
    const { position } = c.req.valid('json')

    const currentRow = await db
      .select({ xp: users.xp, hizbsRead: users.hizbsRead })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    const currentHizbsRead = currentRow[0]?.hizbsRead ?? 0
    const xpBefore         = parseInt(currentRow[0]?.xp ?? '0')

    // Position déjà atteinte ou dépassée — rien à faire
    if (position <= currentHizbsRead) {
      return c.json({ success: true, data: { hizbsRead: currentHizbsRead, xp: currentRow[0]?.xp ?? '0' } })
    }

    const delta      = position - currentHizbsRead
    const XP_PER_HIZB = 5
    const xpGain     = delta * XP_PER_HIZB

    const updated = await db
      .update(users)
      .set({
        hizbsRead: position,                                         // valeur absolue
        xp: sql`(${users.xp}::integer + ${xpGain})::text`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning({ hizbsRead: users.hizbsRead, xp: users.xp })

    const today = new Date().toISOString().slice(0, 10)
    await db.execute(sql`
      INSERT INTO hizb_daily_log (id, user_id, date, count, created_at, updated_at)
      VALUES (${nanoid()}, ${user.id}, ${today}, ${delta}, NOW(), NOW())
      ON CONFLICT (user_id, date)
      DO UPDATE SET count = hizb_daily_log.count + ${delta}, updated_at = NOW()
    `)

    handlePostHizbEvents(user.id, delta, position, xpBefore, xpBefore + xpGain).catch(() => {})

    return c.json({ success: true, data: { hizbsRead: position, xp: updated[0]?.xp ?? '0' } })
  }
)

/** POST /api/users/me/hizb — Enregistrer des hizbs lus (incrémente le compteur) */
userRoutes.post(
  '/me/hizb',
  requireAuth,
  zValidator('json', z.object({ count: z.number().int().min(1).max(60) })),
  async (c) => {
    const user = c.get('user')
    const { count } = c.req.valid('json')

    const XP_PER_HIZB = 5
    const xpGain = count * XP_PER_HIZB

    // Récupère l'état actuel pour le calcul du niveau
    const currentRow = await db
      .select({ xp: users.xp, hizbsRead: users.hizbsRead })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    const xpBefore = parseInt(currentRow[0]?.xp ?? '0')

    const updated = await db
      .update(users)
      .set({
        hizbsRead: sql`${users.hizbsRead} + ${count}`,
        xp: sql`(${users.xp}::integer + ${xpGain})::text`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning({ hizbsRead: users.hizbsRead, xp: users.xp })

    const newHizbsRead = updated[0]?.hizbsRead ?? 0
    const xpAfter      = xpBefore + xpGain

    // Log journalier — upsert (userId, date) avec addition du count
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    await db.execute(sql`
      INSERT INTO hizb_daily_log (id, user_id, date, count, created_at, updated_at)
      VALUES (${nanoid()}, ${user.id}, ${today}, ${count}, NOW(), NOW())
      ON CONFLICT (user_id, date)
      DO UPDATE SET count = hizb_daily_log.count + ${count}, updated_at = NOW()
    `)

    // Fire-and-forget : feed event hizb_read + level_up éventuel
    handlePostHizbEvents(user.id, count, newHizbsRead, xpBefore, xpAfter).catch(() => {})

    return c.json({ success: true, data: { hizbsRead: newHizbsRead, xp: updated[0]?.xp ?? '0' } })
  }
)

/**
 * Crée un feed event `milestone_reached (hizb_read)` dans tous les groupes
 * et vérifie si l'utilisateur monte de niveau.
 */
async function handlePostHizbEvents(
  userId: string,
  count: number,
  totalHizbsRead: number,
  xpBefore: number,
  xpAfter: number,
): Promise<void> {
  const userGroups = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId))

  if (userGroups.length === 0) return

  // Feed event hizb_read (milestone_reached avec discriminant)
  await Promise.all(userGroups.map((g) =>
    createFeedEvent({
      groupId: g.groupId,
      userId,
      type: 'milestone_reached',
      content: {
        type: 'hizb_read',
        count,
        totalHizbsRead,
      },
    })
  ))

  // Vérification de la montée de niveau — on récupère le nombre de sourates mémorisées
  const memorizedRows = await db
    .select({ surahId: memorizationProgress.surahId })
    .from(memorizationProgress)
    .where(and(
      eq(memorizationProgress.userId, userId),
      or(
        eq(memorizationProgress.status, 'memorized'),
        eq(memorizationProgress.status, 'consolidated'),
      ),
    ))

  const surahs = memorizedRows.length
  const levelBefore = getLevelIndex(xpBefore, surahs)
  const levelAfter  = getLevelIndex(xpAfter, surahs)

  if (levelAfter > levelBefore) {
    const newLevel = LEVELS[levelAfter]!
    await Promise.all(userGroups.map((g) =>
      createFeedEvent({
        groupId: g.groupId,
        userId,
        type: 'milestone_reached',
        content: { type: 'level_up', levelIndex: levelAfter, levelName: newLevel.name, levelEmoji: newLevel.emoji },
      })
    ))
  }
}

/** GET /api/users/me — Profil complet */
userRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user')

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!result[0]) return c.json({ success: false, message: 'User not found' }, 404)
  return c.json({ success: true, data: result[0] })
})
