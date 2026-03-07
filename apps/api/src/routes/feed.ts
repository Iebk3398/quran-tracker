/**
 * @file Routes feed groupe — /api/feed
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db, groupFeed, users } from '@quran-tracker/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth'

export const feedRoutes = new Hono()

/** GET /api/feed/group/:groupId — Timeline du groupe */
feedRoutes.get('/group/:groupId', requireAuth, async (c) => {
  const groupId = c.req.param('groupId')
  const page = Number(c.req.query('page') ?? '1')
  const limit = 20

  const items = await db
    .select({
      id: groupFeed.id,
      type: groupFeed.type,
      content: groupFeed.content,
      reactions: groupFeed.reactions,
      createdAt: groupFeed.createdAt,
      userName: users.name,
      userAvatar: users.avatar,
      userId: users.id,
    })
    .from(groupFeed)
    .innerJoin(users, eq(groupFeed.userId, users.id))
    .where(eq(groupFeed.groupId, groupId))
    .orderBy(desc(groupFeed.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return c.json({ success: true, data: items })
})

/** POST /api/feed/:id/react — Ajouter une réaction */
feedRoutes.post(
  '/:id/react',
  requireAuth,
  zValidator('json', z.object({ reaction: z.enum(['mashallah', 'dua', 'fire', 'star']) })),
  async (c) => {
    const user = c.get('user')
    const feedId = c.req.param('id')
    const { reaction } = c.req.valid('json')

    const item = await db.select().from(groupFeed).where(eq(groupFeed.id, feedId)).limit(1)
    if (!item[0]) return c.json({ success: false, error: 'NOT_FOUND' }, 404)

    const reactions = JSON.parse(item[0].reactions) as Record<string, string[]>
    if (!reactions[reaction]) reactions[reaction] = []

    const idx = reactions[reaction]!.indexOf(user.id)
    if (idx > -1) {
      reactions[reaction]!.splice(idx, 1) // Toggle off
    } else {
      reactions[reaction]!.push(user.id)  // Toggle on
    }

    const updated = await db
      .update(groupFeed)
      .set({ reactions: JSON.stringify(reactions) })
      .where(eq(groupFeed.id, feedId))
      .returning()

    return c.json({ success: true, data: updated[0] })
  }
)

/**
 * Utilitaire: Créer un événement feed (appelé depuis d'autres routes)
 */
export async function createFeedEvent(params: {
  groupId: string
  userId: string
  type: typeof groupFeed.$inferInsert['type']
  content: Record<string, unknown>
}) {
  return db.insert(groupFeed).values({
    id: nanoid(),
    groupId: params.groupId,
    userId: params.userId,
    type: params.type,
    content: JSON.stringify(params.content),
    reactions: '{}',
  })
}
