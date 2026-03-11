'use client'
/**
 * @file SessionBootstrap
 * @description Bootstraps the bearer token after server-side OAuth redirects (Google).
 * After Google OAuth, the auth client's onResponse callback never fires (it's a full-page
 * redirect, not a JS fetch), so the bearer token isn't stored in localStorage.
 * This component calls getSession() on mount when no token is present — the bearer plugin
 * adds set-auth-token to the get-session response, which onResponse then captures.
 */
import { useEffect } from 'react'
import { getSession, AUTH_TOKEN_KEY } from '@/lib/auth-client'

export function SessionBootstrap() {
  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    const existing = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!existing) {
      getSession().catch(() => {})
    }
  }, [])

  return null
}
