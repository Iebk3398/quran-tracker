'use client'
/**
 * @file Client Better Auth côté navigateur
 * @description Méthodes d'authentification utilisables dans les composants React
 */
import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  plugins: [magicLinkClient()],
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient
