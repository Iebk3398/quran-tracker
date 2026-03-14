'use client'
/**
 * @file AuthGuard — Protection des routes authentifiées
 * @description Vérifie la session Better Auth au montage.
 * Si aucune session n'est trouvée → redirige vers /login.
 * Affiche un écran de chargement pendant la vérification.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, AUTH_TOKEN_KEY } from '@/lib/auth-client'
import { useAppStore } from '@/store'
import type { User } from '@quran-tracker/types'

/** Cookie lisible par le middleware Next.js pour un redirect rapide (sans JS) */
const SESSION_COOKIE = 'ba-logged-in'

/** Durée de vie du cookie : 30 jours (identique à Better Auth) */
const MAX_AGE = 60 * 60 * 24 * 30

function setSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

function clearSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

/**
 * Vide toutes les données de session locales.
 * Appelé quand le serveur rejette la session → évite la boucle
 * login ↔ dashboard causée par un token invalide en localStorage.
 */
function clearAllSessionData() {
  clearSessionCookie()
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Protège les routes nécessitant une authentification.
 * À utiliser comme wrapper dans les layouts protégés.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const setUser = useAppStore((s) => s.setUser)
  const [status, setStatus] = useState<'checking' | 'ok' | 'redirect'>('checking')

  useEffect(() => {
    // Capture le bearer token passé dans l'URL après OAuth relay (?token=xxx)
    // Le relay endpoint l'a ajouté car les cookies tiers sont bloqués par le navigateur
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlToken = params.get('token')
      if (urlToken) {
        localStorage.setItem(AUTH_TOKEN_KEY, urlToken)
        // Nettoie l'URL (sécurité + URL propre)
        const cleanURL = new URL(window.location.href)
        cleanURL.searchParams.delete('token')
        window.history.replaceState({}, '', cleanURL.toString())
      }
    }

    /**
     * Vérifie la session avec 1 retry (300ms) pour les cas où le token
     * bearer vient d'être écrit en localStorage (race condition au montage).
     */
    async function checkSession() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any = null
      try {
        result = await getSession()
      } catch {
        // premier essai échoué → retry
      }

      // Retry unique après 350ms si aucune session trouvée au premier essai
      if (!result?.data?.user) {
        await new Promise((r) => setTimeout(r, 350))
        try {
          result = await getSession()
        } catch {
          // second essai échoué → on abandonne
        }
      }

      const user = result?.data?.user

      if (!user) {
        /**
         * ⚠️ Important : on supprime aussi le token du localStorage.
         * Sans ça, la page /login détecterait un token "valide" en localStorage,
         * redirecterait vers /dashboard, qui redirecterait encore vers /login →
         * boucle infinie.
         */
        clearAllSessionData()
        setStatus('redirect')
        router.replace('/login')
        return
      }

      // Hydrate le store Zustand (topbar, etc.)
      const email = user.email ?? ''
      setUser({
        id: user.id,
        name: user.name?.trim() || email.split('@')[0] || 'Utilisateur',
        email,
        role: (['super_admin', 'sheikh', 'student', 'parent'].includes(user.role ?? '')
          ? user.role
          : 'student') as User['role'],
        avatar: user.image ?? null,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      })

      // Cookie lisible par le middleware pour les prochaines visites
      setSessionCookie()
      setStatus('ok')
    }

    checkSession().catch(() => {
      clearAllSessionData()
      setStatus('redirect')
      router.replace('/login')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Chargement : écran neutre pendant la vérification de la session
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl animate-pulse">🕌</div>
          <div className="h-1 w-32 bg-emerald-600 rounded-full animate-pulse" />
        </div>
      </div>
    )
  }

  // Redirect en cours → rien à afficher
  if (status === 'redirect') return null

  return <>{children}</>
}
