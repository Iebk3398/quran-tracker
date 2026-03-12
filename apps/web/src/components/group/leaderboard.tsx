'use client'
/**
 * @file Leaderboard — Classement des membres du groupe
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
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="font-semibold mb-4">🏆 Classement du groupe</h3>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Aucun membre pour l'instant
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center gap-3 p-3 rounded-lg
                ${index === 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/50'}
              `}
            >
              {/* Rang */}
              <span className="w-8 text-center font-bold">
                {index < 3 ? RANK_MEDALS[index] : `#${index + 1}`}
              </span>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                {entry.avatar ? (
                  <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-emerald-600">
                    {entry.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{entry.name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.surahsMemorized} sourate{entry.surahsMemorized > 1 ? 's' : ''} mémorisée{entry.surahsMemorized > 1 ? 's' : ''}
                </p>
              </div>

              {/* Barre de progression */}
              <div className="w-20 hidden sm:block">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(entry.surahsMemorized / 114) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                  {Math.round((entry.surahsMemorized / 114) * 100)}%
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
