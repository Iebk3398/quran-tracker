'use client'
/**
 * @file ProfileClient — Profil utilisateur avec données réelles
 */
import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'
import { SurahTree } from '@/components/quran/surah-tree'
import { HeatmapCalendar } from '@/components/quran/heatmap-calendar'

interface ProgressEntry {
  surahId: number
  status: 'not_started' | 'in_progress' | 'memorized' | 'consolidated'
  retentionScore?: number
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

export function ProfileClient() {
  const { data: session, isPending } = useSession()
  const user = session?.user as SessionUser | undefined

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => apiFetch<ProgressEntry[]>(`/api/progress/${user!.id}`),
    enabled: !!user?.id,
  })

  const surahsMemorized = progress?.filter(
    (p) => p.status === 'memorized' || p.status === 'consolidated'
  ).length ?? 0

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const currentStreak = Number(user?.currentStreak ?? 0)
  const longestStreak = Number(user?.longestStreak ?? 0)
  const xp = Number(user?.xp ?? 0)

  // Données pour le heatmap (jours avec révision)
  const heatmapData = progress
    ?.filter((p) => p.lastRevisedAt)
    .map((p) => ({
      date: new Date(p.lastRevisedAt!).toISOString().split('T')[0]!,
      count: 1,
    })) ?? []

  if (isPending || progressLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header profil */}
      <div className="flex items-start gap-4 p-6 rounded-xl border bg-card">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-3xl font-bold text-emerald-600 flex-shrink-0 overflow-hidden">
          {user?.image
            ? <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user?.name ?? 'Mon Profil'}</h1>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
          <div className="flex gap-6 mt-3 text-sm">
            <div className="text-center">
              <div className="font-bold text-emerald-600 text-xl">{surahsMemorized}</div>
              <div className="text-muted-foreground">Sourates</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-amber-600 text-xl">{xp}</div>
              <div className="text-muted-foreground">XP</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-orange-600 text-xl">{currentStreak} 🔥</div>
              <div className="text-muted-foreground">Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendrier de révision */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">📅 Calendrier de révision</h2>
        <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded-lg" />}>
          <HeatmapCalendar
            data={heatmapData}
            currentStreak={currentStreak}
            longestStreak={longestStreak}
          />
        </Suspense>
      </div>

      {/* Arbre des sourates */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">📖 Mes sourates</h2>
        <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-lg" />}>
          <SurahTree surahs={progress ?? []} />
        </Suspense>
      </div>
    </div>
  )
}
