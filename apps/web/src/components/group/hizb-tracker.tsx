'use client'
/**
 * @file HizbTracker — Widget pour enregistrer les hizbs lus + classement du groupe
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

interface HizbEntry {
  userId: string
  name: string
  avatar: string | null
  hizbsRead: number
  xp: string
}

interface HizbTrackerProps {
  groupId: string
  currentUserId: string
}

/**
 * Widget hizb : bouton d'ajout + classement du groupe par hizbs lus
 */
export function HizbTracker({ groupId, currentUserId }: HizbTrackerProps) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [count, setCount] = useState(1)
  const [xpToast, setXpToast] = useState<number | null>(null)

  const { data: leaderboard = [] } = useQuery<HizbEntry[]>({
    queryKey: ['group', groupId, 'leaderboard'],
    queryFn: () => apiFetch(`/api/groups/${groupId}/leaderboard`),
    enabled: !!groupId,
  })

  // Trier par hizbs lus pour le classement hizb
  const sorted = [...leaderboard].sort((a, b) => (b.hizbsRead ?? 0) - (a.hizbsRead ?? 0))

  const addHizb = useMutation({
    mutationFn: (n: number) =>
      apiFetch<{ hizbsRead: number }>('/api/users/me/hizb', {
        method: 'POST',
        body: JSON.stringify({ count: n }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'leaderboard'] })
      setShowAdd(false)
      // Toast XP (5 XP par hizb)
      setXpToast(count * 5)
      setTimeout(() => setXpToast(null), 2500)
    },
  })

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-5 space-y-4 relative">
      {/* Toast XP */}
      <AnimatePresence>
        {xpToast !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: -30 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow pointer-events-none"
          >
            +{xpToast} XP ✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <div>
            <h3 className="font-bold text-sm">Hizbs lus</h3>
            <p className="text-xs text-muted-foreground">Classement du groupe</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-xl transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Classement */}
      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun hizb enregistré</p>
        )}
        {sorted.map((entry, idx) => (
          <div
            key={entry.userId}
            className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
              entry.userId === currentUserId
                ? 'bg-amber-100/60 dark:bg-amber-900/20 ring-1 ring-amber-300 dark:ring-amber-700'
                : ''
            }`}
          >
            {/* Rang */}
            <span
              className={`w-5 text-center text-xs font-bold flex-shrink-0 ${
                idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-400' : 'text-muted-foreground'
              }`}
            >
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
            </span>
            {/* Avatar */}
            {entry.avatar ? (
              <img src={entry.avatar} alt={entry.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300 flex-shrink-0">
                {entry.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Nom */}
            <span className="flex-1 text-sm font-medium truncate">{entry.name}</span>
            {/* Hizbs */}
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">
              {entry.hizbsRead ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">hizb</span>
            </span>
          </div>
        ))}
      </div>

      {/* Modal ajout hizbs */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-background rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">📖 Hizbs lus aujourd&apos;hui</h2>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Nombre de hizbs lus</label>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={() => setCount(Math.max(1, count - 1))}
                    className="w-10 h-10 rounded-xl border text-lg font-bold hover:bg-muted transition-colors"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold w-12 text-center">{count}</span>
                  <button
                    onClick={() => setCount(Math.min(60, count + 1))}
                    className="w-10 h-10 rounded-xl border text-lg font-bold hover:bg-muted transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">1 hizb = 1/60 du Coran</p>
              </div>

              {addHizb.isError && (
                <p className="text-xs text-red-500 text-center">Erreur lors de l&apos;enregistrement</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => addHizb.mutate(count)}
                  disabled={addHizb.isPending}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {addHizb.isPending ? 'Enregistrement…' : 'Valider'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
