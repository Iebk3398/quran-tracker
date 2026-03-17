'use client'
/**
 * @file QuranClient — Section lecture du Coran (60 hizbs)
 * @description Grille des 60 hizbs avec noms arabes, statut de lecture,
 * sheet de détail et bouton "Marquer comme lu".
 */

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { CheckCircle2, BookOpen, X, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Surah {
  id: number
  number: number
  nameAr: string
  nameFr: string
  nameTranslit: string
  versesCount: number
  juzNumber: number
  hizbNumber: number
  revelationType: string
  startPage: number
  endPage: number
}

interface HizbInfo {
  number: number           // 1-60
  juzNumber: number        // 1-30
  surahs: Surah[]         // sourates démarrant dans ce hizb
  primarySurah: Surah      // sourate principale (couvre ce hizb)
  startPage: number
  endPage: number
}

// ─── Storage key pour les hizbs lus ──────────────────────────────────────────

const STORAGE_KEY = 'ikraa_hizbs_read'

function loadReadHizbs(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as number[])
  } catch {
    return new Set()
  }
}

function saveReadHizbs(set: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Numéro arabe-indic pour le numéro de hizb */
function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)] ?? d)
}

/** Juz associé à un numéro de hizb */
function juzOf(hizbNumber: number): number {
  return Math.ceil(hizbNumber / 2)
}

/**
 * Construit la carte complète des 60 hizbs à partir de la liste de sourates.
 * Pour chaque hizb, détermine la sourate qui "couvre" ce hizb (celle qui a
 * démarré le plus récemment avant ou à ce hizb).
 */
function buildHizbMap(surahs: Surah[]): HizbInfo[] {
  const sorted = [...surahs].sort((a, b) => a.number - b.number)

  // Sourates démarrant dans chaque hizb
  const startingIn = new Map<number, Surah[]>()
  for (let h = 1; h <= 60; h++) startingIn.set(h, [])
  for (const s of sorted) {
    startingIn.get(s.hizbNumber)?.push(s)
  }

  const result: HizbInfo[] = []

  for (let h = 1; h <= 60; h++) {
    // Sourate principale = la dernière sourate qui a commencé à ou avant ce hizb
    let primarySurah = sorted[0]!
    for (const s of sorted) {
      if (s.hizbNumber <= h) primarySurah = s
      else break
    }

    // Pages du hizb : page de début = page de début de la sourate primaire
    // (approximation — chaque hizb fait ~10 pages)
    const startPage = 1 + (h - 1) * 10
    const endPage   = h * 10

    result.push({
      number: h,
      juzNumber: juzOf(h),
      surahs: startingIn.get(h) ?? [],
      primarySurah,
      startPage,
      endPage,
    })
  }

  return result
}

// ─── Composant card d'un hizb ─────────────────────────────────────────────────

function HizbCard({
  hizb,
  isRead,
  onClick,
}: {
  hizb: HizbInfo
  isRead: boolean
  onClick: () => void
}) {
  const hasNewSurah = hizb.surahs.length > 0
  const firstSurah  = hizb.surahs[0]

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex flex-col items-end text-right p-3.5 rounded-2xl border transition-all duration-200 w-full',
        'active:scale-97 select-none cursor-pointer',
        isRead
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
          : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700',
        'shadow-sm hover:shadow-md dark:shadow-none',
      )}
    >
      {/* Checkmark si lu */}
      {isRead && (
        <div className="absolute top-2.5 left-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
      )}

      {/* Juz badge */}
      <div className={cn(
        'absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none',
        isRead
          ? 'bg-emerald-200 dark:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300'
          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      )}>
        ج {toArabicNumeral(hizb.juzNumber)}
      </div>

      {/* Contenu centré */}
      <div className="flex flex-col items-end w-full mt-4 gap-1.5">
        {/* Nom arabe principal */}
        <span
          className={cn(
            'arabic-text text-xl font-bold leading-snug text-right w-full',
            isRead
              ? 'text-emerald-800 dark:text-emerald-200'
              : 'text-stone-800 dark:text-stone-100',
          )}
        >
          {hasNewSurah && firstSurah ? firstSurah.nameAr : hizb.primarySurah.nameAr}
        </span>

        {/* Translitération si nouvelle sourate */}
        {hasNewSurah && firstSurah && (
          <span className="text-[10px] text-stone-400 dark:text-stone-500 w-full text-right">
            {firstSurah.nameTranslit}
          </span>
        )}

        {/* Hizb number + séparateur */}
        <div className="flex items-center justify-end gap-1.5 w-full mt-0.5">
          <span className={cn(
            'text-[10px] font-medium',
            isRead ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500',
          )}>
            حزب {toArabicNumeral(hizb.number)}
          </span>
        </div>
      </div>
    </motion.button>
  )
}

// ─── Sheet de détail d'un hizb ───────────────────────────────────────────────

