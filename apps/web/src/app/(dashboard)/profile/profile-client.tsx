'use client'
/**
 * @file ProfileClient — Profil utilisateur avec CRUD progression
 */
import { useState, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'
import { SurahTree } from '@/components/quran/surah-tree'
import { HeatmapCalendar } from '@/components/quran/heatmap-calendar'
import { SurahUpdateModal } from '@/components/quran/surah-update-modal'
import type { Surah, MemorizationStatus } from '@quran-tracker/types'

interface ProgressEntry {
  surahId: number
  status: MemorizationStatus
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

interface SelectedSurah {
  surahId: number
  nameAr: string
  nameFr: string
  number: number
  versesCount: number
  status: MemorizationStatus
}

export function ProfileClient() {
  const { data: session, isPending } = useSession()
  const user = session?.user as SessionUser | undefined
  const [selectedSurah, setSelectedSurah] = useState<SelectedSurah | null>(null)

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => apiFetch<ProgressEntry[]>(`/api/progress/${user!.id}`),
    enabled: !!user?.id,
  })

  const { data: allSurahs, isLoading: surahsLoading } = useQuery({
    queryKey: ['surahs'],
    queryFn: () => apiFetch<Surah[]>('/api/surahs'),
  })

  const progressMap = new Map(progress?.map((p) => [p.surahId, p.status]) ?? [])

  const surahsWithStatus = allSurahs?.map((s) => ({
    ...s,
    status: progressMap.get(s.id) ?? 'not_started' as MemorizationStatus,
  })) ?? []

  const surahsMemorized = surahsWithStatus.filter(
    (s) => s.status === 'memorized' || s.status === 'consolidated'
  ).length

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const currentStreak = Number(user?.currentStreak ?? 0)
  const longestStreak = Number(user?.longestStreak ?? 0)
  const xp = Number(user?.xp ?? 0)

  const heatmapData = progress
    ?.filter((p) => p.lastRevisedAt)
    .map((p) => ({
      date: new Date(p.lastRevisedAt!).toISOString().split('T')[0]!,
      count: 1,
      duration: 0,
    })) ?? []

  if (isPending || progressLoading || surahsLoading) {
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
        <h2 className="text-lg font-semibold mb-4">Calendrier de révision</h2>
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
        <h2 className="text-lg font-semibold mb-1">Mes sourates</h2>
        <p className="text-sm text-muted-foreground mb-4">Cliquez sur une sourate pour mettre à jour votre progression</p>
        <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-lg" />}>
          <SurahTree
            surahs={surahsWithStatus}
            onSurahClick={(surah) => {
              setSelectedSurah({
                surahId: surah.id,
                nameAr: surah.nameAr,
                nameFr: surah.nameFr,
                number: surah.number,
                versesCount: surah.versesCount,
                status: surah.status,
              })
            }}
          />
        </Suspense>
      </div>

      {/* Modal mise à jour */}
      {selectedSurah && user && (
        <SurahUpdateModal
          surah={selectedSurah}
          userId={user.id}
          onClose={() => setSelectedSurah(null)}
        />
      )}
    </div>
  )
}
