'use client'
/**
 * @file Leaderboard — Classement du groupe par sourates mémorisées + hizbs lus
 */
import { motion } from 'framer-motion'
import type { LeaderboardEntry } from '@quran-tracker/types'

interface LeaderboardProps {
  entries?: LeaderboardEntry[]
  isLoading?: boolean
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

/** Hizb cyclique 1-60 — repart à 1 après chaque Khatam */
function hizbPosition(total: number): number {
  if (total <= 0) return 0
  return ((total - 1) % 60) + 1
}

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
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">🏆 Classement du groupe</h3>
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
            const hizb = hizbPosition(entry.hizbsRead)
            const khatams = Math.floor(entry.hizbsRead / 60)

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  \${isFirst ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}
                `}
              >
                {/* Rang */}
                <span className="w-8 text-center font-bold flex-shrink-0">
                  {index < 3 ? RANK_MEDALS[index] : `#\${index + 1}`}
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

                {/* Infos + barre hizb */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="font-medium truncate text-sm">{entry.name}</p>
                    {khatams > 0 && (
                      <span className="flex-shrink-0 text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                        ×{khatams} ✨
                      </span>
                    )}
                  </div>
                  {/* Barre de progression hizb (1-60) */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 \${isFirst ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `\${(hizb / 60) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
                      H{hizb}/60
                    </span>
                  </div>
                </div>

                {/* Sourates + streak */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className={`text-sm font-bold tabular-nums \${isFirst ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {entry.surahsMemorized} s.
                  </span>
                  {entry.currentStreak > 0 && (
                    <span className="text-[10px] text-orange-500 font-semibold">
                      🔥 {entry.currentStreak}j
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
