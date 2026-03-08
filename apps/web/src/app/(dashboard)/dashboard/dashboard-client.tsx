'use client'
/**
 * @file DashboardClient — Récupère et affiche les données réelles du groupe
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'
import { GroupStats } from '@/components/group/group-stats'
import { Leaderboard } from '@/components/group/leaderboard'
import { GroupFeed } from '@/components/group/group-feed'
import { ActiveStreaks } from '@/components/group/active-streaks'
import type { GroupStats as GroupStatsType, LeaderboardEntry, FeedItem } from '@quran-tracker/types'

interface MyGroup {
  id: string
  name: string
  description: string | null
  inviteCode: string
  sheikhId: string
  role: string
}

interface ApiLeaderboardEntry {
  userId: string
  name: string
  avatar: string | null
  xp: string
  currentStreak: string
  surahsMemorized: number
}

/** Calcule les stats du groupe depuis le leaderboard */
function computeGroupStats(entries: ApiLeaderboardEntry[]): GroupStatsType {
  const totalMembers = entries.length
  const activeMembers = entries.filter(
    (e) => e.surahsMemorized > 0 || Number(e.currentStreak) > 0
  ).length
  const totalSurahsMemorized = entries.reduce((sum, e) => sum + Number(e.surahsMemorized), 0)
  const groupProgressPercent =
    totalMembers > 0 ? Math.round((totalSurahsMemorized / (totalMembers * 114)) * 100) : 0
  const averageStreak =
    totalMembers > 0
      ? Math.round(entries.reduce((sum, e) => sum + Number(e.currentStreak), 0) / totalMembers)
      : 0

  return { totalMembers, activeMembers, totalSurahsMemorized, groupProgressPercent, averageStreak }
}

/** Mappe la réponse API vers le type LeaderboardEntry */
function mapLeaderboard(entries: ApiLeaderboardEntry[]): LeaderboardEntry[] {
  return entries.map((e, i) => ({
    userId: e.userId,
    name: e.name,
    avatar: e.avatar,
    surahsMemorized: Number(e.surahsMemorized),
    versesMemorized: 0,
    totalXp: Number(e.xp),
    currentStreak: Number(e.currentStreak),
    rank: i + 1,
  }))
}

export function DashboardClient() {
  const { data: session, isPending: sessionLoading } = useSession()
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const { data: myGroups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => apiFetch<MyGroup[]>('/api/groups/me'),
    enabled: !!session?.user,
  })

  const group = myGroups?.[0]
  const groupId = group?.id

  const { data: rawLeaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['leaderboard', groupId],
    queryFn: () => apiFetch<ApiLeaderboardEntry[]>(`/api/groups/${groupId}/leaderboard`),
    enabled: !!groupId,
  })

  const { data: feedItems, isLoading: feedLoading } = useQuery({
    queryKey: ['feed', groupId],
    queryFn: () => apiFetch<FeedItem[]>(`/api/feed/group/${groupId}`),
    enabled: !!groupId,
  })

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoining(true)
    setJoinError(null)
    try {
      await apiFetch('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      })
      await refetchGroups()
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setJoining(false)
    }
  }

  if (sessionLoading || groupsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="text-6xl">🕌</div>
        <h2 className="text-xl font-semibold">Vous n'avez pas encore rejoint de groupe</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Entrez le code d'invitation de votre Sheikh pour rejoindre une halqa.
        </p>
        <form onSubmit={handleJoin} className="flex gap-2 w-full max-w-sm">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Code d'invitation (ex: ABC12345)"
            className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            maxLength={12}
          />
          <button
            type="submit"
            disabled={joining || inviteCode.length < 6}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {joining ? '...' : 'Rejoindre'}
          </button>
        </form>
        {joinError && <p className="text-sm text-red-500">{joinError}</p>}
      </div>
    )
  }

  const leaderboard = rawLeaderboard ? mapLeaderboard(rawLeaderboard) : []
  const groupStats = rawLeaderboard ? computeGroupStats(rawLeaderboard) : undefined
  const streakMembers = rawLeaderboard
    ?.filter((e) => Number(e.currentStreak) > 0)
    .map((e) => ({
      userId: e.userId,
      name: e.name,
      avatar: e.avatar,
      currentStreak: Number(e.currentStreak),
    })) ?? []

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground text-sm">
            {group.description ?? 'Suivi en temps réel de votre halqa'}
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          Code : {group.inviteCode}
        </span>
      </div>

      <GroupStats stats={groupStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Leaderboard entries={leaderboard} isLoading={lbLoading} />
        </div>
        <div>
          <ActiveStreaks members={streakMembers} />
        </div>
      </div>

      <GroupFeed items={feedItems ?? []} isLoading={feedLoading} />
    </>
  )
}
