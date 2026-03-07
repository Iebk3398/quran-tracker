/**
 * @file Routes groupes — /api/groups
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db, groups, groupMembers, users, memorizationProgress } from '@quran-tracker/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { requireAuth, requireSheikh } from '../middleware/auth'

export const groupRoutes = new Hono()

const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
})

/** POST /api/groups — Créer un groupe (sheikh requis) */
groupRoutes.post('/', requireSheikh, zValidator('json', createGroupSchema), async (c) => {
  const user = c.get('user')
  const { name, description } = c.req.valid('json')

  const group = await db
    .insert(groups)
    .values({
      id: nanoid(),
      name,
      description: description ?? null,
      sheikhId: user.id,
      inviteCode: nanoid(8).toUpperCase(),
    })
    .returning()

  // Ajouter le sheikh comme membre
  await db.insert(groupMembers).values({
    userId: user.id,
    groupId: group[0]!.id,
    role: 'sheikh',
  })

  return c.json({ success: true, data: group[0] }, 201)
})

/** GET /api/groups/:id — Détails du groupe */
groupRoutes.get('/:id', requireAuth, async (c) => {
  const groupId = c.req.param('id')
  const group = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1)
  if (!group[0]) return c.json({ success: false, error: 'NOT_FOUND' }, 404)
  return c.json({ success: true, data: group[0] })
})

/** POST /api/groups/join — Rejoindre avec code d'invitation */
groupRoutes.post(
  '/join',
  requireAuth,
  zValidator('json', z.object({ inviteCode: z.string().min(6).max(12) })),
  async (c) => {
    const user = c.get('user')
    const { inviteCode } = c.req.valid('json')

    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode.toUpperCase()))
      .limit(1)

    if (!group[0]) {
      return c.json({ success: false, error: 'INVALID_CODE', message: 'Code invalide' }, 404)
    }

    // Vérifier si déjà membre
    const existing = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, user.id), eq(groupMembers.groupId, group[0].id)))
      .limit(1)

    if (existing[0]) {
      return c.json({ success: false, error: 'ALREADY_MEMBER' }, 409)
    }

    await db.insert(groupMembers).values({
      userId: user.id,
      groupId: group[0].id,
      role: 'student',
    })

    return c.json({ success: true, data: group[0] }, 201)
  }
)

/** GET /api/groups/:id/members — Liste des membres */
groupRoutes.get('/:id/members', requireAuth, async (c) => {
  const groupId = c.req.param('id')

  const members = await db
    .select({
      userId: groupMembers.userId,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))

  return c.json({ success: true, data: members })
})

/** GET /api/groups/:id/leaderboard — Classement du groupe */
groupRoutes.get('/:id/leaderboard', requireAuth, async (c) => {
  const groupId = c.req.param('id')

  const leaderboard = await db
    .select({
      userId: users.id,
      name: users.name,
      avatar: users.avatar,
      xp: users.xp,
      currentStreak: users.currentStreak,
      surahsMemorized: sql<number>`
        COUNT(CASE WHEN ${memorizationProgress.status} IN ('memorized', 'consolidated') THEN 1 END)
      `.as('surahs_memorized'),
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .leftJoin(memorizationProgress, eq(memorizationProgress.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .groupBy(users.id, users.name, users.avatar, users.xp, users.currentStreak)
    .orderBy(desc(sql`surahs_memorized`))

  return c.json({ success: true, data: leaderboard })
})

/** DELETE /api/groups/:id/members/:userId — Retirer un membre */
groupRoutes.delete('/:id/members/:userId', requireSheikh, async (c) => {
  const groupId = c.req.param('id')
  const targetUserId = c.req.param('userId')

  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.userId, targetUserId), eq(groupMembers.groupId, groupId)))

  return c.json({ success: true, data: { removed: true } })
})
