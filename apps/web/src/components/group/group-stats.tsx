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
      value: stats?.activeMembers ?? 0,
      total: stats?.totalMembers ?? 0,
      icon: '👥',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Sourates mémorisées',
      value: stats?.totalSurahsMemorized ?? 0,
      icon: '📖',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Progression groupe',
      value: `${stats?.groupProgressPercent ?? 0}%`,
      icon: '🎯',
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`rounded-xl p-3 md:p-4 ${card.bg} border`}
        >
          <div className="text-xl md:text-2xl mb-1">{card.icon}</div>
          <div className={`text-xl md:text-2xl font-bold ${card.color}`}>
            {card.value}
            {card.total !== undefined && (
              <span className="text-sm text-muted-foreground font-normal ml-1">/{card.total}</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">{card.label}</div>
        </motion.div>
      ))}
    </div>
  )
}
