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

import { auth } from './lib/auth.ts'
import { groupRoutes } from './routes/groups.ts'
import { progressRoutes } from './routes/progress.ts'
import { revisionRoutes } from './routes/revisions.ts'
import { feedRoutes } from './routes/feed.ts'
import { notificationRoutes } from './routes/notifications.ts'
import { surahRoutes } from './routes/surahs.ts'
import aiRoutes from './routes/ai.ts'
import { userRoutes } from './routes/users.ts'

const app = new Hono()

// ─── Middlewares globaux ────────────────────────────────────
app.use('*', logger())
app.use('*', prettyJSON())
const allowedOrigins = [
  process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  'http://localhost:3000',
]

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0]!
      if (allowedOrigins.includes(origin)) return origin
      // Allow all Vercel preview deployments
      if (origin.endsWith('.vercel.app')) return origin
      return allowedOrigins[0]!
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// ─── Root — absorbe les redirects d'erreur Better Auth ──────
// Better Auth redirige vers BETTER_AUTH_URL/?error=... en cas d'échec OAuth.
// Sans cette route, le navigateur reçoit un 404 Hono.
// On redirige vers le frontend avec l'erreur dans l'URL.
app.get('/', (c) => {
  const error = c.req.query('error')
  const appURL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://quran-tracker-web.vercel.app').trim()
  if (error) {
    return c.redirect(`${appURL}/login?error=${encodeURIComponent(error)}`, 302)
  }
  return c.json({ status: 'ok', service: 'quran-tracker-api', version: '1.0.0' })
})

// ─── Health check ───────────────────────────────────────────
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'quran-tracker-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
)

// ─── Google OAuth redirect (server-side initiation) ─────────
// Le frontend fait window.location.href vers cet endpoint (GET, même domaine que l'API).
// L'API génère l'URL Google via Better Auth, pose le cookie d'état en contexte same-site,
// puis redirige le navigateur vers Google. Évite le state_mismatch cross-origin.
app.get('/auth/google', async (c) => {
  const apiURL = (process.env['BETTER_AUTH_URL'] ?? 'https://api-production-e758.up.railway.app').trim()
  const appURL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://quran-tracker-web.vercel.app').trim()
  const callbackURL = c.req.query('callbackURL') ?? `${appURL}/dashboard`

  try {
    // Vrai fetch loopback — passe par tout le pipeline Hono/Better Auth normalement
    // Origin = appURL (vercel.app) = origine de confiance dans trustedOrigins
    const port = process.env['PORT'] ?? '3001'
    const res = await fetch(`http://localhost:${port}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': appURL,
        'Accept': 'application/json',
      },
      body: JSON.stringify({ provider: 'google', callbackURL }),
      signal: AbortSignal.timeout(10000),
    })

    const data = await res.json() as { url?: string; error?: string; redirect?: boolean }

    if (!data.url) {
      console.error('[Google OAuth] No URL returned:', data, 'status:', res.status)
      return c.redirect(`${appURL}/login?error=oauth_failed`)
    }

    // Transférer les Set-Cookie (état OAuth) vers la réponse navigateur
    const setCookies: string[] = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')!] : [])

    for (const cookie of setCookies) {
      c.header('Set-Cookie', cookie, { append: true })
    }

    // Rediriger le navigateur vers Google OAuth
    return c.redirect(data.url, 302)
  } catch (err) {
    console.error('[Google OAuth] Error:', err)
    return c.redirect(`${appURL}/login?error=oauth_failed`)
  }
})

// ─── Auth (Better Auth — doit recevoir l'URL complète) ─────
app.on(['GET', 'POST'], ['/api/auth', '/api/auth/*'], (c) =>
  auth.handler(c.req.raw)
)
app.route('/api/groups', groupRoutes)
app.route('/api/progress', progressRoutes)
app.route('/api/revisions', revisionRoutes)
app.route('/api/feed', feedRoutes)
app.route('/api/notifications', notificationRoutes)
app.route('/api/surahs', surahRoutes)
app.route('/api/ai', aiRoutes) // v2: Full AI features (GPT-4o, Whisper)
app.route('/api/users', userRoutes)

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
