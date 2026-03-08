'use client'
/**
 * @file SurahUpdateModal — Mise à jour du statut d'une sourate
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { MemorizationStatus } from '@quran-tracker/types'

interface SurahInfo {
  surahId: number
  nameAr: string
  nameFr: string
  number: number
  versesCount: number
  status: MemorizationStatus
}

interface SurahUpdateModalProps {
  surah: SurahInfo | null
  userId: string
  onClose: () => void
}

const STATUS_OPTIONS: { value: MemorizationStatus; label: string; emoji: string; color: string }[] = [
  { value: 'not_started', label: 'Non commencé', emoji: '⬜', color: 'border-border bg-muted text-muted-foreground' },
  { value: 'in_progress', label: 'En cours', emoji: '🟡', color: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' },
  { value: 'memorized', label: 'Mémorisé', emoji: '🟢', color: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' },
  { value: 'consolidated', label: 'Consolidé', emoji: '🔵', color: 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' },
]

const QUALITY_OPTIONS = [
  { value: 5, label: 'Parfait', emoji: '⭐⭐⭐', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 4, label: 'Bien', emoji: '⭐⭐', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 3, label: 'Passable', emoji: '⭐', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 2, label: 'Difficile', emoji: '😅', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 1, label: 'Très difficile', emoji: '😓', color: 'bg-red-100 text-red-800 border-red-300' },
]

export function SurahUpdateModal({ surah, userId, onClose }: SurahUpdateModalProps) {
  const queryClient = useQueryClient()
  const [newStatus, setNewStatus] = useState<MemorizationStatus>(surah?.status ?? 'not_started')
  const [tab, setTab] = useState<'status' | 'revision'>('status')
  const [quality, setQuality] = useState(4)
  const [duration, setDuration] = useState(15)

  const updateProgress = useMutation({
    mutationFn: (status: MemorizationStatus) =>
      apiFetch('/api/progress', {
        method: 'POST',
        body: JSON.stringify({ surahId: surah!.surahId, status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', userId] })
      onClose()
    },
  })

  const logRevision = useMutation({
    mutationFn: () =>
      apiFetch('/api/revisions', {
        method: 'POST',
        body: JSON.stringify({ surahId: surah!.surahId, quality, duration }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', userId] })
      onClose()
    },
  })

  if (!surah) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="relative w-full max-w-md bg-card rounded-2xl border shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b">
            <div>
              <div className="text-2xl font-bold arabic-text">{surah.nameAr}</div>
              <div className="text-sm text-muted-foreground">
                {surah.number}. {surah.nameFr} · {surah.versesCount} versets
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setTab('status')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'status' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mettre à jour
            </button>
            <button
              onClick={() => setTab('revision')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'revision' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Enregistrer révision
            </button>
          </div>

          <div className="p-5">
            {tab === 'status' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">Sélectionnez votre statut actuel :</p>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setNewStatus(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                      newStatus === opt.value
                        ? opt.color + ' border-current'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="font-medium">{opt.label}</span>
                    {newStatus === opt.value && <span className="ml-auto">✓</span>}
                  </button>
                ))}
                <button
                  onClick={() => updateProgress.mutate(newStatus)}
                  disabled={updateProgress.isPending || newStatus === surah.status}
                  className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {updateProgress.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            )}

            {tab === 'revision' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Qualité de la révision :</p>
                  <div className="grid grid-cols-1 gap-2">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setQuality(opt.value)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                          quality === opt.value ? opt.color + ' border-current' : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        <span className="font-medium">{opt.label}</span>
                        {quality === opt.value && <span className="ml-auto">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Durée : <span className="text-emerald-600">{duration} min</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5 min</span>
                    <span>120 min</span>
                  </div>
                </div>

                <button
                  onClick={() => logRevision.mutate()}
                  disabled={logRevision.isPending}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {logRevision.isPending ? 'Enregistrement...' : 'Enregistrer la révision'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
