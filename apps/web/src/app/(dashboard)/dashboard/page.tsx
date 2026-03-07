/**
 * @file Page Dashboard Groupe
 * @description Vue d'ensemble : stats, leaderboard, feed
 */
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GroupStats } from '@/components/group/group-stats'
import { Leaderboard } from '@/components/group/leaderboard'
import { GroupFeed } from '@/components/group/group-feed'
import { ActiveStreaks } from '@/components/group/active-streaks'
import { DashboardSkeleton } from '@/components/shared/skeletons'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard du groupe</h1>
          <p className="text-muted-foreground text-sm">Suivi en temps réel de votre halqa</p>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        {/* Statistiques globales */}
        <GroupStats />

        {/* Grid principale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard — 2/3 de l'espace */}
          <div className="lg:col-span-2">
            <Leaderboard />
          </div>

          {/* Streaks actives — 1/3 */}
          <div>
            <ActiveStreaks />
          </div>
        </div>

        {/* Feed du groupe */}
        <GroupFeed />
      </Suspense>
    </div>
  )
}
