'use client'
/**
 * @file DashboardClient — Dashboard principal avec mode Lecture / Mémorisation
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Share2, Check, Copy, BookOpen, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store'
import { apiFetch } from '@/lib/api'
import { GroupStats } from '@/components/group/group-stats'
import { Leaderboard } from '@/components/group/leaderboard'
import { GroupGoal } from '@/components/group/group-goal'
import { HizbTracker } from '@/components/group/hizb-tracker'
import { useGroupRealtime } from '@/hooks/use-group-realtime'
import { cn } from '@/lib/utils'
import type { GroupStats as GroupStatsType, LeaderboardEntry } from '@quran-tracker/types'

type DashboardMode = 'lecture' | 'memorisation'

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
  hizbsRead?: number
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
    hizbsRead: e.hizbsRead ?? 0,
    currentStreak: Number(e.currentStreak ?? 0),
    rank: i + 1,
    badges: e.badges ?? [],
  }))
}

export function DashboardClient() {
  const storeUser = useAppStore((s) => s.user)
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<DashboardMode>('lecture')
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const { data: myGroups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => apiFetch<MyGroup[]>('/api/groups/me'),
    enabled: !!storeUser?.id,
  })

  const group = myGroups?.[0]
  const groupId = group?.id

  const { data: rawLeaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['group', groupId, 'leaderboard'],
    queryFn: () => apiFetch<ApiLeaderboardEntry[]>(`/api/groups/${groupId}/leaderboard`),
    enabled: !!groupId,
  })

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
    } catch { /* silent */ }
  }

  async function handleShare() {
    if (!group) return
    const shareText = `Rejoins ma halqa "${group.name}" sur Quran Tracker 📖\n\nCode d'invitation : ${group.inviteCode}\n\nhttps://quran-tracker-web.vercel.app`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Rejoins ${group.name}`, text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      }
    } catch { /* annulé */ }
  }

  // ── Chargement ───────────────────────────────────────────────────────────────

  if (groupsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
        <div className="h-12 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  // ── Pas encore dans un groupe ────────────────────────────────────────────────

  if (!group) {
    return (
      <div className="py-12 space-y-6 max-w-lg mx-auto">
        <div className="text-center space-y-2">
          <div className="text-5xl">🕌</div>
          <h2 className="text-xl font-semibold">Rejoignez ou créez une halqa</h2>
          <p className="text-muted-foreground text-sm">Une halqa est un groupe de mémorisation du Coran.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Créer */}
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

          {/* Rejoindre */}
          <div className="rounded-2xl border-2 border-dashed p-6 space-y-3">
            <div className="text-3xl">🤝</div>
            <h3 className="font-semibold">Rejoindre une halqa</h3>
            <p className="text-sm text-muted-foreground">Entrez le code de votre sheikh.</p>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Code d'invitation"
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

  // ── Dashboard principal ──────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-20 md:pb-0">

      {/* En-tête groupe */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{group.name}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {group.description ?? 'Halqa de mémorisation'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {group.sheikhId === storeUser?.id && (
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl font-mono font-bold hover:bg-emerald-100 transition-colors dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
            >
              {copied ? <><Check className="h-3.5 w-3.5" /> Copié !</> : <><Copy className="h-3.5 w-3.5" /> {group.inviteCode}</>}
            </button>
          )}
          {group.sheikhId !== storeUser?.id && (
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-xl font-mono font-medium">
              {group.inviteCode}
            </span>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs bg-stone-900 text-white px-3 py-1.5 rounded-xl font-semibold hover:bg-stone-700 active:scale-95 transition-all dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
          >
            {shared ? <><Check className="h-3.5 w-3.5" /> Copié !</> : <><Share2 className="h-3.5 w-3.5" /> Partager</>}
          </button>
        </div>
      </div>

      {/* Stats globales — toujours visibles */}
      <GroupStats stats={groupStats} />

      {/* ── Sélecteur de mode ─────────────────────────────────────────────── */}
      <div className="flex gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl">
        <button
          onClick={() => setMode('lecture')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            mode === 'lecture'
              ? 'bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span>Lecture quotidienne</span>
        </button>
        <button
          onClick={() => setMode('memorisation')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            mode === 'memorisation'
              ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          )}
        >
          <Star className="h-4 w-4" />
          <span>Mémorisation</span>
        </button>
      </div>

      {/* ── Contenu selon le mode ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {mode === 'lecture' && (
          <motion.div
            key="lecture"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            <GroupGoal groupId={group.id} isSheikh={group.sheikhId === storeUser?.id} />
            <HizbTracker groupId={group.id} currentUserId={storeUser?.id ?? ''} />
          </motion.div>
        )}

        {mode === 'memorisation' && (
          <motion.div
            key="memorisation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            <Leaderboard entries={leaderboard} isLoading={lbLoading} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