function HizbSheet({
  hizb,
  isRead,
  onClose,
  onMarkRead,
  isPending,
}: {
  hizb: HizbInfo
  isRead: boolean
  onClose: () => void
  onMarkRead: () => void
  isPending: boolean
}) {
  const allSurahsInHizb = useMemo(() => {
    // Afficher la sourate principale + celles qui démarrent dans ce hizb
    const set = new Set<number>()
    set.add(hizb.primarySurah.id)
    hizb.surahs.forEach((s) => set.add(s.id))
    return [hizb.primarySurah, ...hizb.surahs.filter((s) => s.id !== hizb.primarySurah.id)]
  }, [hizb])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-lg bg-background rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '82vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700" />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(82vh - 20px)' }}>
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-3 pb-4">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs text-stone-400 dark:text-stone-500">
                الجزء {toArabicNumeral(hizb.juzNumber)}
              </span>
              <h2 className="arabic-text text-2xl font-bold text-stone-900 dark:text-stone-100">
                {hizb.surahs[0]?.nameAr ?? hizb.primarySurah.nameAr}
              </h2>
              <span className="text-sm text-stone-400 dark:text-stone-500">
                الحزب {toArabicNumeral(hizb.number)}
              </span>
            </div>
          </div>

          {/* Sourates */}
          <div className="px-5 pb-4 space-y-2">
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-3">
              Sourates dans ce hizb
            </p>
            {allSurahsInHizb.map((surah) => (
              <div
                key={surah.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-stone-50 dark:bg-stone-800/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                    {surah.number}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      {surah.nameTranslit}
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {surah.versesCount} versets · {surah.revelationType === 'meccan' ? 'Mecquoise' : 'Médinoise'}
                    </p>
                  </div>
                </div>
                <span className="arabic-text text-lg font-bold text-stone-700 dark:text-stone-200">
                  {surah.nameAr}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-5 pb-8 pt-2">
            {isRead ? (
              <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Hizb déjà lu ✓
                </span>
              </div>
            ) : (
              <button
                onClick={onMarkRead}
                disabled={isPending}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-base rounded-2xl shadow-lg shadow-amber-200 dark:shadow-amber-900/30 transition-all disabled:opacity-50"
              >
                {isPending ? 'Enregistrement…' : '📖 Marquer comme lu · +5 XP'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * Page de lecture du Coran — grille 2 colonnes des 60 hizbs.
 */
export function QuranClient() {
  const user       = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [selectedHizb, setSelectedHizb] = useState<HizbInfo | null>(null)
  const [readHizbs, setReadHizbs]       = useState<Set<number>>(new Set())

  // Charger les hizbs lus depuis localStorage
  useEffect(() => {
    setReadHizbs(loadReadHizbs())
  }, [])

  // Fetch les sourates
  const { data: surahs = [], isLoading } = useQuery<Surah[]>({
    queryKey: ['surahs'],
    queryFn: () => apiFetch<Surah[]>('/api/surahs'),
    staleTime: Infinity, // données statiques
  })

  // Construire la carte des 60 hizbs
  const hizbs = useMemo(() => {
    if (surahs.length === 0) return []
    return buildHizbMap(surahs)
  }, [surahs])

  const totalRead = readHizbs.size
  const progress  = Math.round((totalRead / 60) * 100)

  // Mutation pour marquer un hizb comme lu
  const markRead = useMutation({
    mutationFn: () =>
      apiFetch('/api/users/me/hizb', {
        method: 'POST',
        body: JSON.stringify({ count: 1 }),
      }),
    onSuccess: () => {
      if (!selectedHizb) return
      const updated = new Set(readHizbs)
      updated.add(selectedHizb.number)
      setReadHizbs(updated)
      saveReadHizbs(updated)
      queryClient.invalidateQueries({ queryKey: ['group-activity'] })
      setSelectedHizb(null)
    },
  })

  return (
    <div className="pb-6">
      {/* ── En-tête ── */}
      <div className="px-1 pt-2 pb-6 text-center">
        <h1 className="arabic-text text-3xl font-bold text-stone-900 dark:text-stone-100 leading-relaxed">
          القرآن الكريم
        </h1>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 mb-4">
          {totalRead} / 60 hizbs lus
        </p>

        {/* Barre de progression globale */}
        <div className="relative h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden max-w-xs mx-auto">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        {progress > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-2">
            {progress}% du Coran
          </p>
        )}
      </div>

      {/* ── Grille 60 hizbs ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 px-1">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 px-1">
          {hizbs.map((hizb) => (
            <HizbCard
              key={hizb.number}
              hizb={hizb}
              isRead={readHizbs.has(hizb.number)}
              onClick={() => setSelectedHizb(hizb)}
            />
          ))}
        </div>
      )}

      {/* ── Sheet de détail ── */}
      <AnimatePresence>
        {selectedHizb && (
          <HizbSheet
            hizb={selectedHizb}
            isRead={readHizbs.has(selectedHizb.number)}
            onClose={() => setSelectedHizb(null)}
            onMarkRead={() => markRead.mutate()}
            isPending={markRead.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
