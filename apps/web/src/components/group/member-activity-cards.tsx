'use client'
/**
 * @file MemberActivityCards — Activité du groupe par membre
 * @description
 *  - GroupDaySummary : graphique en barres plein mois (tout le groupe)
 *  - MemberCard      : fenêtre glissante de 7 jours (navigation ← →)
 *    La fenêtre est partagée entre toutes les cards → comparaison facile
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'

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

function barColor(count: number, isToday: boolean): string {
  if (count === 0) return 'bg-stone-200 dark:bg-stone-700'
  if (isToday)     return 'bg-amber-500'
  if (count === 1) return 'bg-amber-300'
  if (count <= 3)  return 'bg-amber-400'
  return 'bg-amber-500'
}

/** Formate "2026-03-17" → "17 mar." */
function shortDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Abréviation du jour de la semaine */
function dayLetter(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()] ?? ''
}

// ── Vue agrégée groupe / jour complet ─────────────────────────────────────────

interface DayStat {
  date: string
  total: number
  activeMembers: { name: string; count: number }[]
}

function GroupDaySummary({ members }: { members: MemberActivity[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const [hovered, setHovered] = useState<string | null>(null)

  if (members.length === 0) return null

  const dateMap = new Map<string, DayStat>()
  for (const member of members) {
    for (const day of member.activity) {
      if (!dateMap.has(day.date))
        dateMap.set(day.date, { date: day.date, total: 0, activeMembers: [] })
      const stat = dateMap.get(day.date)!
      stat.total += day.count
      if (day.count > 0)
        stat.activeMembers.push({ name: member.name, count: day.count })
    }
  }

  const days = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  const maxTotal = Math.max(...days.map(d => d.total), 1)
  const BAR_MAX_H = 36

  return (
    <div className="rounded-xl bg-stone-50 dark:bg-stone-800/50 p-3 space-y-1.5">
      <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
        Total groupe / jour
      </p>
      <div className="flex items-end gap-[3px] overflow-x-auto scrollbar-none select-none pb-1">
        {days.map((day) => {
          const dayNum = parseInt(day.date.split('-')[2] ?? '0')
          const isToday = day.date === today
          const barH = day.total > 0 ? Math.max(3, Math.round((day.total / maxTotal) * BAR_MAX_H)) : 2
          const isHov = hovered === day.date

          return (
            <div
              key={day.date}
              className="relative flex flex-col items-center gap-[2px] flex-shrink-0"
              style={{ minWidth: 13 }}
              onMouseEnter={() => setHovered(day.date)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(hovered === day.date ? null : day.date)}
            >
              {/* Tooltip */}
              {day.total > 0 && (
                <div className={cn(
                  'absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20',
                  'bg-stone-800 text-white rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-lg',
                  'pointer-events-none transition-opacity duration-100',
                  isHov ? 'opacity-100' : 'opacity-0',
                )}>
                  <p className="font-bold mb-0.5">{shortDate(day.date)} · {day.total} hz</p>
                  {day.activeMembers.map(m => (
                    <p key={m.name} className="text-stone-300">{m.name} — {m.count}hz</p>
                  ))}
                </div>
              )}
              <div
                className={cn(
                  'w-full rounded-sm transition-all duration-200',
                  day.total === 0 ? 'bg-stone-200 dark:bg-stone-700' : isToday ? 'bg-amber-500' : 'bg-amber-400',
                  isToday && 'ring-1 ring-amber-600 ring-offset-[1px]',
                )}
                style={{ height: barH, minWidth: 11 }}
              />
              <span className={cn(
                'text-[7px] leading-none tabular-nums',
                isToday ? 'text-amber-600 font-bold' : 'text-stone-400 dark:text-stone-600',
              )}>
                {dayNum}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Card membre — fenêtre 7 jours ─────────────────────────────────────────────

function MemberCard({
  member,
  visibleDays,
}: {
  member: MemberActivity
  visibleDays: string[]   // 7 dates YYYY-MM-DD
}) {
  const today = new Date().toISOString().slice(0, 10)

  // Construire une map date → count pour ce membre
  const dayMap = new Map(member.activity.map(d => [d.date, d.count]))

  const BAR_MAX_H = 32

  return (
    <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800">
      {/* En-tête */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="relative shrink-0">
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {getInitials(member.name)}
              </span>
            </div>
          )}
          {member.currentStreak >= 3 && (
            <span className="absolute -bottom-1 -right-1 text-[9px] leading-none">🔥</span>
          )}
        </div>
        <p className="flex-1 text-[13px] font-semibold text-stone-800 dark:text-stone-100 truncate">
          {member.name}
        </p>
        <span className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-1 shrink-0">
          <BookOpen className="w-3 h-3" />
          {member.totalThisPeriod > 0 ? `${member.totalThisPeriod} hz` : '—'}
        </span>
      </div>

      {/* Barres 7 jours */}
      <div className="flex items-end gap-1.5">
        {visibleDays.map((date) => {
          const count = dayMap.get(date) ?? 0
          const isToday = date === today
          const barH = count > 0 ? Math.max(6, Math.round((count / 4) * BAR_MAX_H)) : 3
          const letter = dayLetter(date)
          const dayNum = parseInt(date.split('-')[2] ?? '0')

          return (
            <div
              key={date}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${shortDate(date)} : ${count} hizb${count !== 1 ? 's' : ''}`}
            >
              {/* Hauteur fixe pour aligner les barres au bas */}
              <div className="flex items-end w-full" style={{ height: BAR_MAX_H }}>
                <div
                  className={cn(
                    'w-full rounded-sm transition-all duration-300',
                    barColor(count, isToday),
                    isToday && 'ring-1 ring-amber-500 ring-offset-[1px]',
                  )}
                  style={{ height: barH }}
                />
              </div>
              {/* Jour lettre */}
              <span className={cn(
                'text-[9px] font-semibold leading-none',
                isToday ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-600',
              )}>
                {letter}
              </span>
              {/* Numéro */}
              <span className={cn(
                'text-[8px] leading-none tabular-nums',
                isToday ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-stone-300 dark:text-stone-600',
              )}>
                {dayNum}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

interface MemberActivityCardsProps {
  groupId: string
  month: string   // YYYY-MM
}

/**
 * - GroupDaySummary : graphique plein mois
 * - MemberCard x N  : fenêtre de 7 jours navigable (← →)
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

  // ── Liste ordonnée de tous les jours du mois ──────────────────────────────
  const allDates = useMemo<string[]>(() => {
    if (!data || data.length === 0) return []
    const set = new Set<string>()
    for (const m of data) for (const d of m.activity) set.add(d.date)
    return Array.from(set).sort()
  }, [data])

  // ── Fenêtre 7 jours — défaut : 7 derniers jours du mois ──────────────────
  const [windowEnd, setWindowEnd] = useState<number | null>(null)
  // windowEnd = index inclusif du dernier jour affiché (null = fin)
  const resolvedEnd  = windowEnd ?? Math.max(allDates.length - 1, 0)
  const resolvedStart = Math.max(0, resolvedEnd - 6)
  const visibleDates = allDates.slice(resolvedStart, resolvedEnd + 1)

  // Padding si moins de 7 jours (début de mois)
  const padded: string[] = visibleDates.length < 7
    ? [...Array(7 - visibleDates.length).fill(''), ...visibleDates]
    : visibleDates

  const canPrev = resolvedStart > 0
  const canNext = resolvedEnd < allDates.length - 1

  // ── Libellé de la fenêtre courante ────────────────────────────────────────
  const windowLabel = visibleDates.length >= 2
    ? `${shortDate(visibleDates[0]!)} – ${shortDate(visibleDates[visibleDates.length - 1]!)}`
    : ''

  // ── Loading / error ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
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
      {/* Graphique agrégé — plein mois */}
      <GroupDaySummary members={data} />

      {/* Navigateur de fenêtre — partagé pour toutes les cards */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setWindowEnd(Math.max(resolvedEnd - 1, 6))}
          disabled={!canPrev}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 disabled:opacity-25"
          aria-label="Jours précédents"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
          {windowLabel}
        </span>

        <button
          onClick={() => setWindowEnd(Math.min(resolvedEnd + 1, allDates.length - 1))}
          disabled={!canNext}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 disabled:opacity-25"
          aria-label="Jours suivants"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cards membres */}
      {data.map((member) => (
        <MemberCard key={member.userId} member={member} visibleDays={padded} />
      ))}
    </div>
  )
}
