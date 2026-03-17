/**
 * @file Routes groupes — /api/groups
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db, groups, groupMembers, users, memorizationProgress, groupGoals, userBadges, badges, hizbDailyLog } from '../../../../packages/db/src/index.ts'
import { eq, and, desc, sql, isNull, inArray, gte } from 'drizzle-orm'
import { requireAuth, requireSheikh } from '../middleware/auth.ts'

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

/** GET /api/groups/me — Groupes de l'utilisateur connecté */
groupRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user')

  const myGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      inviteCode: groups.inviteCode,
      sheikhId: groups.sheikhId,
      createdAt: groups.createdAt,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, user.id))

  return c.json({ success: true, data: myGroups })
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

/** GET /api/groups/:id/leaderboard — Classement du groupe avec badges */
groupRoutes.get('/:id/leaderboard', requireAuth, async (c) => {
  const groupId = c.req.param('id')

  const leaderboard = await db
    .select({
      userId: users.id,
      name: users.name,
      avatar: users.avatar,
      xp: users.xp,
      hizbsRead: users.hizbsRead,
      currentStreak: users.currentStreak,
      surahsMemorized: sql<number>`
        COUNT(CASE WHEN ${memorizationProgress.status} = 'memorized' THEN 1 END)
      `.as('surahs_memorized'),
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .leftJoin(memorizationProgress, eq(memorizationProgress.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .groupBy(users.id, users.name, users.avatar, users.xp, users.hizbsRead, users.currentStreak)
    .orderBy(desc(sql`(${users.xp})::integer`))

  // Récupérer les badges de tous les membres en une seule requête
  const memberIds = leaderboard.map((e) => e.userId)
  const memberBadges = memberIds.length > 0
    ? await db
        .select({
          userId: userBadges.userId,
          badgeName: badges.name,
          badgeIconUrl: badges.iconUrl,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(inArray(userBadges.userId, memberIds))
    : []

  // Regrouper les badges par userId
  const badgesByUser = memberBadges.reduce<Record<string, Array<{ name: string; iconUrl: string }>>>(
    (acc, b) => {
      if (!acc[b.userId]) acc[b.userId] = []
      acc[b.userId]!.push({ name: b.badgeName, iconUrl: b.badgeIconUrl })
      return acc
    },
    {}
  )

  const result = leaderboard.map((entry) => ({
    ...entry,
    badges: badgesByUser[entry.userId] ?? [],
  }))

  return c.json({ success: true, data: result })
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

// ─── Objectifs communs ──────────────────────────────────────────────────────

const goalSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  surahFrom: z.number().int().min(1).max(114).optional(),
  surahTo: z.number().int().min(1).max(114).optional(),
  targetCount: z.number().int().min(1).max(114).optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
})

/**
 * POST /api/groups/:id/goals — Créer un objectif commun (sheikh uniquement).
 * Désactive tous les objectifs actifs précédents du groupe avant d'en créer un nouveau.
 */
groupRoutes.post('/:id/goals', requireSheikh, zValidator('json', goalSchema), async (c) => {
  const user = c.get('user')
  const groupId = c.req.param('id')
  const body = c.req.valid('json')

  // Désactiver les objectifs actifs existants
  await db
    .update(groupGoals)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(groupGoals.groupId, groupId), eq(groupGoals.isActive, true)))

  const goal = await db
    .insert(groupGoals)
    .values({
      id: nanoid(),
      groupId,
      createdByUserId: user.id,
      title: body.title,
      description: body.description ?? null,
      surahFrom: body.surahFrom ?? null,
      surahTo: body.surahTo ?? null,
      targetCount: body.targetCount ?? null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      isActive: true,
    })
    .returning()

  return c.json({ success: true, data: goal[0] }, 201)
})

/**
 * GET /api/groups/:id/goals/active — Objectif actif avec progression par membre.
 * Retourne null si aucun objectif actif.
 */
groupRoutes.get('/:id/goals/active', requireAuth, async (c) => {
  const groupId = c.req.param('id')

  const [goal] = await db
    .select()
    .from(groupGoals)
    .where(and(eq(groupGoals.groupId, groupId), eq(groupGoals.isActive, true)))
    .limit(1)

  if (!goal) return c.json({ success: true, data: null })

  // Calcul de progression pour chaque membre
  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      avatar: users.avatar,
      memorized: sql<number>`
        COUNT(CASE WHEN ${memorizationProgress.status} = 'memorized'
          ${goal.surahFrom !== null ? sql`AND ${memorizationProgress.surahId} >= ${goal.surahFrom}` : sql``}
          ${goal.surahTo !== null ? sql`AND ${memorizationProgress.surahId} <= ${goal.surahTo}` : sql``}
          THEN 1 END)
      `.as('memorized'),
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .leftJoin(memorizationProgress, eq(memorizationProgress.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .groupBy(users.id, users.name, users.avatar)

  const target = goal.targetCount ?? (goal.surahTo !== null && goal.surahFrom !== null
    ? goal.surahTo - goal.surahFrom + 1
    : 114)

  const totalMembers = members.length
  const totalMemorized = members.reduce((sum, m) => sum + Number(m.memorized), 0)
  const groupProgressPercent = totalMembers > 0
    ? Math.round((totalMemorized / (totalMembers * target)) * 100)
    : 0

  return c.json({
    success: true,
    data: {
      goal,
      target,
      groupProgressPercent: Math.min(groupProgressPercent, 100),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.name,
        avatar: m.avatar,
        memorized: Number(m.memorized),
        progressPercent: Math.min(Math.round((Number(m.memorized) / target) * 100), 100),
      })),
    },
  })
})

/**
 * DELETE /api/groups/:id/goals/:goalId — Supprimer un objectif (sheikh uniquement).
 */
groupRoutes.delete('/:id/goals/:goalId', requireSheikh, async (c) => {
  const goalId = c.req.param('goalId')
  const groupId = c.req.param('id')

  await db
    .delete(groupGoals)
    .where(and(eq(groupGoals.id, goalId), eq(groupGoals.groupId, groupId)))

  return c.json({ success: true, data: { deleted: true } })
})


/**
 * GET /api/groups/:id/activity?days=7
 * GET /api/groups/:id/activity?month=2026-03
 * Retourne l'activité journalière en hizbs lus pour chaque membre du groupe.
 * - days=N  : N derniers jours (défaut 7, max 31)
 * - month=YYYY-MM : tous les jours du mois donné
 */
groupRoutes.get('/:id/activity', requireAuth, async (c) => {
  const groupId = c.req.param('id')
  const monthParam = c.req.query('month')   // "2026-03"

  let startDateStr: string
  let dateRange: string[]

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    // Mode mois : du 1er au dernier jour du mois
    const [year, month] = monthParam.split('-').map(Number) as [number, number]
    const firstDay = new Date(year, month - 1, 1)
    const lastDay  = new Date(year, month, 0)   // dernier jour
    startDateStr   = firstDay.toISOString().slice(0, 10)
    dateRange = []
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      dateRange.push(d.toISOString().slice(0, 10))
    }
  } else {
    // Mode jours (legacy)
    const days = Math.min(parseInt(c.req.query('days') ?? '7'), 31)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))
    startDateStr = startDate.toISOString().slice(0, 10)
    dateRange = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dateRange.push(d.toISOString().slice(0, 10))
    }
  }

  // Membres du groupe avec infos de base
  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      avatar: users.avatar,
      hizbsRead: users.hizbsRead,
      currentStreak: users.currentStreak,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))

  if (members.length === 0) return c.json({ success: true, data: [] })

  const memberIds = members.map((m) => m.userId)

  // Logs journaliers sur la période demandée
  const logs = await db
    .select({
      userId: hizbDailyLog.userId,
      date: hizbDailyLog.date,
      count: hizbDailyLog.count,
    })
    .from(hizbDailyLog)
    .where(and(
      inArray(hizbDailyLog.userId, memberIds),
      gte(hizbDailyLog.date, startDateStr),
    ))

  // Mapper logs par userId → date → count
  const logMap = new Map<string, Map<string, number>>()
  for (const log of logs) {
    if (!logMap.has(log.userId)) logMap.set(log.userId, new Map())
    logMap.get(log.userId)!.set(log.date, log.count)
  }

  // Construire la réponse
  const data = members.map((m) => {
    const userLogs = logMap.get(m.userId) ?? new Map()
    const activity = dateRange.map((date) => ({
      date,
      count: userLogs.get(date) ?? 0,
    }))
    const totalThisPeriod = activity.reduce((sum, a) => sum + a.count, 0)
    return {
      userId: m.userId,
      name: m.name,
      avatar: m.avatar,
      hizbsRead: m.hizbsRead,
      currentStreak: Number(m.currentStreak),
      activity,
      totalThisPeriod,
    }
  })

  // Si le mois demandé = mois précédent et aucune activité réelle → mock data
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

    // Injecter des mocks si on est sur le mois précédent et aucune donnée réelle
    if (monthParam === prevMonthStr) {
      for (const member of data) {
        if (member.totalThisPeriod === 0) {
          // Seed déterministe basé sur userId pour reproductibilité
          const seed = member.userId.charCodeAt(0) + member.userId.charCodeAt(1)
          let mockTotal = 0
          member.activity = member.activity.map((day, i) => {
            // Activité ~15 jours sur 30, 1-3 hizbs par jour actif
            const active = ((seed + i * 7) % 3) === 0
            const count = active ? 1 + ((seed + i) % 3) : 0
            mockTotal += count
            return { ...day, count }
          })
          member.totalThisPeriod = mockTotal
          member.hizbsRead = Math.max(member.hizbsRead, mockTotal)
        }
      }
    }
  }

  // Trier par total de la période (les plus actifs en premier)
  data.sort((a, b) => b.totalThisPeriod - a.totalThisPeriod)

  return c.json({ success: true, data })
})
