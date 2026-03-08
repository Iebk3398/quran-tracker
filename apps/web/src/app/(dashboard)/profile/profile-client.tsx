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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 rounded-xl border bg-card">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-2xl font-bold text-emerald-600 flex-shrink-0 overflow-hidden">
          {user?.image
            ? <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{user?.name ?? 'Mon Profil'}</h1>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
        {earnedBadges.length > 0 && (
          <div className="flex gap-1">
            {earnedBadges.slice(0, 3).map(b => (
              <span key={b.id} title={b.name} className="text-2xl">{b.emoji}</span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-emerald-600">{surahsMemorized}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Sourates</div>
        </div>
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-orange-500">{currentStreak}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Jours 🔥</div>
        </div>
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-amber-500">{xp.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">XP Total</div>
        </div>
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-blue-500">{longestStreak}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Record 🏆</div>
        </div>
      </div>

      {/* Activité */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Activité — 12 derniers mois</h2>
        <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded-lg" />}>
          <HeatmapCalendar data={heatmapData} currentStreak={currentStreak} longestStreak={longestStreak} />
        </Suspense>
      </div>

      {/* Progression Coran */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Progression Coran</h2>
          <Link href="/surahs" className="text-xs text-emerald-600 hover:underline font-medium">
            Voir tout →
          </Link>
        </div>

        {juzProgress.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <p>Aucune progression pour l&apos;instant</p>
            <Link href="/surahs" className="text-emerald-600 hover:underline mt-1 inline-block">
              Commencer maintenant →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {juzProgress.map(({ juz, pct, firstName, lastName }) => (
              <div key={juz}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">Juz {juz} <span className="text-muted-foreground text-xs">({firstName} → {lastName})</span></span>
                  <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-stone-500'}`}>{pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-stone-400'}`}
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
