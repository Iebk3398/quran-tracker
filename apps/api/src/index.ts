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
    exposeHeaders: ['set-auth-token'],
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
// Le state OAuth est aussi sauvegardé dans Redis (backup pour Safari ITP mobile).
app.get('/auth/google', async (c) => {
  const apiURL = (process.env['BETTER_AUTH_URL'] ?? 'https://api-production-e758.up.railway.app').trim()
  const appURL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://quran-tracker-web.vercel.app').trim()
  const callbackURL = c.req.query('callbackURL') ?? `${appURL}/dashboard`

  try {
    // Vrai fetch loopback — passe par tout le pipeline Hono/Better Auth normalement
    // Origin = appURL (vercel.app) = origine de confiance dans trustedOrigins
    // callbackURL → /auth/relay (même domaine API, same-origin) pour extraire le
    // vrai bearer token via loopback get-session et le passer en ?token=xxx.
    // Nécessaire pour mobile Safari où les cookies cross-origin sont bloqués par ITP.
    const relayCallbackURL = `${apiURL}/auth/relay?redirect=${encodeURIComponent(callbackURL)}`
    const port = process.env['PORT'] ?? '3001'
    const res = await fetch(`http://localhost:${port}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': appURL,
        'Accept': 'application/json',
      },
      body: JSON.stringify({ provider: 'google', callbackURL: relayCallbackURL }),
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

    // Sauvegarder les cookies de state dans Redis (backup pour Safari ITP / bounce tracking)
    // Safari peut purger les cookies de api.railway.app après le redirect vers Google
    if (process.env['UPSTASH_REDIS_REST_URL'] && setCookies.length > 0) {
      try {
        const oauthState = new URL(data.url).searchParams.get('state')
        if (oauthState) {
          const { Redis } = await import('@upstash/redis')
          const redis = new Redis({
            url: process.env['UPSTASH_REDIS_REST_URL'],
            token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? '',
          })
          // Sauvegarder uniquement la partie name=value des cookies (sans les attributs)
          const cookiePairs = setCookies
            .map(cs => cs.split(';')[0]?.trim())
            .filter(Boolean)
            .join('; ')
          await redis.set(`oauth-state-cookies:${oauthState}`, cookiePairs, { ex: 600 })
          console.log('[Google OAuth] State cookies backed up to Redis for:', oauthState.slice(0, 8) + '...')
        }
      } catch (redisErr) {
        // Non-bloquant : le cookie normal fonctionne sur les browsers sans ITP
        console.warn('[Google OAuth] Redis backup failed (non-blocking):', redisErr)
      }
    }

    // Rediriger le navigateur vers Google OAuth
    return c.redirect(data.url, 302)
  } catch (err) {
    console.error('[Google OAuth] Error:', err)
    return c.redirect(`${appURL}/login?error=oauth_failed`)
  }
})

// ─── OAuth relay — échange le cookie session en bearer token URL ────
// Après Google OAuth, Better Auth redirige vers /auth/relay (même domaine API).
// Le cookie de session est disponible en same-origin → on récupère le token
// de session et on redirige le navigateur vers le frontend avec ?token=xxx.
// Résout le blocage des cookies tiers (Chrome/Safari) sans dépendre des cookies.
app.get('/auth/relay', async (c) => {
  const apiURL = (process.env['BETTER_AUTH_URL'] ?? 'https://api-production-e758.up.railway.app').trim()
  const appURL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://quran-tracker-web.vercel.app').trim()
  const redirectTo = c.req.query('redirect') ?? `${appURL}/dashboard`

  try {
    // Loopback HTTP vers get-session avec le cookie de session (same-origin → non bloqué).
    // Better Auth's bearer plugin inclut `set-auth-token` dans la réponse HTTP —
    // c'est le vrai bearer token reconnu côté client (différent de session.token
    // qui est la valeur brute en DB non utilisable directement comme bearer).
    const port = process.env['PORT'] ?? '3001'
    const sessionRes = await fetch(`http://localhost:${port}/api/auth/get-session`, {
      headers: {
        'Cookie': c.req.raw.headers.get('cookie') ?? '',
        'Origin': appURL,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    })

    const bearerToken = sessionRes.headers.get('set-auth-token')

    if (!bearerToken) {
      // Fallback : lire le token dans le corps JSON (session.token)
      const body = await sessionRes.json().catch(() => null) as { session?: { token?: string } } | null
      const fallbackToken = body?.session?.token
      if (!fallbackToken) {
        console.error('[Auth Relay] No bearer token — status:', sessionRes.status)
        return c.redirect(`${appURL}/login?error=oauth_relay_failed`)
      }
      console.log('[Auth Relay] Using fallback session.token')
      const url = new URL(redirectTo)
      url.searchParams.set('token', fallbackToken)
      return c.redirect(url.toString(), 302)
    }

    console.log('[Auth Relay] Bearer token extracted via set-auth-token header')
    const url = new URL(redirectTo)
    url.searchParams.set('token', bearerToken)
    return c.redirect(url.toString(), 302)
  } catch (err) {
    console.error('[Auth Relay] Error:', err)
    return c.redirect(`${appURL}/login?error=oauth_relay_failed`)
  }
})

// ─── OAuth callback Google — restaure le state cookie depuis Redis (Safari ITP) ──
// Safari ITP (Bounce Tracking Prevention) peut purger les cookies de api.railway.app
// après que l'utilisateur a été redirigé vers Google. On restaure le cookie manquant
// depuis Redis pour que Better Auth puisse valider le state sans state_mismatch.
app.get('/api/auth/callback/google', async (c) => {
  const stateFromQuery = c.req.query('state')
  const existingCookies = c.req.raw.headers.get('cookie') ?? ''

  if (stateFromQuery && process.env['UPSTASH_REDIS_REST_URL']) {
    try {
      const { Redis } = await import('@upstash/redis')
      const redis = new Redis({
        url: process.env['UPSTASH_REDIS_REST_URL'],
        token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? '',
      })
      const savedCookies = await redis.get<string>(`oauth-state-cookies:${stateFromQuery}`)
      if (savedCookies) {
        // Vérifier si le premier cookie de la sauvegarde est déjà présent
        const firstCookieName = savedCookies.split('=')[0]?.trim()
        if (firstCookieName && !existingCookies.includes(`${firstCookieName}=`)) {
          console.log('[OAuth Callback] Restoring state cookies from Redis for mobile Safari ITP')
          const combined = existingCookies ? `${existingCookies}; ${savedCookies}` : savedCookies
          const newHeaders = new Headers(c.req.raw.headers)
          newHeaders.set('cookie', combined)
          const newRequest = new Request(c.req.raw.url, { method: c.req.method, headers: newHeaders })
          return auth.handler(newRequest)
        }
      }
    } catch (redisErr) {
      console.warn('[OAuth Callback] Redis restore failed:', redisErr)
    }
  }

  return auth.handler(c.req.raw)
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
