'use client'
/**
 * @file Leaderboard — Classement du groupe par sourates mémorisées
 */
import { motion } from 'framer-motion'
import type { LeaderboardEntry } from '@quran-tracker/types'

interface LeaderboardProps {
  entries?: LeaderboardEntry[]
  isLoading?: boolean
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard({ entries = [], isLoading }: LeaderboardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold mb-3">🏆 Classement mémorisation</h3>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">🏆 Classement mémorisation</h3>
        <span className="text-xs text-muted-foreground">Classé par sourates</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Aucun membre pour l&apos;instant
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const isFirst = index === 0
            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  ${isFirst ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}
                `}
              >
                {/* Rang */}
                <span className="w-8 text-center font-bold flex-shrink-0">
                  {index < 3 ? RANK_MEDALS[index] : `#${index + 1}`}
                </span>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-lg font-bold text-emerald-600">
                      {entry.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Nom */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{entry.name}</p>
                  {entry.currentStreak > 0 && (
                    <p className="text-[10px] text-orange-500 font-semibold">🔥 {entry.currentStreak} jours</p>
                  )}
                </div>

                {/* Sourates mémorisées */}
                <div className="flex-shrink-0 text-right">
                  <span className={`text-sm font-bold tabular-nums ${isFirst ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {entry.surahsMemorized}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">sourate{entry.surahsMemorized !== 1 ? 's' : ''}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
