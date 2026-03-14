'use client'
/**
 * @file ActiveStreaks — Membres avec streak actif
 */
import { motion } from 'framer-motion'

interface StreakMember {
  userId: string
  name: string
  avatar: string | null
  currentStreak: number
}

interface ActiveStreaksProps {
  members?: StreakMember[]
}

export function ActiveStreaks({ members = [] }: ActiveStreaksProps) {
  const sorted = [...members].sort((a, b) => b.currentStreak - a.currentStreak)

  return (
    <div className="rounded-xl border bg-card p-4 h-full">
      <h3 className="font-semibold mb-4">🔥 Streaks actifs</h3>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Aucun streak actif
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.filter((m) => m.currentStreak > 0).map((member, i) => (
            <motion.div
              key={member.userId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600 flex-shrink-0">
                {member.avatar
                  ? <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  : member.name.charAt(0).toUpperCase()
                }
              </div>
              <span className="text-sm flex-1 truncate">{member.name}</span>
              <span className="text-sm font-bold text-orange-500">{member.currentStreak}🔥</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
