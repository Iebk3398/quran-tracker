'use client'
/**
 * @file Client Better Auth côté navigateur
 * @description Méthodes d'authentification utilisables dans les composants React
 */
import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  // Better Auth server is on the API (port 3001), not the Next.js app (port 3000)
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
  plugins: [magicLinkClient()],
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient
