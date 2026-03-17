'use client'
/**
 * @file Leaderboard — Classement par hizbs lus
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
        <h3 className="font-semibold mb-3">🏆 Classement du groupe</h3>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="font-semibold text-sm sm:text-base">🏆 Classement</h3>
        <span className="text-xs text-muted-foreground">Par hizbs lus</span>
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
                  flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg
                  ${isFirst ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}
                `}
              >
                {/* Rang */}
                <span className="w-6 sm:w-8 text-center font-bold flex-shrink-0 text-sm">
                  {index < 3 ? RANK_MEDALS[index] : `${index + 1}`}
                </span>

                {/* Avatar */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-sm sm:text-lg font-bold text-emerald-600">
                      {entry.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Nom + streak */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs sm:text-sm">{entry.name}</p>
                </div>

                {/* Hizbs lus + streak */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className={`text-xs sm:text-sm font-bold tabular-nums ${isFirst ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {entry.hizbsRead ?? 0}
                    <span className="font-normal text-muted-foreground text-[10px] ml-0.5">hz</span>
                  </span>
                  {entry.currentStreak > 0 && (
                    <span className="text-[10px] text-orange-500 font-semibold">
                      🔥{entry.currentStreak}j
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
