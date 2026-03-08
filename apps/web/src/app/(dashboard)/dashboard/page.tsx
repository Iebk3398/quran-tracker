/**
 * @file Page Dashboard Groupe
 * @description Vue d'ensemble : stats, leaderboard, feed — données live depuis l'API
 */
import type { Metadata } from 'next'
import { DashboardClient } from './dashboard-client'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <DashboardClient />
    </div>
  )
}
