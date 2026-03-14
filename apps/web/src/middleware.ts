/**
 * @file Next.js Middleware — Protection des routes
 * @description Couche légère : redirige les utilisateurs DÉJÀ connectés de /login → /dashboard.
 *
 * ⚠️ Le middleware NE bloque PAS les routes protégées.
 * Raison : le cookie `ba-logged-in` est posé par AuthGuard APRÈS un getSession() réussi.
 * Si le middleware bloque /dashboard avant qu'AuthGuard tourne, le cookie n'est jamais
 * posé → boucle infinie /dashboard → /login → /dashboard.
 *
 * La vraie barrière de sécurité est AuthGuard (client) :
 *   - Appelle getSession() au montage du layout protégé
 *   - Redirige vers /login si aucune session valide
 *   - Pose `ba-logged-in` après succès (pour les visites suivantes)
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Cookie posé par AuthGuard après vérification de session */
const SESSION_COOKIE = 'ba-logged-in'

/** Routes réservées aux visiteurs non connectés */
const AUTH_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoggedIn = request.cookies.has(SESSION_COOKIE)

  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))

  // Utilisateur déjà connecté sur /login → redirige directement vers le dashboard
  if (isAuthPage && isLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|api).*)',
  ],
}
