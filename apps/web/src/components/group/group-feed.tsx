'use client'
/**
 * @file GroupFeed — Timeline des activités du groupe
 */
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { FeedItem, FeedEventType } from '@quran-tracker/types'

interface GroupFeedProps {
  items?: FeedItem[]
  isLoading?: boolean
}

const FEED_ICONS: Record<FeedEventType, string> = {
  surah_memorized:   '📖',
  surah_validated:   '✅',
  badge_earned:      '🏆',
  milestone_reached: '🎯',
  streak_record:     '🔥',
  group_joined:      '👋',
  announcement:      '📢',
}

const REACTIONS = [
  { key: 'mashallah', label: 'ما شاء الله', emoji: '🤲' },
  { key: 'dua',       label: 'دعاء',        emoji: '🙏' },
  { key: 'fire',      label: 'Bravo',       emoji: '🔥' },
  { key: 'star',      label: 'Excellent',   emoji: '⭐' },
]

export function GroupFeed({ items = [], isLoading }: GroupFeedProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold mb-3">📰 Activités du groupe</h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="font-semibold mb-4">📰 Activités du groupe</h3>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Aucune activité récente
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => {
            const content = typeof item.content === 'string'
              ? JSON.parse(item.content)
              : item.content
            const reactions = typeof item.reactions === 'string'
              ? JSON.parse(item.reactions)
              : item.reactions

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Icône */}
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border flex items-center justify-center text-xl flex-shrink-0">
                  {getFeedIcon(item.type, content)}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{(item as FeedItem & { userName: string }).userName}</span>{' '}
                    <span className="text-muted-foreground">
                      {getFeedMessage(item.type, content)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.createdAt), { locale: fr, addSuffix: true })}
                  </p>

                  {/* Réactions */}
                  <div className="flex gap-1 mt-2">
                    {REACTIONS.map(({ key, emoji }) => {
                      const count = (reactions[key] as string[] | undefined)?.length ?? 0
                      if (count === 0) return null
                      return (
                        <span key={key} className="inline-flex items-center gap-0.5 text-xs bg-white dark:bg-gray-800 border rounded-full px-2 py-0.5">
                          {emoji} {count}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getFeedIcon(type: FeedEventType, content: Record<string, unknown>): string {
  if (type === 'milestone_reached') {
    if (content['type'] === 'hizb_read') return '📖'
    if (content['type'] === 'level_up') return String(content['levelEmoji'] ?? '🎯')
  }
  return FEED_ICONS[type]
}

function getFeedMessage(type: FeedEventType, content: Record<string, unknown>): string {
  switch (type) {
    case 'surah_memorized': {
      const num = content['surahNumber'] ? `#${content['surahNumber']} ` : ''
      const name = String(content['surahNameAr'] ?? content['surahName'] ?? '')
      return `a mémorisé la sourate ${num}${name}`
    }
    case 'surah_validated': {
      const num = content['surahNumber'] ? `#${content['surahNumber']} ` : ''
      const name = String(content['surahNameAr'] ?? content['surahName'] ?? '')
      const sheikh = content['sheikhName'] ? ` par ${String(content['sheikhName'])}` : ' par le Sheikh'
      return `a fait valider la sourate ${num}${name}${sheikh}`
    }
    case 'badge_earned': {
      const name = String(content['badgeNameAr'] ?? content['badgeName'] ?? '')
      return `a obtenu le badge "${name}"`
    }
    case 'milestone_reached': {
      const subType = content['type']
      if (subType === 'hizb_read') {
        const count = Number(content['count'] ?? 1)
        const total = Number(content['totalHizbsRead'] ?? 0)
        return `a lu ${count} hizb${count > 1 ? 's' : ''} 📖 · Total : ${total}`
      }
      if (subType === 'level_up') {
        const emoji = String(content['levelEmoji'] ?? '')
        const name = String(content['levelName'] ?? '')
        return `a atteint le niveau ${emoji} ${name} !`
      }
      return `a atteint un milestone`
    }
    case 'streak_record':   return `a un nouveau record de streak : ${String(content['days'] ?? '')} jours 🔥`
    case 'group_joined':    return `a rejoint le groupe`
    case 'announcement':    return String(content['message'] ?? '')
    default:                return ''
  }
}
