'use client'
/**
 * @file ProfileClient — Profil utilisateur (stats + heatmap + progression Juz)
 */
import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'
import { HeatmapCalendar } from '@/components/quran/heatmap-calendar'
import Link from 'next/link'
import type { Surah, MemorizationStatus } from '@quran-tracker/types'

interface ProgressEntry {
  surahId: number
  status: MemorizationStatus
  lastRevisedAt?: string | null
}

interface SessionUser {
  id: string
  name: string
  email: string
  image?: string | null
  xp?: string
  currentStreak?: string
  longestStreak?: string
}

const BADGE_DEFS = [
  { id: 'first_surah', name: 'Premier pas', emoji: '🌱', desc: 'Première sourate mémorisée' },
  { id: 'juz_amma', name: 'Juz Amma', emoji: '📖', desc: 'Juz 30 complet' },
  { id: 'streak_7', name: 'Série 7j', emoji: '🔥', desc: '7 jours de suite' },
  { id: 'streak_30', name: 'Série 30j', emoji: '⚡', desc: '30 jours de suite' },
  { id: 'hafiz', name: 'Hafiz', emoji: '🏆', desc: '114 sourates mémorisées' },
]

export function ProfileClient() {
  const { data: session, isPending } = useSession()
  const user = session?.user as SessionUser | undefined

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => apiFetch<ProgressEntry[]>(`/api/progress/${user!.id}`),
    enabled: !!user?.id,
  })

  const { data: allSurahs } = useQuery({
    queryKey: ['surahs'],
    queryFn: () => apiFetch<Surah[]>('/api/surahs'),
  })

  const progressMap = new Map(progress?.map((p) => [p.surahId, p.status]) ?? [])

  const surahsWithStatus = allSurahs?.map((s) => ({
    ...s,
    status: progressMap.get(s.id) ?? 'not_started' as MemorizationStatus,
  })) ?? []

  const surahsMemorized = surahsWithStatus.filter(
    s => s.status === 'memorized' || s.status === 'consolidated'
  ).length

  // Juz progression — top 5 with most progress
  const juzProgress = Array.from({ length: 30 }, (_, i) => {
    const juz = i + 1
    const juzSurahs = surahsWithStatus.filter(s => s.juzNumber === juz)
    if (juzSurahs.length === 0) return null
    const done = juzSurahs.filter(s => s.status === 'memorized' || s.status === 'consolidated').length
    const pct = Math.round((done / juzSurahs.length) * 100)
    const firstName = juzSurahs[0]?.nameFr ?? ''
    const lastName = juzSurahs[juzSurahs.length - 1]?.nameFr ?? ''
    return { juz, pct, done, total: juzSurahs.length, firstName, lastName }
  })
    .filter((j): j is NonNullable<typeof j> => j !== null && j.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)

  // Earned badges (simple logic based on progress)
  const earnedBadges = BADGE_DEFS.filter(b => {
    if (b.id === 'first_surah') return surahsMemorized >= 1
    if (b.id === 'juz_amma') {
      const juz30 = surahsWithStatus.filter(s => s.juzNumber === 30)
      return juz30.length > 0 && juz30.every(s => s.status === 'memorized' || s.status === 'consolidated')
    }
    if (b.id === 'streak_7') return Number(user?.currentStreak ?? 0) >= 7
    if (b.id === 'streak_30') return Number(user?.currentStreak ?? 0) >= 30
    if (b.id === 'hafiz') return surahsMemorized >= 114
    return false
  })

  const currentStreak = Number(user?.currentStreak ?? 0)
  const longestStreak = Number(user?.longestStreak ?? 0)
  const xp = Number(user?.xp ?? 0)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const heatmapData = progress
    ?.filter(p => p.lastRevisedAt)
    .map(p => ({
      date: new Date(p.lastRevisedAt!).toISOString().split('T')[0]!,
      count: 1,
      duration: 0,
    })) ?? []

  if (isPending || progressLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 bg-muted rounded-xl" />
        <div className="grid grid-cols-4 gap-3"><div className="h-20 bg-muted rounded-xl col-span-4" /></div>
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">

      {/* Hero header */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xl font-bold text-emerald-600 overflow-hidden">
              {user?.image
                ? <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                : initials}
            </div>
            {currentStreak > 0 && (
              <span className="absolute -bottom-1 -right-1 text-sm leading-none">🔥</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{user?.name ?? 'Mon Profil'}</h1>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          {earnedBadges.length > 0 && (
            <div className="flex gap-0.5 flex-shrink-0">
              {earnedBadges.slice(0, 3).map(b => (
                <span key={b.id} title={b.name} className="text-xl">{b.emoji}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats inline */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
          {[
            { value: surahsMemorized, label: 'Sourates', color: 'text-emerald-600' },
            { value: currentStreak, label: 'Jours streak', color: 'text-orange-500' },
            { value: xp.toLocaleString(), label: 'XP total', color: 'text-amber-500' },
            { value: longestStreak, label: 'Record', color: 'text-blue-500' },
          ].map(({ value, label, color }) => (
            <div key={label} className="text-center">
              <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Activité */}
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activité — 12 mois</p>
        <Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-lg" />}>
          <HeatmapCalendar data={heatmapData} currentStreak={currentStreak} longestStreak={longestStreak} />
        </Suspense>
      </div>

      {/* Progression Coran */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progression Coran</p>
          <Link href="/surahs" className="text-xs text-emerald-600 font-semibold hover:underline">
            Voir tout →
          </Link>
        </div>

        {juzProgress.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">Aucune progression pour l'instant</p>
            <Link href="/surahs"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline"
            >
              Commencer maintenant →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {juzProgress.map(({ juz, pct, firstName, lastName }) => (
              <div key={juz} className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium">Juz {juz}</span>
                  <span className="text-xs text-muted-foreground">{firstName} → {lastName}</span>
                  <span className={`text-xs font-bold tabular-nums ml-2 ${pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-stone-400'}`}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-stone-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
