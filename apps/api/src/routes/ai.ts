/**
 * @file Routes IA — Suggestions de révision et analyse
 * @description Intégration OpenAI GPT-4o pour les recommandations personnalisées
 *
 * ⚠️  PROCHAINE VERSION (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Ce module est préparé architecturalement mais sera pleinement développé
 * dans la prochaine version (v2.0).
 *
 * Fonctionnalités prévues :
 * - Suggestions de révision personnalisées via GPT-4o
 * - Assistant conversationnel (motivation, planification, Q&A)
 * - Analyse des patterns de mémorisation
 * - Validation vocale via Whisper API (Speech-to-Text)
 * - Plan de révision quotidien intelligent
 *
 * Pour l'instant, les routes retournent des données statiques/simulées.
 * Remplacer les TODO par les vraies appels OpenAI en v2.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../../../../packages/db/src/index.ts'
import {
  memorizationProgress,
  revisionSessions,
  surahs,
} from '../../../../packages/db/src/schema/index.ts'
import { eq, desc, gte } from 'drizzle-orm'
import { requireAuth } from '../middleware/auth.ts'
import type { Variables } from '../index.ts'

const ai = new Hono<{ Variables: Variables }>()

// ─── Schémas ──────────────────────────────────────────────────────────────────

const suggestionsSchema = z.object({
  userId: z.string(),
  limit: z.coerce.number().min(1).max(10).default(5),
})

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  context: z.enum(['revision', 'motivation', 'schedule', 'general']).default('general'),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/ai/suggestions/:userId
 * Génère des suggestions de révision personnalisées basées sur SM-2
 */
ai.get(
  '/suggestions/:userId',
  requireAuth,
  zValidator('query', suggestionsSchema.pick({ limit: true })),
  async (c) => {
    const { userId } = c.req.param()
    const { limit } = c.req.valid('query')

    try {
      // Récupérer les progrès de l'utilisateur
      const progressList = await db
        .select({
          surahId: memorizationProgress.surahId,
          status: memorizationProgress.status,
          retentionScore: memorizationProgress.retentionScore,
          nextReviewAt: memorizationProgress.nextReviewAt,
          lastRevisedAt: memorizationProgress.lastRevisedAt,
          repetitionCount: memorizationProgress.repetitionCount,
          surahNameAr: surahs.nameAr,
          surahNameFr: surahs.nameFr,
          surahNumber: surahs.number,
          versesCount: surahs.versesCount,
        })
        .from(memorizationProgress)
        .leftJoin(surahs, eq(memorizationProgress.surahId, surahs.id))
        .where(eq(memorizationProgress.userId, userId))
        .orderBy(desc(memorizationProgress.nextReviewAt))
        .limit(20)

      // Récupérer les sessions récentes (7 derniers jours)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const recentSessions = await db
        .select({
          surahId: revisionSessions.surahId,
          quality: revisionSessions.quality,
          duration: revisionSessions.duration,
          createdAt: revisionSessions.createdAt,
        })
        .from(revisionSessions)
        .where(
          eq(revisionSessions.userId, userId),
        )
        .orderBy(desc(revisionSessions.createdAt))
        .limit(10)

      // TODO (v2): Appel OpenAI GPT-4o pour suggestions intelligentes
      // Pour l'instant, génère des suggestions basées sur les données SM-2 uniquement

      const dueItems = progressList
        .filter((p) => p.nextReviewAt && new Date(p.nextReviewAt) <= new Date())
        .slice(0, limit)

      const suggestions = dueItems.map((item, index) => ({
        surahId: item.surahId,
        surahName: item.surahNameFr ?? item.surahNameAr ?? 'Sourate inconnue',
        priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
        reason:
          (item.retentionScore ?? 5) < 3
            ? 'Score de rétention faible — révision urgente recommandée'
            : 'Révision due selon le programme SM-2',
        estimatedMinutes: 10,
      }))

      return c.json({
        success: true,
        data: suggestions,
        notice: 'Suggestions basiques (v1). Suggestions IA GPT-4o disponibles en v2.',
      })
    } catch (error) {
      console.error('AI suggestions error:', error)
      return c.json({ error: 'Erreur interne' }, 500)
    }
  }
)

/**
 * POST /api/ai/chat
 * Chat avec l'assistant Coran (motivationnel, planification, questions générales)
 */
ai.post(
  '/chat',
  requireAuth,
  zValidator('json', chatSchema),
  async (c) => {
    const { message, context } = c.req.valid('json')

    try {
      // TODO (v2): Intégrer OpenAI GPT-4o pour un vrai assistant conversationnel
      // Contextes prévus : revision, motivation, schedule, general
      // Modèle : gpt-4o avec system prompt spécialisé Hifz
      void context // Utilisé en v2

      return c.json({
        success: false,
        notice: 'L\'assistant IA sera disponible en v2. Fonctionnalité en cours de développement.',
        data: null,
      }, 501)
    } catch (error) {
      console.error('AI chat error:', error)
      return c.json({ error: 'Erreur interne' }, 500)
    }
  }
)

/**
 * GET /api/ai/daily-plan/:userId
 * Génère un plan de révision quotidien personnalisé
 */
ai.get('/daily-plan/:userId', requireAuth, async (c) => {
  const { userId } = c.req.param()

  try {
    // Récupérer les sourates dues pour aujourd'hui
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const dueItems = await db
      .select({
        surahId: memorizationProgress.surahId,
        status: memorizationProgress.status,
        retentionScore: memorizationProgress.retentionScore,
        intervalDays: memorizationProgress.intervalDays,
        nextReviewAt: memorizationProgress.nextReviewAt,
        surahNameFr: surahs.nameFr,
        surahNameAr: surahs.nameAr,
        versesCount: surahs.versesCount,
      })
      .from(memorizationProgress)
      .leftJoin(surahs, eq(memorizationProgress.surahId, surahs.id))
      .where(eq(memorizationProgress.userId, userId))
      .orderBy(memorizationProgress.nextReviewAt)
      .limit(10)

    const dueForToday = dueItems.filter(
      (item) => item.nextReviewAt && new Date(item.nextReviewAt) <= today
    )

    // Construire le plan quotidien
    const plan = {
      date: today.toISOString().split('T')[0],
      estimatedTotalMinutes: dueForToday.reduce(
        (sum, item) => sum + Math.ceil((item.versesCount ?? 10) / 5),
        0
      ),
      sessions: dueForToday.map((item, index) => ({
        order: index + 1,
        surahId: item.surahId,
        surahNameFr: item.surahNameFr,
        surahNameAr: item.surahNameAr,
        type: (item.retentionScore ?? 5) < 3 ? 'intensive' : 'regular',
        estimatedMinutes: Math.ceil((item.versesCount ?? 10) / 5),
        priority: index < 3 ? 'high' : 'normal',
      })),
      motivationalNote: dueForToday.length === 0
        ? 'Aucune révision due aujourd\'hui. Excellent travail !'
        : `${dueForToday.length} sourate(s) à réviser aujourd'hui. Bonne chance !`,
    }

    return c.json({ success: true, data: plan })
  } catch (error) {
    console.error('Daily plan error:', error)
    return c.json({ error: 'Erreur interne' }, 500)
  }
})

export default ai
