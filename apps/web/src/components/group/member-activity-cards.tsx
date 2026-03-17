'use client'
/**
 * @file MemberActivityCards — Activité mensuelle de chaque membre du groupe
 * @description Affiche une card par membre avec sa grille de jours du mois sélectionné.
 */
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { BookOpen } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DayActivity {
  date: string   // YYYY-MM-DD
  count: number
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

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()
}

/** Couleur du dot selon le nombre de hizbs */
function dotColor(count: number): string {
  if (count === 0)  return 'bg-stone-200 dark:bg-stone-700'
  if (count === 1)  return 'bg-amber-300'
  if (count <= 3)   return 'bg-amber-400'
  return 'bg-amber-500'
}

// ── Composant card ─────────────────────────────────────────────────────────────

function MemberCard({ member, month }: { member: MemberActivity; month: string }) {
  const today = new Date().toISOString().slice(0, 10)
  // Regrouper les jours par semaines (lignes de 7)
  const weeks: DayActivity[][] = []
  for (let i = 0; i < member.activity.length; i += 7) {
    weeks.push(member.activity.slice(i, i + 7))
  }

  return (
    <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800">
      {/* En-tête : avatar + nom + total */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="relative shrink-0">
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {getInitials(member.name)}
              </span>
            </div>
          )}
          {member.currentStreak >= 3 && (
            <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
              🔥
            </span>
          )}
        </div>
        <p className="flex-1 text-[13px] font-semibold text-stone-800 dark:text-stone-100 truncate">
          {member.name}
        </p>
        <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 shrink-0">
          <BookOpen className="w-3 h-3" />
          {member.totalThisPeriod > 0
            ? `${member.totalThisPeriod} hz`
            : '—'}
        </span>
      </div>

      {/* Grille mensuelle — dots par semaine */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-[3px]">
            {week.map((day) => {
              const isToday = day.date === today
              const dayNum = parseInt(day.date.split('-')[2] ?? '0')
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-[2px]"
                  title={`${day.date}: ${day.count} hizb${day.count !== 1 ? 's' : ''}`}
                >
                  <div className={cn(
                    'w-full rounded-sm',
                    dotColor(day.count),
                    isToday && 'ring-1 ring-amber-500 ring-offset-[1px]',
                  )}
                    style={{ height: day.count > 0 ? `${Math.min(4 + day.count * 3, 16)}px` : '4px' }}
                  />
                  <span className={cn(
                    'text-[8px] leading-none tabular-nums',
                    isToday ? 'text-amber-600 font-bold' : 'text-stone-400 dark:text-stone-600',
                  )}>
                    {dayNum}
                  </span>
                </div>
              )
            })}
            {/* Remplir la dernière semaine incomplète */}
            {week.length < 7 && [...Array(7 - week.length)].map((_, i) => (
              <div key={`pad-${i}`} className="flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

interface MemberActivityCardsProps {
  groupId: string
  /** Mois à afficher — format YYYY-MM (défaut : mois courant) */
  month: string
}

/**
 * Affiche les cartes d'activité mensuelle (hizbs lus par jour) pour chaque membre.
 */
export function MemberActivityCards({ groupId, month }: MemberActivityCardsProps) {
  const { data, isLoading, isError } = useQuery<MemberActivity[]>({
    queryKey: ['group-activity', groupId, month],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse>(`/api/groups/${groupId}/activity?month=${month}`)
      return res.data
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!groupId,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return <p className="text-center text-sm text-stone-400 py-4">Impossible de charger l&apos;activité</p>
  }

  if (data.length === 0) {
    return <p className="text-center text-sm text-stone-400 py-4">Aucun membre dans ce groupe</p>
  }

  return (
    <div className="space-y-2">
      {data.map((member) => (
        <MemberCard key={member.userId} member={member} month={month} />
      ))}
    </div>
  )
}
