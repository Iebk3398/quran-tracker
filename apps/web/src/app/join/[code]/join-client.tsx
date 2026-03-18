'use client'
/**
 * @file JoinClient — Page de demande d'adhésion à un groupe
 * @description
 *   Affiche l'aperçu d'un groupe via son code d'invitation.
 *   - Non connecté   → bouton "Se connecter pour rejoindre"
 *   - Connecté       → bouton "Demander à rejoindre"
 *   - Déjà membre    → message + lien dashboard
 *   - Demande en cours → message d'attente
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Crown, Clock, RefreshCw, CheckCircle, LogIn, Send, ArrowRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAppStore } from '@/store'
import { getSession } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupPreview {
  id: string
  name: string
  description: string | null
  sheikhName: string
  memberCount: number
  daysRemaining: number | null
}

type RequestStatus = 'idle' | 'pending_send' | 'sent' | 'already_member' | 'already_sent'

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Page de demande d'adhésion à un groupe via code d'invitation.
 */
export default function JoinClient({ code }: { code: string }) {
  const router = useRouter()
  useAppStore()

  const [preview, setPreview] = useState<GroupPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('idle')
  const [message, setMessage] = useState('')
  const [showMessage, setShowMessage] = useState(false)

  // Charger la preview (public, pas d'auth)
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    fetch(`${API_URL}/api/groups/preview/${code}`)
      .then((r) => r.json())
      .then((d: { success: boolean; data?: GroupPreview; error?: string }) => {
        if (d.success && d.data) setPreview(d.data)
        else setLoadError('Groupe introuvable ou lien expiré.')
      })
      .catch(() => setLoadError('Impossible de charger le groupe.'))
  }, [code])

  // Vérifier si l'utilisateur est connecté
  // Better Auth retourne un objet avec `.data.user` ou une Error — on cast prudemment
  useEffect(() => {
    getSession()
      .then((s) => {
        const data = (s as { user?: unknown } | null)
        setIsLoggedIn(!!data?.user)
      })
      .catch(() => setIsLoggedIn(false))
  }, [])

  async function handleRequest() {
    setRequestStatus('pending_send')
    try {
      await apiFetch(`/api/groups/invite/${code}/request`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() || undefined }),
      })
      setRequestStatus('sent')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'ALREADY_MEMBER') setRequestStatus('already_member')
      else if (msg.includes('already')) setRequestStatus('already_sent')
      else setRequestStatus('sent') // on affiche quand même "envoyé" si déjà en attente
    }
  }

  // ── Loading ──
  if (preview === null && loadError === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-stone-500 text-sm">Chargement du groupe…</p>
        </div>
      </div>
    )
  }

  // ── Erreur ──
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
        <div className="max-w-sm w-full bg-white dark:bg-stone-900 rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="text-5xl">😔</div>
          <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200">Lien invalide</h2>
          <p className="text-stone-500 text-sm">{loadError}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    )
  }

  // ── Demande envoyée ──
  if (requestStatus === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
        <div className="max-w-sm w-full bg-white dark:bg-stone-900 rounded-2xl shadow-lg p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">Demande envoyée !</h2>
            <p className="text-stone-500 text-sm mt-2 leading-relaxed">
              Le sheikh de <strong className="text-stone-700 dark:text-stone-300">{preview?.name}</strong> va
              recevoir votre demande. Vous serez notifié par email dès qu&apos;il l&apos;accepte.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
          >
            Aller au tableau de bord <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // ── Déjà membre ──
  if (requestStatus === 'already_member') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
        <div className="max-w-sm w-full bg-white dark:bg-stone-900 rounded-2xl shadow-lg p-8 text-center space-y-5">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">Vous êtes déjà membre</h2>
          <p className="text-stone-500 text-sm">Vous faites déjà partie de ce groupe.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
          >
            Accéder au groupe
          </button>
        </div>
      </div>
    )
  }

  // ── Vue principale ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 px-4 py-8">
      <div className="max-w-sm w-full space-y-4">

        {/* Header branding */}
        <div className="text-center mb-2">
          <p className="text-stone-400 text-xs uppercase tracking-widest font-medium">Quran Tracker</p>
        </div>

        {/* Card principale */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-lg overflow-hidden">

          {/* Bandeau vert */}
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />

          <div className="p-7 space-y-5">
            {/* Icône + titre */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-2xl flex items-center justify-center mx-auto text-3xl">
                🏆
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
                  {preview!.name}
                </h1>
                {preview!.description && (
                  <p className="text-stone-500 text-sm mt-1 leading-relaxed">{preview!.description}</p>
                )}
              </div>
            </div>

            {/* Infos */}
            <div className="flex items-center justify-center gap-6 py-3 border-y border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-stone-500 text-sm">
                <Users className="w-4 h-4" />
                <span>{preview!.memberCount} membre{preview!.memberCount > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-500 text-sm">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>{preview!.sheikhName}</span>
              </div>
              {preview!.daysRemaining !== null && (
                <div className="flex items-center gap-1.5 text-stone-500 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{preview!.daysRemaining}j restants</span>
                </div>
              )}
            </div>

            {/* Info partage progression */}
            <div className="flex items-start gap-2.5 bg-stone-50 dark:bg-stone-800/50 rounded-xl p-3">
              <RefreshCw className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
              <p className="text-stone-500 text-xs leading-relaxed">
                Votre progression de lecture est partagée entre tous vos groupes
              </p>
            </div>

            {/* Message optionnel */}
            {showMessage && (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message pour le sheikh (optionnel)…"
                maxLength={300}
                rows={3}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            )}

            {/* Bouton principal */}
            {isLoggedIn === null ? (
              <div className="h-12 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
            ) : isLoggedIn ? (
              <div className="space-y-2">
                <button
                  onClick={handleRequest}
                  disabled={requestStatus === 'pending_send'}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2',
                    requestStatus === 'pending_send'
                      ? 'bg-emerald-400 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'
                  )}
                >
                  {requestStatus === 'pending_send' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Demander à rejoindre
                    </>
                  )}
                </button>
                {!showMessage && (
                  <button
                    onClick={() => setShowMessage(true)}
                    className="w-full text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 py-1 transition-colors"
                  >
                    + Ajouter un message pour le sheikh
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push(`/login?redirect=/join/${code}`)}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Se connecter pour rejoindre
              </button>
            )}
          </div>
        </div>

        {/* Annuler */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 py-2 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
