/**
 * @file Page Profil Individuel
 */
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SurahTree } from '@/components/quran/surah-tree'
import { HeatmapCalendar } from '@/components/quran/heatmap-calendar'

export const metadata: Metadata = { title: 'Mon Profil' }

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header profil */}
      <div className="flex items-start gap-4 p-6 rounded-xl border bg-card">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-3xl font-bold text-emerald-600 flex-shrink-0">
          U
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">Hafiz débutant</p>
          <div className="flex gap-4 mt-3 text-sm">
            <div className="text-center">
              <div className="font-bold text-emerald-600 text-xl">0</div>
              <div className="text-muted-foreground">Sourates</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-amber-600 text-xl">0</div>
              <div className="text-muted-foreground">XP</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-orange-600 text-xl">0 🔥</div>
              <div className="text-muted-foreground">Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendrier de révision */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">📅 Calendrier de révision</h2>
        <Suspense fallback={<div className="h-24 bg-muted animate-pulse rounded-lg" />}>
          <HeatmapCalendar data={[]} currentStreak={0} longestStreak={0} />
        </Suspense>
      </div>

      {/* Arbre des sourates */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">📖 Mes sourates</h2>
        <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded-lg" />}>
          <SurahTree surahs={[]} />
        </Suspense>
      </div>
    </div>
  )
}
