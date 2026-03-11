'use client'
/**
 * @file SessionBootstrap
 * @description Valide la session Better Auth au montage du dashboard et synchronise
 * l'utilisateur vers le store Zustand.
 *
 * Résout deux problèmes :
 * 1. Après un OAuth/magic-link (redirect serveur), le token Bearer n'est jamais
 *    stocké via onResponse → getSession() force le plugin bearer à émettre
 *    set-auth-token, qui est alors capturé par onResponse.
 * 2. Un token expiré/invalide en localStorage n'est pas détecté si on teste
 *    uniquement son existence → on le supprime si la session revient nulle.
 * 3. store.user n'est jamais peuplé côté Zustand → après validation de la
 *    session, on hydrate le store pour que la Topbar affiche le bon utilisateur.
 */
import { useEffect } from 'react'
import { getSession, AUTH_TOKEN_KEY } from '@/lib/auth-client'
import { useAppStore } from '@/store'
import type { User } from '@quran-tracker/types'

export function SessionBootstrap() {
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    if (typeof localStorage === 'undefined') return

    // Appelle getSession() au montage pour deux raisons :
    // 1. Après OAuth/magic-link (redirect serveur), onResponse n'a jamais
    //    capturé le set-auth-token → cet appel force le plugin bearer à
    //    émettre un nouveau token, que onResponse stocke en localStorage.
    // 2. Si un token valide existe déjà, hydrate store.user pour la Topbar.
    //
    // ⚠️ Ne pas rediriger vers /login ici : en prod cross-origin, juste après
    // un redirect OAuth, getSession() peut retourner null avant que le cookie
    // soit disponible → ce serait une boucle infinie. L'auth guard est géré
    // au niveau page/middleware, pas ici.
    getSession()
      .then((result) => {
        const user = (result as { data?: { user?: unknown } | null })?.data?.user

        if (!user) {
          // Pas de session → nettoyer un éventuel token périmé
          localStorage.removeItem(AUTH_TOKEN_KEY)
          return
        }

        // Hydrate le store Zustand pour que la Topbar affiche le bon user
        const raw = user as {
          id: string
          name?: string | null
          email?: string | null
          image?: string | null
          role?: string
          createdAt?: string | Date
        }

        const email = raw.email ?? ''
        setUser({
          id: raw.id,
          name: raw.name?.trim() || email.split('@')[0] || 'Utilisateur',
          email,
          role: (['super_admin', 'sheikh', 'student', 'parent'].includes(raw.role ?? '')
            ? raw.role
            : 'student') as User['role'],
          avatar: raw.image ?? null,
          createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        })
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
