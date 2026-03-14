'use client'
/**
 * @file HeatmapCalendar — Calendrier de révision avec vues Semaine / Mois / Année
 */
import { useMemo, useState } from 'react'
import { format, eachDayOfInterval, subWeeks, subDays, startOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

interface RevisionDay {
  date: string       // ISO date YYYY-MM-DD
  count: number      // nombre de sourates révisées
  duration: number   // durée totale en minutes
}

interface HeatmapCalendarProps {
  data: RevisionDay[]
}

type View = 'week' | 'month' | 'year'

function getIntensity(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900'
  if (count === 2) return 'bg-emerald-300 dark:bg-emerald-800'
  if (count <= 4) return 'bg-emerald-400 dark:bg-emerald-700'
  return 'bg-emerald-600 dark:bg-emerald-500'
}

const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

/** Vue Semaine — 7 derniers jours en barres */
function WeekView({ dataMap }: { dataMap: Map<string, RevisionDay> }) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i))
  const maxCount = Math.max(1, ...days.map(d => dataMap.get(format(d, 'yyyy-MM-dd'))?.count ?? 0))

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-24">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const d = dataMap.get(dateStr)
          const count = d?.count ?? 0
          const pct = count / maxCount
          const isToday = dateStr === format(today, 'yyyy-MM-dd')

          return (
            <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
                <div
                  className={`w-full rounded-t-md transition-all ${count > 0 ? 'bg-emerald-500' : 'bg-muted'} ${isToday ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                  style={{ height: count > 0 ? `${Math.max(6, pct * 100)}%` : 4 }}
                  title={`${count} révision${count !== 1 ? 's' : ''}`}
                />
              </div>
              <span className={`text-[10px] font-medium ${isToday ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}`}>
                {format(day, 'EEE', { locale: fr }).slice(0, 1).toUpperCase()}
              </span>
              <span className="text-[10px] text-muted-foreground">{format(day, 'd')}</span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 pt-1 text-xs text-muted-foreground border-t">
        {days.map(day => {
          const d = dataMap.get(format(day, 'yyyy-MM-dd'))
          return d ? (
            <div key={format(day, 'yyyy-MM-dd')} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{format(day, 'EEE', { locale: fr })} : {d.count} sourate{d.count !== 1 ? 's' : ''}</span>
            </div>
          ) : null
        })}
        {days.every(d => !dataMap.get(format(d, 'yyyy-MM-dd'))) && (
          <span className="italic">Aucune révision cette semaine</span>
        )}
      </div>
    </div>
  )
}

/** Vue Mois — 30 derniers jours en grille */
function MonthView({ dataMap }: { dataMap: Map<string, RevisionDay> }) {
  const today = new Date()
  const firstDay = startOfMonth(today)
  const lastDay = endOfMonth(today)
  const days = eachDayOfInterval({ start: firstDay, end: lastDay })
  // Offset pour commencer le lundi
  const startDow = (firstDay.getDay() + 6) % 7 // 0=Mon

  return (
    <div className="space-y-2">
      {/* En-têtes jours */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_FR.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>
      {/* Grille */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDow }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const d = dataMap.get(dateStr)
          const count = d?.count ?? 0
          const isToday = dateStr === format(today, 'yyyy-MM-dd')
          const isFuture = day > today

          return (
            <div
              key={dateStr}
              title={count > 0 ? `${count} révision${count !== 1 ? 's' : ''}` : format(day, 'd MMMM', { locale: fr })}
              className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium
                ${isFuture ? 'opacity-30' : ''}
                ${isToday ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}
                ${count > 0 ? getIntensity(count) + ' text-emerald-900 dark:text-emerald-100' : 'bg-muted text-muted-foreground'}
              `}
            >
              {format(day, 'd')}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {format(today, 'MMMM yyyy', { locale: fr })} — {days.filter(d => (dataMap.get(format(d, 'yyyy-MM-dd'))?.count ?? 0) > 0).length} jours actifs
      </p>
    </div>
  )
}

/** Vue Année — heatmap 52 semaines */
function YearView({ dataMap }: { dataMap: Map<string, RevisionDay> }) {
  const today = useMemo(() => new Date(), [])
  const startDate = useMemo(() => startOfWeek(subWeeks(today, 51), { weekStartsOn: 1 }), [today])
  const allDays = useMemo(() => eachDayOfInterval({ start: startDate, end: today }), [startDate, today])

  const weeks = useMemo(() => {
    const result: Date[][] = []
    let currentWeek: Date[] = []
    allDays.forEach((day, i) => {
      currentWeek.push(day)
      if (currentWeek.length === 7 || i === allDays.length - 1) {
        result.push(currentWeek)
        currentWeek = []
      }
    })
    return result
  }, [allDays])

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { weekIdx: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const month = week[0]!.getMonth()
      if (month !== lastMonth) {
        labels.push({ weekIdx: wi, label: MONTHS_SHORT[month]! })
        lastMonth = month
      }
    })
    return labels
  }, [weeks])

  return (
    <div className="space-y-1">
      {/* Month labels */}
      <div className="relative flex gap-1 text-[10px] text-muted-foreground" style={{ paddingLeft: 0 }}>
        {monthLabels.map(({ weekIdx, label }) => (
          <div key={label} className="absolute" style={{ left: weekIdx * (14 + 4) }}>
            {label}
          </div>
        ))}
      </div>
      <div style={{ height: 12 }} />

      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const count = dataMap.get(dateStr)?.count ?? 0
                return (
                  <div
                    key={dateStr}
                    title={`${format(day, 'dd MMMM', { locale: fr })} — ${count} révision${count !== 1 ? 's' : ''}`}
                    className={`w-3.5 h-3.5 rounded-sm cursor-default transition-opacity hover:opacity-80 ${getIntensity(count)}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
        <span>Moins</span>
        {[0, 1, 2, 3, 5].map((v) => (
          <div key={v} className={`w-3.5 h-3.5 rounded-sm ${getIntensity(v)}`} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  )
}

/**
 * Calendrier de révision avec vues Semaine / Mois / Année
 */
export function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const [view, setView] = useState<View>('month')

  const dataMap = useMemo(() => {
    const map = new Map<string, RevisionDay>()
    data.forEach((d) => map.set(d.date, d))
    return map
  }, [data])

  const totalRevisions = data.reduce((acc, d) => acc + d.count, 0)
  const activeDays = data.filter(d => d.count > 0).length

  const TABS: { value: View; label: string }[] = [
    { value: 'week', label: '7 jours' },
    { value: 'month', label: 'Ce mois' },
    { value: 'year', label: '12 mois' },
  ]

  return (
    <div className="space-y-3">
      {/* Stats + tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-bold text-base">{totalRevisions}</span>
            <span className="text-muted-foreground">révisions · {activeDays}j actifs</span>
          </div>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setView(t.value)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                view === t.value ? 'bg-card shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vue */}
      {view === 'week' && <WeekView dataMap={dataMap} />}
      {view === 'month' && <MonthView dataMap={dataMap} />}
      {view === 'year' && <YearView dataMap={dataMap} />}
    </div>
  )
}
