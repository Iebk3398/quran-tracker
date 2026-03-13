/**
 * @file Next.js Middleware — Protection des routes
 * @description Deux niveaux de protection :
 *
 * 1. Middleware (serveur, edge) :
 *    - Redirige les utilisateurs connectés (/login → /dashboard)
 *    - Bloque les routes protégées pour les non-connectés → /login
 *    - Le cookie `ba-logged-in` est posé par AuthGuard après vérification
 *
 * 2. AuthGuard (client) :
 *    - Appelle getSession() à chaque montage → vrai barrière de sécurité
 *    - Efface le cookie si la session est expirée → déclenche re-check
 *
 * Flow OAuth Google :
 *    API (Railway) → redirect /dashboard → middleware voit pas de cookie
 *    → redirect /login → login page détecte la session → redirect /dashboard
 *    → middleware voit le cookie (posé par AuthGuard au 1er passage) → OK
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Cookie posé par AuthGuard après vérification de session */
const SESSION_COOKIE = 'ba-logged-in'

/** Routes réservées aux visiteurs non connectés */
const AUTH_PATHS = ['/login']

/** Routes nécessitant d'être authentifié */
const PROTECTED_PATHS = ['/dashboard', '/profile', '/settings', '/surahs', '/validate']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoggedIn = request.cookies.has(SESSION_COOKIE)

  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

  // Utilisateur connecté sur la page de login → redirige vers le dashboard
  if (isAuthPage && isLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Utilisateur non connecté sur une route protégée → redirige vers /login
  // Après OAuth : login page détecte la session existante et redirige vers /dashboard
  if (isProtected && !isLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|api).*)',
  ],
}
