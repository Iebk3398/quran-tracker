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

/** POST /api/users/me/hizb — Enregistrer ou corriger des hizbs lus (+ ou −) */
userRoutes.post(
  '/me/hizb',
  requireAuth,
  // count peut être négatif (correction) — jamais 0, jamais hors [-60, 60]
  zValidator('json', z.object({ count: z.number().int().min(-60).max(60).refine((n) => n !== 0, { message: 'count ne peut pas être 0' }) })),
  async (c) => {
    const user = c.get('user')
    const { count } = c.req.valid('json')

    const XP_PER_HIZB = 5

    // Récupère l'état actuel pour le calcul du niveau
    const currentRow = await db
      .select({ xp: users.xp, hizbsRead: users.hizbsRead })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    const currentHizbsRead = currentRow[0]?.hizbsRead ?? 0
    const xpBefore         = parseInt(currentRow[0]?.xp ?? '0')

    // Valeur finale clampée entre 0 et 60
    const newHizbsRead = Math.max(0, Math.min(60, currentHizbsRead + count))
    const effectiveDelta = newHizbsRead - currentHizbsRead  // 0 si déjà au min/max
    const xpGain = Math.max(0, effectiveDelta * XP_PER_HIZB)  // XP seulement si gain

    const updated = await db
      .update(users)
      .set({
        hizbsRead: newHizbsRead,
        xp: sql`(${users.xp}::integer + ${xpGain})::text`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning({ hizbsRead: users.hizbsRead, xp: users.xp })

    // Log journalier — seulement si delta effectif positif
    if (effectiveDelta > 0) {
      const today = new Date().toISOString().slice(0, 10)
      await db.execute(sql`
        INSERT INTO hizb_daily_log (id, user_id, date, count, created_at, updated_at)
        VALUES (${nanoid()}, ${user.id}, ${today}, ${effectiveDelta}, NOW(), NOW())
        ON CONFLICT (user_id, date)
        DO UPDATE SET count = hizb_daily_log.count + ${effectiveDelta}, updated_at = NOW()
      `)
      handlePostHizbEvents(user.id, effectiveDelta, newHizbsRead, xpBefore, xpBefore + xpGain).catch(() => {})
    }

    return c.json({ success: true, data: { hizbsRead: newHizbsRead, xp: updated[0]?.xp ?? '0' } })
  }
)

/**
 * PUT /api/users/me/hizb — Synchroniser la position absolue de lecture.
 * Met à jour hizbsRead seulement si position > valeur actuelle (jamais en arrière).
 * Stocke également la page du mushaf pour l'affichage dans le classement groupe.
 */
userRoutes.put(
  '/me/hizb',
  requireAuth,
  zValidator('json', z.object({
    position: z.number().int().min(1).max(60),
    page: z.number().int().min(1).max(604).optional(),
  })),
  async (c) => {
    const user = c.get('user')
    const { position, page } = c.req.valid('json')

    const current = await db
      .select({ hizbsRead: users.hizbsRead })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    const currentHizbs = current[0]?.hizbsRead ?? 0

    // ── Position cyclique actuelle (1-60), 0 si jamais lu ──────────────────
    const currentCyclical = currentHizbs <= 0
      ? 0
      : ((currentHizbs - 1) % 60) + 1

    // ── Khatam index 0-based ────────────────────────────────────────────────
    const currentKhatam = currentHizbs <= 0
      ? 0
      : Math.floor((currentHizbs - 1) / 60)

    // ── Calcul de la nouvelle valeur absolue ────────────────────────────────
    // Règles :
    //  1. Première lecture : position directe
    //  2. Avance dans le khatam courant : position > currentCyclical
    //  3. Nouveau khatam : on était exactement au hizb 60 (fin de khatam)
    //     et la nouvelle position repart de 1-N → incrémenter le khatam
    //  4. Retour en arrière en cours de khatam → refusé (ne pas reculer)
    let newHizbsRead: number | null = null

    if (currentHizbs <= 0) {
      newHizbsRead = position
    } else if (position > currentCyclical) {
      // Avance dans le même khatam
      newHizbsRead = currentKhatam * 60 + position
    } else if (position < currentCyclical && currentCyclical === 60) {
      // Khatam terminé → démarrage du suivant (le compteur passe ex: 60→61)
      newHizbsRead = (currentKhatam + 1) * 60 + position
    }
    // Sinon : position en arrière en cours de khatam → ne pas reculer

    if (newHizbsRead === null) {
      // Pas d'avance : met à jour la page seulement
      if (page !== undefined) {
        await db.update(users).set({ currentReadingPage: page, updatedAt: new Date() }).where(eq(users.id, user.id))
      }
      return c.json({ success: true, data: { hizbsRead: currentHizbs } })
    }

    const updated = await db
      .update(users)
      .set({ hizbsRead: newHizbsRead, updatedAt: new Date(), ...(page !== undefined ? { currentReadingPage: page } : {}) })
      .where(eq(users.id, user.id))
      .returning({ hizbsRead: users.hizbsRead })

    return c.json({ success: true, data: { hizbsRead: updated[0]?.hizbsRead ?? 0 } })
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
