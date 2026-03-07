'use client'
/**
 * @file HeatmapCalendar — Calendrier de révision style GitHub
 */
import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
import { format, eachDayOfInterval, subWeeks, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

interface RevisionDay {
  date: string       // ISO date YYYY-MM-DD
  count: number      // nombre de sourates révisées
  duration: number   // durée totale en minutes
}

interface HeatmapCalendarProps {
  data: RevisionDay[]
  currentStreak: number
  longestStreak: number
}

function getIntensity(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900'
  if (count === 2) return 'bg-emerald-300 dark:bg-emerald-800'
  if (count <= 4) return 'bg-emerald-400 dark:bg-emerald-700'
  return 'bg-emerald-600 dark:bg-emerald-500'
}

/**
 * Calendrier de révision — 52 semaines × 7 jours
 */
export function HeatmapCalendar({ data, currentStreak, longestStreak }: HeatmapCalendarProps) {
  const today = new Date()
  const startDate = startOfWeek(subWeeks(today, 51), { weekStartsOn: 1 })

  const allDays = useMemo(() =>
    eachDayOfInterval({ start: startDate, end: today }),
    [startDate, today]
  )

  const dataMap = useMemo(() => {
    const map = new Map<string, RevisionDay>()
    data.forEach((d) => map.set(d.date, d))
    return map
  }, [data])

  // Grouper par semaine
  const weeks: Date[][] = []
  let currentWeek: Date[] = []
  allDays.forEach((day, i) => {
    currentWeek.push(day)
    if (currentWeek.length === 7 || i === allDays.length - 1) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  const totalRevisions = data.reduce((acc, d) => acc + d.count, 0)

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-orange-500 font-bold text-lg">{currentStreak}</span>
          <span className="text-muted-foreground">🔥 streak actuel</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold text-lg">{longestStreak}</span>
          <span className="text-muted-foreground">record</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold text-lg">{totalRevisions}</span>
          <span className="text-muted-foreground">révisions totales</span>
        </div>
      </div>

      {/* Grille */}
      <TooltipProvider>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayData = dataMap.get(dateStr)
                  const count = dayData?.count ?? 0

                  return (
                    <Tooltip key={dateStr}>
                      <TooltipTrigger asChild>
                        <div
                          className={`
                            w-3.5 h-3.5 rounded-sm cursor-default transition-opacity hover:opacity-80
                            ${getIntensity(count)}
                          `}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{format(day, 'dd MMMM yyyy', { locale: fr })}</p>
                        {count > 0 ? (
                          <>
                            <p>{count} sourate{count > 1 ? 's' : ''} révisée{count > 1 ? 's' : ''}</p>
                            <p>{dayData?.duration} min</p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">Aucune révision</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      {/* Légende */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Moins</span>
        {[0, 1, 2, 3, 5].map((v) => (
          <div key={v} className={`w-3.5 h-3.5 rounded-sm ${getIntensity(v)}`} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  )
}
