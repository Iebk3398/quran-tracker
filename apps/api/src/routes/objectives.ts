/**
 * @file Routes objectifs partagés — /api/objectives
 * @description CRUD complet pour les objectifs de mémorisation partagés
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  db,
  objectives,
  objectiveParticipants,
  memorizationProgress,
  users,
  groupMembers,
} from '../../../../packages/db/src/index.ts'
import { eq, and, inArray, or, sql } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.ts'

/** Routes pour les objectifs partagés de mémorisation */
export const objectiveRoutes = new Hono()

const createObjectiveSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  groupId: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  surahIds: z
    .array(z.number().int().min(1).max(114))
    .min(1)
    .max(114),
})

const joinLeaveSchema = z.object({})

/** GET /api/objectives — Liste des objectifs de l'utilisateur (créateur ou participant) */
objectiveRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user')

  // Objectifs créés par l'user OU auxquels il participe
  const participatingIds = await db
    .select({ objectiveId: objectiveParticipants.objectiveId })
    .from(objectiveParticipants)
    .where(eq(objectiveParticipants.userId, user.id))

  const pIds = participatingIds.map((p) => p.objectiveId)

  const allObjectives = pIds.length > 0
    ? await db
        .select()
        .from(objectives)
        .where(
          or(
            eq(objectives.createdBy, user.id),
            inArray(objectives.id, pIds)
          )
        )
        .orderBy(objectives.createdAt)
    : await db
        .select()
        .from(objectives)
        .where(eq(objectives.createdBy, user.id))
        .orderBy(objectives.createdAt)

  // Pour chaque objectif, récupérer le nombre de participants
  const result = await Promise.all(
    allObjectives.map(async (obj) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(objectiveParticipants)
        .where(eq(objectiveParticipants.objectiveId, obj.id))

      const surahList = JSON.parse(obj.surahIds) as number[]
      const isParticipant = pIds.includes(obj.id) || obj.createdBy === user.id

      return {
        ...obj,
        surahIds: surahList,
        participantCount: count,
        isParticipant,
      }
    })
  )

  return c.json({ success: true, data: result })
})

/** POST /api/objectives — Créer un objectif */
objectiveRoutes.post(
  '/',
  requireAuth,
  zValidator('json', createObjectiveSchema),
  async (c) => {
    const user = c.get('user')
    const { title, description, groupId, targetDate, surahIds } = c.req.valid('json')

    // Vérifier l'appartenance au groupe si groupId fourni
    if (groupId) {
      const membership = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.userId, user.id), eq(groupMembers.groupId, groupId)))
        .limit(1)

      if (!membership[0]) {
        return c.json(
          { success: false, error: 'FORBIDDEN', message: "Vous n'êtes pas membre de ce groupe" },
          403
        )
      }
    }

    const [newObjective] = await db
      .insert(objectives)
      .values({
        title,
        description: description ?? null,
        groupId: groupId ?? null,
        createdBy: user.id,
        targetDate: targetDate ? new Date(targetDate) : null,
        surahIds: JSON.stringify(surahIds),
      })
      .returning()

    if (!newObjective) {
      return c.json({ success: false, error: 'INSERT_FAILED', message: 'Échec de la création' }, 500)
    }

    // Le créateur rejoint automatiquement son objectif
    await db
      .insert(objectiveParticipants)
      .values({ objectiveId: newObjective.id, userId: user.id })
      .onConflictDoNothing()

    return c.json(
      {
        success: true,
        data: { ...newObjective, surahIds, participantCount: 1, isParticipant: true },
      },
      201
    )
  }
)

