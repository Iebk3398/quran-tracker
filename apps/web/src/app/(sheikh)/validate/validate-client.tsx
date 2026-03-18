'use client'
/**
 * @file ValidateClient — Interface sheikh
 * @description
 *   - Liste des demandes d'adhésion en attente (accept / reject)
 *   - Sélecteur de groupe actif
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Users, RefreshCw, UserPlus, MessageSquare } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAppStore } from '@/store'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JoinRequest {
  id: string
  userId: string
  status: 'pending'
  message: string | null
  createdAt: string
  userName: string
  userEmail: string
  userAvatar: string | null
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Carte d'une demande d'adhésion en attente.
 */
function RequestCard({
  req,
  groupId,
  onDone,
}: {
  req: JoinRequest
  groupId: string
  onDone: () => void
}) {
  const [decision, setDecision] = useState<'accept' | 'reject' | null>(null)

  const decide = useMutation({
    mutationFn: (action: 'accept' | 'reject') =>
      apiFetch(`/api/groups/${groupId}/requests/${req.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    onMutate: (action) => setDecision(action),
    onSuccess: () => {
      setTimeout(onDone, 800)
    },
    onError: () => setDecision(null),
  })

  const initials = req.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const timeAgo = (() => {
    const diff = Date.now() - new Date(req.createdAt).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 60) return `il y a ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `il y a ${hours}h`
    return `il y a ${Math.floor(hours / 24)}j`
  })()

  if (decision) {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className={cn(
          'rounded-xl p-4 flex items-center gap-3',
          decision === 'accept'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
        )}
      >
        {decision === 'accept' ? (
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
        <span className={cn('text-sm font-medium', decision === 'accept' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>
          {decision === 'accept' ? `${req.userName} a été accepté` : `${req.userName} a été refusé`}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {req.userAvatar ? (
          <img src={req.userAvatar} alt={req.userName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-stone-800 dark:text-stone-200 text-sm truncate">{req.userName}</p>
            <span className="text-[11px] text-stone-400 flex-shrink-0">{timeAgo}</span>
          </div>
          <p className="text-xs text-stone-500 truncate">{req.userEmail}</p>

          {req.message && (
            <div className="mt-2 flex items-start gap-1.5">
              <MessageSquare className="w-3 h-3 text-stone-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-stone-600 dark:text-stone-400 italic leading-relaxed">{req.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => decide.mutate('accept')}
          disabled={decide.isPending}
          className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <CheckCircle className="w-4 h-4" />
          Accepter
        </button>
        <button
          onClick={() => decide.mutate('reject')}
          disabled={decide.isPending}
          className="flex-1 py-2 rounded-lg bg-stone-100 hover:bg-red-100 dark:bg-stone-800 dark:hover:bg-red-950/50 text-stone-700 dark:text-stone-300 hover:text-red-700 dark:hover:text-red-400 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <XCircle className="w-4 h-4" />
          Refuser
        </button>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Interface sheikh : gestion des demandes d'adhésion.
 */
export default function ValidateClient() {
  const queryClient = useQueryClient()
  const { activeGroupId, activeGroup } = useAppStore()
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const { data: requests = [], isLoading, refetch } = useQuery<JoinRequest[]>({
    queryKey: ['join-requests', activeGroupId],
    queryFn: () => apiFetch(`/api/groups/${activeGroupId}/requests`),
    enabled: !!activeGroupId,
    refetchInterval: 30_000,
  })

  const visible = requests.filter((r) => !removedIds.has(r.id))

  function removeRequest(id: string) {
    setRemovedIds((prev) => new Set([...prev, id]))
    // Invalide pour la prochaine ouverture
    queryClient.invalidateQueries({ queryKey: ['join-requests', activeGroupId] })
  }

  if (!activeGroupId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center space-y-4">
        <Users className="w-12 h-12 text-stone-300 mx-auto" />
        <p className="text-stone-500">Aucun groupe sélectionné.</p>
        <Link href="/groups" className="text-emerald-600 hover:underline text-sm font-medium">
          Créer ou rejoindre un groupe →
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Interface Sheikh</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            Groupe : <span className="font-medium text-emerald-600">{activeGroup?.name ?? '—'}</span>
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Section demandes */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-stone-800 dark:text-stone-200">Demandes d&apos;adhésion</h2>
          </div>
          {visible.length > 0 && (
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {visible.length}
            </span>
          )}
        </div>

        {/* Contenu */}
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-stone-100 dark:bg-stone-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Clock className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-stone-500 text-sm">Aucune demande en attente</p>
              <p className="text-stone-400 text-xs">
                Partagez le lien d&apos;invitation depuis la{' '}
                <Link href="/groups" className="text-emerald-500 hover:underline">gestion des groupes</Link>
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {visible.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    groupId={activeGroupId}
                    onDone={() => removeRequest(req.id)}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Section validation sourates (placeholder) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <h2 className="font-semibold text-stone-800 dark:text-stone-200">Validation des sourates</h2>
        </div>
        <p className="text-stone-400 text-sm text-center py-6">
          Fonctionnalité disponible dans la prochaine version
        </p>
      </div>
    </div>
  )
}
