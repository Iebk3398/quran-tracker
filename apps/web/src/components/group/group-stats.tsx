'use client'
/**
 * @file GroupStats — Statistiques globales du groupe
 */
import { motion } from 'framer-motion'
import type { GroupStats as GroupStatsType } from '@quran-tracker/types'

interface GroupStatsProps {
  stats?: GroupStatsType
}

export function GroupStats({ stats }: GroupStatsProps) {
  const cards = [
    {
      label: 'Membres actifs',
      shortLabel: 'Membres',
      value: stats?.activeMembers ?? 0,
      total: stats?.totalMembers ?? 0,
      icon: '👥',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Sourates mémorisées',
      shortLabel: 'Sourates',
      value: stats?.totalSurahsMemorized ?? 0,
      icon: '📖',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Progression groupe',
      shortLabel: 'Progression',
      value: `${stats?.groupProgressPercent ?? 0}%`,
      icon: '🎯',
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`rounded-xl p-2.5 sm:p-4 ${card.bg} border`}
        >
          <div className="text-lg sm:text-2xl mb-1">{card.icon}</div>
          <div className={`text-lg sm:text-2xl font-bold leading-tight ${card.color}`}>
            {card.value}
            {card.total !== undefined && (
              <span className="text-xs sm:text-sm text-muted-foreground font-normal ml-0.5 sm:ml-1">
                /{card.total}
              </span>
            )}
          </div>
          {/* Label court sur mobile, label complet sur sm+ */}
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
            <span className="sm:hidden">{card.shortLabel}</span>
            <span className="hidden sm:inline">{card.label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
