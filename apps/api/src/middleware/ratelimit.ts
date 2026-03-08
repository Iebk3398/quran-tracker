/**
 * @file Middleware Rate Limiting
 * @description Limite les requêtes via Upstash Redis (désactivé en local si Redis absent)
 */
import { type MiddlewareHandler } from 'hono'

/**
 * Middleware de rate limiting
 * En développement local (pas de Redis configuré), laisse passer toutes les requêtes
 */
export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const redisUrl = process.env['UPSTASH_REDIS_REST_URL']

  // Rate limiting désactivé si Redis n'est pas configuré (dev local)
  if (!redisUrl) {
    return next()
  }

  try {
    // TODO: Activer Upstash Ratelimit en production
    // const { Ratelimit } = await import('@upstash/ratelimit')
    // const { Redis } = await import('@upstash/redis')
    return next()
  } catch {
    return next()
  }
}
