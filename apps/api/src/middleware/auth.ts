/**
 * @file Middleware d'authentification JWT
 * @description Vérifie la session Better Auth sur les routes protégées
 */
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { auth } from '../lib/auth.ts'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

/**
 * Middleware qui vérifie la session et injecte l'utilisateur dans le contexte
 */
export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session?.user) {
    throw new HTTPException(401, { message: 'Unauthorized — Please sign in' })
  }

  c.set('user', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as AuthUser & { role: string }).role ?? 'student',
  })

  await next()
}

/**
 * Middleware qui vérifie que l'utilisateur a le rôle sheikh ou admin
 */
export async function requireSheikh(c: Context, next: Next) {
  await requireAuth(c, async () => {})
  const user = c.get('user')
  if (!['sheikh', 'super_admin'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Forbidden — Sheikh role required' })
  }
  await next()
}