/** GET /api/objectives/:id — Détails + participants + progression */
objectiveRoutes.get('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const objectiveId = c.req.param('id')

  const [objective] = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, objectiveId))
    .limit(1)

  if (!objective) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Objectif introuvable' }, 404)
  }

  const surahList = JSON.parse(objective.surahIds) as number[]

  // Récupérer les participants avec infos utilisateur
  const participants = await db
    .select({
      userId: objectiveParticipants.userId,
      joinedAt: objectiveParticipants.joinedAt,
      name: users.name,
      email: users.email,
      avatar: users.image,
    })
    .from(objectiveParticipants)
    .innerJoin(users, eq(objectiveParticipants.userId, users.id))
    .where(eq(objectiveParticipants.objectiveId, objectiveId))

  // Pour chaque participant, calculer sa progression sur les sourates de l'objectif
  const participantsWithProgress = await Promise.all(
    participants.map(async (p) => {
      if (surahList.length === 0) {
        return { ...p, memorizedCount: 0, progressPercent: 0 }
      }

      const memorized = await db
        .select({ surahId: memorizationProgress.surahId })
        .from(memorizationProgress)
        .where(
          and(
            eq(memorizationProgress.userId, p.userId),
            eq(memorizationProgress.status, 'memorized'),
            inArray(memorizationProgress.surahId, surahList)
          )
        )

      const memorizedCount = memorized.length
      const progressPercent =
        surahList.length > 0
          ? Math.round((memorizedCount / surahList.length) * 100)
          : 0

      return { ...p, memorizedCount, progressPercent }
    })
  )

  // Vérifier si l'utilisateur courant est participant
  const isParticipant = participants.some((p) => p.userId === user.id)

  return c.json({
    success: true,
    data: {
      ...objective,
      surahIds: surahList,
      participants: participantsWithProgress,
      isParticipant,
    },
  })
})

/** POST /api/objectives/:id/join — Rejoindre un objectif */
objectiveRoutes.post('/:id/join', requireAuth, zValidator('json', joinLeaveSchema), async (c) => {
  const user = c.get('user')
  const objectiveId = c.req.param('id')

  const [objective] = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, objectiveId))
    .limit(1)

  if (!objective) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Objectif introuvable' }, 404)
  }

  // Si l'objectif est lié à un groupe, vérifier l'appartenance
  if (objective.groupId) {
    const membership = await db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.userId, user.id), eq(groupMembers.groupId, objective.groupId))
      )
      .limit(1)

    if (!membership[0]) {
      return c.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: "Vous devez être membre du groupe pour rejoindre cet objectif",
        },
        403
      )
    }
  }

  await db
    .insert(objectiveParticipants)
    .values({ objectiveId, userId: user.id })
    .onConflictDoNothing()

  return c.json({ success: true, data: { joined: true } })
})

/** DELETE /api/objectives/:id/leave — Quitter un objectif */
objectiveRoutes.delete('/:id/leave', requireAuth, async (c) => {
  const user = c.get('user')
  const objectiveId = c.req.param('id')

  const [objective] = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, objectiveId))
    .limit(1)

  if (!objective) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Objectif introuvable' }, 404)
  }

  // Le créateur ne peut pas quitter son propre objectif (doit le supprimer)
  if (objective.createdBy === user.id) {
    return c.json(
      {
        success: false,
        error: 'FORBIDDEN',
        message: 'Le créateur ne peut pas quitter son objectif. Supprimez-le à la place.',
      },
      403
    )
  }

  await db
    .delete(objectiveParticipants)
    .where(
      and(
        eq(objectiveParticipants.objectiveId, objectiveId),
        eq(objectiveParticipants.userId, user.id)
      )
    )

  return c.json({ success: true, data: { left: true } })
})

/** DELETE /api/objectives/:id — Supprimer un objectif (créateur uniquement) */
objectiveRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const objectiveId = c.req.param('id')

  const [objective] = await db
    .select()
    .from(objectives)
    .where(eq(objectives.id, objectiveId))
    .limit(1)

  if (!objective) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Objectif introuvable' }, 404)
  }

  if (objective.createdBy !== user.id) {
    return c.json(
      { success: false, error: 'FORBIDDEN', message: 'Seul le créateur peut supprimer cet objectif' },
      403
    )
  }

  // La suppression en cascade supprime aussi les participants (FK onDelete: cascade)
  await db.delete(objectives).where(eq(objectives.id, objectiveId))

  return c.json({ success: true, data: { deleted: true } })
})
