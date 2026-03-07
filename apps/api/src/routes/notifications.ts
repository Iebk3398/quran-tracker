/**
 * @file Routes notifications — /api/notifications
 */
import { Hono } from 'hono'
import { db, notifications } from '@quran-tracker/db'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'

export const notificationRoutes = new Hono()

/** GET /api/notifications — Notifications de l'utilisateur */
notificationRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .limit(50)

  return c.json({ success: true, data: items })
})

/** GET /api/notifications/unread-count — Compteur non-lues */
notificationRoutes.get('/unread-count', requireAuth, async (c) => {
  const user = c.get('user')
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))

  return c.json({ success: true, data: { count: result[0]?.count ?? 0 } })
})

/** PATCH /api/notifications/:id/read — Marquer comme lue */
notificationRoutes.patch('/:id/read', requireAuth, async (c) => {
  const notifId = c.req.param('id')
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, notifId))

  return c.json({ success: true, data: { read: true } })
})

/** PATCH /api/notifications/read-all — Tout marquer comme lu */
notificationRoutes.patch('/read-all', requireAuth, async (c) => {
  const user = c.get('user')
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))

  return c.json({ success: true, data: { allRead: true } })
})
