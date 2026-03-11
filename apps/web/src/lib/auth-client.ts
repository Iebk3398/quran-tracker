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
    // Capture le token de session renvoyé par le plugin bearer (production cross-origin)
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
