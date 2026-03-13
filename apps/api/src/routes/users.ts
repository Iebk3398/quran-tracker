/**
 * @file Routes utilisateurs — /api/users
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, users } from '../../../../packages/db/src/index.ts'
import { eq, sql } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.ts'

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

/** POST /api/users/me/hizb — Enregistrer des hizbs lus (incrémente le compteur) */
userRoutes.post(
  '/me/hizb',
  requireAuth,
  zValidator('json', z.object({ count: z.number().int().min(1).max(60) })),
  async (c) => {
    const user = c.get('user')
    const { count } = c.req.valid('json')

    const updated = await db
      .update(users)
      .set({
        hizbsRead: sql`${users.hizbsRead} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning({ hizbsRead: users.hizbsRead })

    return c.json({ success: true, data: { hizbsRead: updated[0]?.hizbsRead ?? 0 } })
  }
)

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
