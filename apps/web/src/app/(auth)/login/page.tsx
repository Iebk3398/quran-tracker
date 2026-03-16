'use client'
/**
 * @file Page de connexion — Google OAuth uniquement
 */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { verifySessionDirect } from '@/lib/auth-client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  unable_to_create_user: 'Impossible de créer le compte. Réessayez.',
  oauth_error: 'Erreur Google. Réessayez.',
  invalid_token: 'Lien invalide ou expiré.',
  user_not_found: 'Aucun compte trouvé.',
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Redirige vers dashboard si déjà connecté
  useEffect(() => {
    verifySessionDirect().then((user) => {
      if (user) router.replace('/dashboard')
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Erreur OAuth renvoyée via query param
  useEffect(() => {
    const err = searchParams.get('error')
    if (err) setError(AUTH_ERROR_MESSAGES[err] ?? `Erreur : ${err}`)
  }, [searchParams])

  function handleGoogle() {
    setLoading(true)
    const appURL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').trim()
    const apiURL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim()
    const callbackURL = encodeURIComponent(`${appURL}/dashboard`)
    window.location.href = `${apiURL}/auth/google?callbackURL=${callbackURL}`
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500 shadow-lg mb-5">
            <span className="text-4xl">📖</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Quran Tracker</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2 text-sm">
            Suivi de mémorisation en groupe
          </p>
        </div>

        {/* Card connexion */}
        <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">
            Connexion
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
            Utilisez votre compte Google pour accéder à votre halqa.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continuer avec Google
          </button>
        </div>

        <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-6">
          Quran Tracker · Mémorisation du Coran en groupe
        </p>
      </motion.div>
    </div>
  )
}
