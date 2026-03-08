/**
 * @file Routes sourates — GET /api/surahs
 */
import { Hono } from 'hono'
import { db, surahs } from '../../../../packages/db/src/index.ts'
import { asc, eq } from 'drizzle-orm'

export const surahRoutes = new Hono()

/** GET /api/surahs — Liste des 114 sourates */
surahRoutes.get('/', async (c) => {
  const allSurahs = await db.select().from(surahs).orderBy(asc(surahs.number))
  return c.json({ success: true, data: allSurahs })
})

/** GET /api/surahs/:id — Détail d'une sourate */
surahRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const surah = await db.select().from(surahs).where(eq(surahs.id, id)).limit(1)
  if (!surah[0]) return c.json({ success: false, error: 'NOT_FOUND' }, 404)
  return c.json({ success: true, data: surah[0] })
})
