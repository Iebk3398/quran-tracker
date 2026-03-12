/**
 * @file Next.js Middleware — Protection des routes
 * @description Couche légère de redirection basée sur le cookie `ba-logged-in`.
 *
 * Architecture à deux niveaux :
 * 1. Middleware (serveur, sans JS) :
 *    - Redirige les utilisateurs connectés (/login → /dashboard)
 *    - NE bloque PAS les routes protégées (car le cookie n'est pas encore
 *      posé après un redirect OAuth → AuthGuard gère ça côté client)
 *
 * 2. AuthGuard (client) :
 *    - Appelle getSession() à chaque montage du layout protégé
 *    - Redirige vers /login si aucune session valide
 *    - Pose le cookie `ba-logged-in` après succès (pour les visites suivantes)
 *
 * ⚠️ Le middleware ne peut pas lire le cookie de session Railway
 *    (domaine api.railway.app) — il ne peut lire que les cookies Vercel.
 *    C'est pourquoi AuthGuard reste la vraie barrière de sécurité UI.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Cookie posé par AuthGuard après vérification de session (domaine Vercel) */
const SESSION_COOKIE = 'ba-logged-in'

/** Routes réservées aux visiteurs non connectés */
const AUTH_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoggedIn = request.cookies.has(SESSION_COOKIE)

  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))

  // Utilisateur connecté sur la page de login → redirige directement vers le dashboard
  if (isAuthPage && isLoggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Applique le middleware à toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico, manifest.json, sw.js (PWA)
     * - /api/* (route handlers Next.js)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|api).*)',
  ],
}
