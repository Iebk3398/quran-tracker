/**
 * @file Point d'entrée — API Hono.js
 * @description Serveur HTTP pour Quran Tracker
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env.local from monorepo root (apps/api/src → apps/api → apps → root)
const __apiDir = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))))
dotenv.config({ path: path.join(__apiDir, '../.env.local') })
dotenv.config({ path: path.join(__apiDir, '../.env') })

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { HTTPException } from 'hono/http-exception'
import { serve } from '@hono/node-server'

import { authRoutes } from './routes/auth.ts'
import { groupRoutes } from './routes/groups.ts'
import { progressRoutes } from './routes/progress.ts'
import { revisionRoutes } from './routes/revisions.ts'
import { feedRoutes } from './routes/feed.ts'
import { notificationRoutes } from './routes/notifications.ts'
import { surahRoutes } from './routes/surahs.ts'
import aiRoutes from './routes/ai.ts'

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

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🕌 Quran Tracker API running on http://localhost:${info.port}`)
})

export type AppType = typeof app
