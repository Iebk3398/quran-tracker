'use client'
/**
 * @file MemberActivityCards — Activité journalière de chaque membre du groupe
 * @description Affiche une card par membre avec ses N derniers jours de lecture (hizbs).
 * Mini-barres proportionnelles + total de la période.
 */
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Flame, BookOpen } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DayActivity {
  date: string   // YYYY-MM-DD
  count: number  // hizbs lus ce jour
}

interface MemberActivity {
  userId: string
  name: string
  avatar: string | null
  hizbsRead: number
  currentStreak: number
  activity: DayActivity[]
  totalThisPeriod: number
}

interface ApiResponse {
  success: boolean
  data: MemberActivity[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Initiales depuis un nom complet */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Étiquette courte du jour (Lu, Ma, Me, Je, Ve, Sa, Di) */
const DAY_LABELS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return DAY_LABELS[d.getDay()] ?? ''
}

/** Couleur des barres selon l'intensité relative */
function barColor(count: number, max: number): string {
  if (count === 0) return 'bg-stone-200 dark:bg-stone-700'
  const pct = count / Math.max(max, 1)
  if (pct >= 0.75) return 'bg-amber-500'
  if (pct >= 0.4)  return 'bg-amber-400'
  return 'bg-amber-300'
}

// ── Composant card ─────────────────────────────────────────────────────────────

function MemberCard({ member }: { member: MemberActivity }) {
  const maxCount = Math.max(...member.activity.map((a) => a.count), 1)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800">
      {/* Avatar */}
      <div className="relative shrink-0">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={member.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              {getInitials(member.name)}
            </span>
          </div>
        )}
        {/* Streak badge */}
        {member.currentStreak >= 3 && (
          <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {member.currentStreak > 9 ? '9+' : member.currentStreak}
          </span>
        )}
      </div>

      {/* Nom + stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-100 truncate">
            {member.name}
          </p>
          <span className="text-[11px] text-stone-500 dark:text-stone-400 shrink-0 flex items-center gap-0.5">
            <BookOpen className="w-3 h-3" />
            {member.totalThisPeriod > 0
              ? `${member.totalThisPeriod} hizb${member.totalThisPeriod > 1 ? 's' : ''}`
              : 'aucun'}
          </span>
        </div>

        {/* Mini barres — 7 jours */}
        <div className="flex items-end gap-[3px] h-7">
          {member.activity.map((day) => {
            const isToday = day.date === today
            const heightPct = day.count === 0 ? 0.12 : Math.max(0.2, day.count / maxCount)
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={cn(
                    'w-full rounded-sm transition-all duration-300',
                    barColor(day.count, maxCount),
                    isToday && 'ring-1 ring-amber-500 ring-offset-0',
                  )}
                  style={{ height: `${Math.round(heightPct * 20)}px` }}
                  title={`${day.date}: ${day.count} hizb${day.count > 1 ? 's' : ''}`}
                />
                <span className={cn(
                  'text-[8px] leading-none',
                  isToday ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-stone-400 dark:text-stone-600',
                )}>
                  {dayLabel(day.date)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

interface MemberActivityCardsProps {
  /** ID du groupe à afficher */
  groupId: string
  /** Nombre de jours à afficher (défaut : 7) */
  days?: number
}

/**
 * Affiche les cartes d'activité journalière (hizbs lus) pour chaque membre du groupe.
 */
export function MemberActivityCards({ groupId, days = 7 }: MemberActivityCardsProps) {
  const { data, isLoading, isError } = useQuery<MemberActivity[]>({
    queryKey: ['group-activity', groupId, days],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse>(`/api/groups/${groupId}/activity?days=${days}`)
      return res.data
    },
    staleTime: 2 * 60 * 1000,   // 2 min
    refetchInterval: 5 * 60 * 1000,  // 5 min
    enabled: !!groupId,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="text-center text-sm text-stone-400 py-4">
        Impossible de charger l&apos;activité
      </p>
    )
  }

  if (data.length === 0) {
    return (
      <p className="text-center text-sm text-stone-400 py-4">
        Aucun membre dans ce groupe
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {data.map((member) => (
        <MemberCard key={member.userId} member={member} />
      ))}
    </div>
  )
}
