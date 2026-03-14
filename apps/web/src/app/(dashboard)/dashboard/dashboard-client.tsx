'use client'
/**
 * @file DashboardClient — Récupère et affiche les données réelles du groupe
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'
import { GroupStats } from '@/components/group/group-stats'
import { Leaderboard } from '@/components/group/leaderboard'
import { GroupFeed } from '@/components/group/group-feed'
import { GroupGoal } from '@/components/group/group-goal'
import { useGroupRealtime } from '@/hooks/use-group-realtime'
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
  surahsMemorized: number
  xp?: string | number
  currentStreak?: string | number
  badges?: Array<{ name: string; iconUrl: string }>
}

/** Calcule les stats du groupe depuis le leaderboard */
function computeGroupStats(entries: ApiLeaderboardEntry[]): GroupStatsType {
  const totalMembers = entries.length
  const activeMembers = entries.filter((e) => e.surahsMemorized > 0).length
  const totalSurahsMemorized = entries.reduce((sum, e) => sum + Number(e.surahsMemorized), 0)
  const groupProgressPercent =
    totalMembers > 0 ? Math.round((totalSurahsMemorized / (totalMembers * 114)) * 100) : 0

  return { totalMembers, activeMembers, totalSurahsMemorized, groupProgressPercent, averageStreak: 0 }
}

/** Mappe la réponse API vers le type LeaderboardEntry */
function mapLeaderboard(entries: ApiLeaderboardEntry[]): LeaderboardEntry[] {
  return entries.map((e, i) => ({
    userId: e.userId,
    name: e.name,
    avatar: e.avatar,
    surahsMemorized: Number(e.surahsMemorized),
    versesMemorized: 0,
    totalXp: Number(e.xp ?? 0),
    currentStreak: Number(e.currentStreak ?? 0),
    rank: i + 1,
    badges: e.badges ?? [],
  }))
}

export function DashboardClient() {
  const { data: session, isPending: sessionLoading } = useSession()
  const queryClient = useQueryClient()

  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const [groupName, setGroupName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: myGroups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => apiFetch<MyGroup[]>('/api/groups/me'),
    enabled: !!session?.user,
  })

  const group = myGroups?.[0]
  const groupId = group?.id

  const { data: rawLeaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['group', groupId, 'leaderboard'],
    queryFn: () => apiFetch<ApiLeaderboardEntry[]>(`/api/groups/${groupId}/leaderboard`),
    enabled: !!groupId,
  })

  const { data: feedItems, isLoading: feedLoading } = useQuery({
    queryKey: ['group', groupId, 'feed'],
    queryFn: () => apiFetch<FeedItem[]>(`/api/feed/group/${groupId}`),
    enabled: !!groupId,
    // Polling de secours si Supabase Realtime n'est pas configuré
    refetchInterval: 30_000,
  })

  // Realtime WebSocket — met à jour le feed et le leaderboard automatiquement
  useGroupRealtime({ groupId: groupId ?? '', enabled: !!groupId })

  const createGroup = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      apiFetch<MyGroup>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name, description: description ?? '' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] })
      refetchGroups()
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création')
    },
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    createGroup.mutate({ name: groupName })
  }

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

  async function handleCopyCode() {
    if (!group) return
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silent
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
      <div className="py-12 space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <div className="text-5xl">🕌</div>
          <h2 className="text-xl font-semibold">Rejoignez ou créez une halqa</h2>
          <p className="text-muted-foreground text-sm">
            Une halqa est un groupe de mémorisation du Coran.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Create card */}
          <div className="rounded-2xl border-2 border-dashed p-6 space-y-3">
            <div className="text-3xl">✨</div>
            <h3 className="font-semibold">Créer une halqa</h3>
            <p className="text-sm text-muted-foreground">Vous êtes sheikh ? Créez votre groupe.</p>
            <form onSubmit={handleCreate} className="space-y-2">
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Nom du groupe"
                maxLength={60}
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={createGroup.isPending || groupName.length < 2}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {createGroup.isPending ? 'Création…' : 'Créer'}
              </button>
            </form>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
          </div>

          {/* Join card */}
          <div className="rounded-2xl border-2 border-dashed p-6 space-y-3">
            <div className="text-3xl">🤝</div>
            <h3 className="font-semibold">Rejoindre une halqa</h3>
            <p className="text-sm text-muted-foreground">Entrez le code de votre sheikh.</p>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Code d'invitation (ex: ABC12345)"
                maxLength={12}
                className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={joining || inviteCode.length < 6}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {joining ? 'Connexion…' : 'Rejoindre'}
              </button>
            </form>
            {joinError && <p className="text-xs text-red-500">{joinError}</p>}
          </div>
        </div>
      </div>
    )
  }

  const leaderboard = rawLeaderboard ? mapLeaderboard(rawLeaderboard) : []
  const groupStats = rawLeaderboard ? computeGroupStats(rawLeaderboard) : undefined

  return (
    <>
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground text-sm">
            {group.description ?? 'Suivi en temps réel de votre halqa'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {group.sheikhId === session?.user?.id && (
            <button
              onClick={handleCopyCode}
              className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl font-mono font-bold hover:bg-emerald-100 transition-colors dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/40"
              title="Cliquer pour copier"
            >
              {copied ? '✓ Copié !' : `📋 ${group.inviteCode}`}
            </button>
          )}
          {group.sheikhId !== session?.user?.id && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Code : {group.inviteCode}
            </span>
          )}
        </div>
      </div>

      <GroupStats stats={groupStats} />

      <GroupGoal groupId={group.id} isSheikh={group.sheikhId === session?.user?.id} />

      <Leaderboard entries={leaderboard} isLoading={lbLoading} />

      <GroupFeed items={feedItems ?? []} isLoading={feedLoading} />
    </>
  )
}
