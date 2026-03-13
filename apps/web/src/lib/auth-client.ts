'use client'
/**
 * @file Client Better Auth côté navigateur
 * @description Méthodes d'authentification utilisables dans les composants React
 */
import { createAuthClient } from 'better-auth/react'
import { magicLinkClient, emailOTPClient } from 'better-auth/client/plugins'

/** Clé localStorage partagée avec api.ts pour le token de session cross-origin */
export const AUTH_TOKEN_KEY = 'ba-session-token' satisfies string

export const authClient = createAuthClient({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
  plugins: [magicLinkClient(), emailOTPClient()],
  fetchOptions: {
    /**
     * credentials: 'include' est requis pour envoyer les cookies cross-origin
     * (Vercel → Railway). Sans ça, le cookie de session Railway ne peut pas
     * être envoyé après un OAuth Google (redirect serveur → no bearer token yet).
     * Le cookie doit être SameSite=None; Secure côté serveur pour que ça fonctionne.
     */
    credentials: 'include' as RequestCredentials,
    // Envoie le bearer token sur toutes les requêtes authClient (getSession inclus)
    // Obligatoire en production cross-origin Vercel → Railway
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onRequest(ctx: any) {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null
      if (token) {
        ctx.options.headers = { ...ctx.options.headers, Authorization: `Bearer ${token}` }
      }
    },
    // Capture le token renvoyé par le plugin bearer côté serveur
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onResponse(ctx: any) {
      const token = ctx?.response?.headers?.get('set-auth-token')
      if (token && typeof localStorage !== 'undefined') {
        localStorage.setItem(AUTH_TOKEN_KEY, token)
      }
    },
  },
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient
