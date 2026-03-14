'use client'
/**
 * @file SurahTree — Visualisation des 114 sourates avec statuts
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Surah, MemorizationStatus } from '@quran-tracker/types'

interface SurahWithStatus extends Surah {
  status: MemorizationStatus
}

interface SurahTreeProps {
  surahs: SurahWithStatus[]
  onSurahClick?: (surah: SurahWithStatus) => void
}

const STATUS_COLORS: Record<MemorizationStatus, string> = {
  not_started: 'bg-muted border-border text-muted-foreground',
  in_progress: 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300',
  memorized: 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300',
  consolidated: 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-900/40 dark:border-emerald-600 dark:text-emerald-200',
}

const STATUS_EMOJI: Record<MemorizationStatus, string> = {
  not_started: '⬜',
  in_progress: '🟡',
  memorized: '🟢',
  consolidated: '💎',
}

type FilterType = 'all' | MemorizationStatus | number // number = juz

/**
 * Composant principal : grille des 114 sourates
 */
export function SurahTree({ surahs, onSurahClick }: SurahTreeProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'juz'>('grid')

  const memorized = surahs.filter((s) => s.status === 'memorized').length
  const progressPercent = Math.round((memorized / 114) * 100)

  const filtered = surahs.filter((s) => {
    if (filter === 'all') return true
    if (typeof filter === 'number') return s.juzNumber === filter
    return s.status === filter
  })

  // Juz groups pour la vue juz
  const juzGroups = Array.from({ length: 30 }, (_, i) => ({
    juz: i + 1,
    surahs: surahs.filter((s) => s.juzNumber === i + 1),
  }))

  return (
    <div className="space-y-4">
      {/* Barre de progression globale */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Progression globale</span>
          <span className="text-muted-foreground">{memorized}/114 sourates ({progressPercent}%)</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
        >
          Tout (114)
        </button>
        {(['not_started', 'in_progress', 'memorized'] as MemorizationStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === status ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            {STATUS_EMOJI[status]} {surahs.filter((s) => s.status === status).length}
          </button>
        ))}
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'juz' : 'grid')}
          className="px-3 py-1 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 ml-auto"
        >
          Vue : {viewMode === 'grid' ? 'Par Juz' : 'Grille'}
        </button>
      </div>

      {/* Vue Grille */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {filtered.map((surah, i) => (
            <SurahCard
              key={surah.id}
              surah={surah}
              index={i}
              onClick={() => onSurahClick?.(surah)}
            />
          ))}
        </div>
      )}

      {/* Vue par Juz */}
      {viewMode === 'juz' && (
        <div className="space-y-4">
          {juzGroups.map(({ juz, surahs: juzSurahs }) => {
            const juzMemorized = juzSurahs.filter(
              (s) => s.status === 'memorized'
            ).length
            return (
              <div key={juz} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Juz {juz}</h4>
                  <span className="text-xs text-muted-foreground">{juzMemorized}/{juzSurahs.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {juzSurahs.map((surah, i) => (
                    <SurahCard
                      key={surah.id}
                      surah={surah}
                      index={i}
                      compact
                      onClick={() => onSurahClick?.(surah)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
        {(Object.entries(STATUS_EMOJI) as [MemorizationStatus, string][]).map(([status, emoji]) => (
          <span key={status}>{emoji} {status.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  )
}

interface SurahCardProps {
  surah: SurahWithStatus
  index: number
  compact?: boolean
  onClick?: () => void
}

function SurahCard({ surah, index, compact = false, onClick }: SurahCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.01, duration: 0.2 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        border rounded-lg text-center cursor-pointer transition-all
        ${STATUS_COLORS[surah.status]}
        ${compact ? 'p-1.5 min-w-[36px]' : 'p-2'}
      `}
      title={`${surah.number}. ${surah.nameAr} — ${surah.nameFr}`}
    >
      {compact ? (
        <span className="text-xs font-bold">{surah.number}</span>
      ) : (
        <>
          <div className="text-xs font-bold">{surah.number}</div>
          <div className="arabic-text text-xs leading-tight mt-0.5 truncate">{surah.nameAr}</div>
          <div className="text-[10px] truncate opacity-75">{surah.nameFr.split(' ')[0]}</div>
        </>
      )}
    </motion.button>
  )
}
