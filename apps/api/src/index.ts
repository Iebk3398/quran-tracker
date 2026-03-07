/**
 * @file Point d'entrée — API Hono.js
 * @description Serveur HTTP pour Quran Tracker
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { HTTPException } from 'hono/http-exception'

import { authRoutes } from './routes/auth'
import { groupRoutes } from './routes/groups'
import { progressRoutes } from './routes/progress'
import { revisionRoutes } from './routes/revisions'
import { feedRoutes } from './routes/feed'
import { notificationRoutes } from './routes/notifications'
import { surahRoutes } from './routes/surahs'
import aiRoutes from './routes/ai'

const app = new Hono()

// ─── Middlewares globaux ────────────────────────────────────
app.use('*', logger())
app.use('*', prettyJSON())
app.use(
  '/api/*',
  cors({
    origin: [
      process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
    ],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// ─── Health check ───────────────────────────────────────────
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'quran-tracker-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
)

// ─── Routes ────────────────────────────────────────────────
app.route('/api/auth', authRoutes)
app.route('/api/groups', groupRoutes)
app.route('/api/progress', progressRoutes)
app.route('/api/revisions', revisionRoutes)
app.route('/api/feed', feedRoutes)
app.route('/api/notifications', notificationRoutes)
app.route('/api/surahs', surahRoutes)
app.route('/api/ai', aiRoutes) // v2: Full AI features (GPT-4o, Whisper)

// ─── 404 handler ───────────────────────────────────────────
app.notFound((c) =>
  c.json({ success: false, error: 'NOT_FOUND', message: 'Route not found' }, 404)
)

// ─── Error handler ─────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      { success: false, error: 'HTTP_ERROR', message: err.message },
      err.status
    )
  }
  console.error('[API Error]', err)
  return c.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'Internal server error' },
    500
  )
})

const PORT = Number(process.env['PORT'] ?? 3001)
console.log(`🕌 Quran Tracker API running on http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
