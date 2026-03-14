'use client'
/**
 * @file Leaderboard — Classement XP du groupe
 */
import { motion } from 'framer-motion'
import type { LeaderboardEntry } from '@quran-tracker/types'

interface LeaderboardProps {
  entries?: LeaderboardEntry[]
  isLoading?: boolean
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

/** Niveaux : condition double (XP ET sourates mémorisées) */
const LEVELS = [
  { min: 0,     minSurahs: 0,  max: 499,      name: 'Murîd',  emoji: '🌱' },
  { min: 500,   minSurahs: 1,  max: 1499,     name: 'Taleb',  emoji: '📖' },
  { min: 1500,  minSurahs: 5,  max: 3999,     name: 'Qari',   emoji: '📜' },
  { min: 4000,  minSurahs: 20, max: 9999,     name: 'Hafiz',  emoji: '⭐' },
  { min: 10000, minSurahs: 57, max: Infinity, name: 'Sheikh', emoji: '🎓' },
]

/**
 * Niveau le plus élevé où XP >= seuil ET surahs >= seuil (condition AND).
 */
function getLevel(xp: number, surahs: number) {
  return LEVELS.findLast(l => xp >= l.min && surahs >= l.minSurahs) ?? LEVELS[0]!
}

/**
 * Progression XP en % vers le prochain niveau.
 */
function getLevelProgress(xp: number, surahs: number) {
  const currentIdx = LEVELS.findLastIndex(l => xp >= l.min && surahs >= l.minSurahs)
  if (currentIdx === LEVELS.length - 1) return 100
  const current = LEVELS[currentIdx]!
  const next = LEVELS[currentIdx + 1]!
  return Math.min(100, Math.round(((xp - current.min) / (next.min - current.min)) * 100))
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
        <span className="text-xs text-muted-foreground">Classé par XP</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Aucun membre pour l'instant
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const level = getLevel(entry.totalXp, entry.surahsMemorized)
            const progress = getLevelProgress(entry.totalXp, entry.surahsMemorized)
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

                {/* Infos + barre de niveau */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-medium truncate text-sm">{entry.name}</p>
                    <span className="flex-shrink-0 text-xs">{level.emoji}</span>
                    <span className="flex-shrink-0 text-[10px] font-semibold text-muted-foreground">{level.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isFirst ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {entry.surahsMemorized} s.
                    </span>
                  </div>
                </div>

                {/* XP + streak */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${isFirst ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {entry.totalXp.toLocaleString()} XP
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
