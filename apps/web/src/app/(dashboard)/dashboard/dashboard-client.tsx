'use client'
/**
 * @file DashboardClient — Lecture | Mémorisation | Objectifs
 * Architecture 3 tabs avec progress ring animé pour la lecture quotidienne.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Share2, Check, Copy, BookOpen, Star, Target, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store'
import { apiFetch } from '@/lib/api'
import { Leaderboard } from '@/components/group/leaderboard'
import { MemberActivityCards } from '@/components/group/member-activity-cards'
import { GroupGoal } from '@/components/group/group-goal'
import { useGroupRealtime } from '@/hooks/use-group-realtime'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@quran-tracker/types'

type DashboardMode = 'lecture' | 'memorisation' | 'objectifs'

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

// ── Progress Ring ──────────────────────────────────────────────────────────────

/**
 * Anneau de progression SVG animé.
 * Le cercle tourne dans le sens horaire depuis le haut (rotate -90°).
 */
function ProgressRing({
  value,
  max,
  size = 200,
  thickness = 14,
  color = '#f59e0b',
  trackColor,
}: {
  value: number
  max: number
  size?: number
  thickness?: number
  color?: string
  trackColor?: string
}) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / Math.max(max, 1), 1)
  const offset = circ * (1 - pct)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={trackColor ?? 'var(--ring-track, #e7e5e4)'}
        strokeWidth={thickness}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  )
}

/**
 * Retourne une étiquette de milestone selon le nombre de hizbs lus.
 * 60 hizbs = Coran complet (Khatam).
 */
function hizbMilestone(n: number): { label: string; emoji: string } | null {
  if (n >= 60) return { label: 'Khatam 🎉', emoji: '✨' }
  if (n >= 30) return { label: 'Mi-Coran', emoji: '⭐' }
  if (n >= 20) return { label: '1/3 du Coran', emoji: '📘' }
  if (n >= 10) return { label: '1/6 du Coran', emoji: '📗' }
  if (n >= 2)  return { label: 'Juz Amma+', emoji: '📖' }
  if (n >= 1)  return { label: 'Juz Amma', emoji: '🌙' }
  return null
}

// ── Hizb tracker inline (épuré, sans le ranking intégré) ──────────────────────

interface HizbEntry {
  userId: string
  name: string
  avatar: string | null
  hizbsRead: number
  xp: string
}

/** Formate YYYY-MM en "MOIS YYYY" (ex: "MARS 2026") */
function formatMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
}

function HizbLectureTab({
  groupId,
  currentUserId,
}: {
  groupId: string
  currentUserId: string
}) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [count, setCount] = useState(1)

  // Mois affiché pour l'activité du groupe (YYYY-MM)
  const [activityMonth, setActivityMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  function prevMonth() {
    const [y, m] = activityMonth.split('-').map(Number) as [number, number]
    const d = new Date(y, m - 2, 1) // -2 car m est 1-based
    setActivityMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function nextMonth() {
    const [y, m] = activityMonth.split('-').map(Number) as [number, number]
    const d = new Date(y, m, 1) // m = prochain mois (0-based ok)
    setActivityMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const isCurrentMonth = activityMonth === (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const { data: leaderboard = [] } = useQuery<HizbEntry[]>({
    queryKey: ['group', groupId, 'leaderboard'],
    queryFn: () => apiFetch(`/api/groups/${groupId}/leaderboard`),
    enabled: !!groupId,
  })

  const myEntry = leaderboard.find((e) => e.userId === currentUserId)
  const myHizbs = myEntry?.hizbsRead ?? 0
  const milestone = hizbMilestone(myHizbs)

  const sorted = [...leaderboard].sort((a, b) => (b.hizbsRead ?? 0) - (a.hizbsRead ?? 0))

  const addHizb = useMutation({
    mutationFn: (n: number) =>
      apiFetch<{ hizbsRead: number }>('/api/users/me/hizb', {
        method: 'POST',
        body: JSON.stringify({ count: n }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'leaderboard'] })
      setShowAdd(false)
      setCount(1)
    },
  })

  return (
    <div className="space-y-6">
      {/* ── Hero : progress ring personnel ── */}
      <div className="flex flex-col items-center pt-2 pb-4 relative">
        {/* Ring + texte centré */}
        <div className="relative">
          <ProgressRing value={myHizbs} max={60} size={200} thickness={14} color="#f59e0b" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums leading-none">
              {myHizbs}
            </span>
            <span className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              / 60 hizbs
            </span>
            {milestone && (
              <span className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                {milestone.emoji} {milestone.label}
              </span>
            )}
          </div>
        </div>

        {/* Sous-titre */}
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">
          {myHizbs === 0
            ? 'Commencez votre lecture dès aujourd\'hui'
            : `${Math.round((myHizbs / 60) * 100)}% du Coran lu`}
        </p>

        {/* CTA Ajouter */}
        <button
          onClick={() => setShowAdd(true)}
          className="mt-4 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold px-6 py-3 rounded-2xl text-sm shadow-md shadow-amber-200 dark:shadow-amber-900/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          Enregistrer mes hizbs
        </button>
      </div>

      {/* ── Classement hizbs du groupe ── */}
      {sorted.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Classement lecture
          </h3>
          <div className="space-y-2">
            {sorted.map((entry, idx) => {
              const isMe = entry.userId === currentUserId
              const MEDALS = ['🥇', '🥈', '🥉']
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                    isMe
                      ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800'
                      : 'hover:bg-muted/40'
                  )}
                >
                  <span className="w-5 text-center text-sm flex-shrink-0 font-bold">
                    {idx < 3 ? MEDALS[idx] : `${idx + 1}`}
                  </span>
                  {entry.avatar ? (
                    <img src={entry.avatar} alt={entry.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-xs font-bold text-amber-600 flex-shrink-0">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium truncate">
                    {entry.name}{isMe && <span className="ml-1 text-xs text-amber-500">(moi)</span>}
                  </span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex-shrink-0 tabular-nums">
                    {entry.hizbsRead ?? 0}
                    <span className="text-xs font-normal text-muted-foreground ml-1">hizb</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Activité mensuelle du groupe ── */}
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        {/* Navigateur de mois */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Activité du groupe
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-stone-500"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 min-w-[90px] text-center tabular-nums">
              {formatMonthLabel(activityMonth)}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-stone-500 disabled:opacity-30"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <MemberActivityCards groupId={groupId} month={activityMonth} />
      </div>

      {/* ── Modal ajout hizbs ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false) }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-background rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">📖 Hizbs lus aujourd&apos;hui</h2>
                <button onClick={() => setShowAdd(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors text-sm">✕</button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">Combien de hizbs avez-vous lu ?</p>
                <div className="flex items-center gap-4 justify-center">
                  <button
                    onClick={() => setCount(Math.max(1, count - 1))}
                    className="w-12 h-12 rounded-2xl border-2 text-xl font-bold hover:bg-muted transition-colors active:scale-95"
                  >−</button>
                  <span className="text-4xl font-extrabold w-16 text-center tabular-nums">{count}</span>
                  <button
                    onClick={() => setCount(Math.min(60, count + 1))}
                    className="w-12 h-12 rounded-2xl border-2 text-xl font-bold hover:bg-muted transition-colors active:scale-95"
                  >+</button>
                </div>
                <p className="text-xs text-muted-foreground text-center">1 hizb = ½ juz = 1/60 du Coran</p>
              </div>

              {addHizb.isError && (
                <p className="text-xs text-red-500 text-center">Erreur lors de l&apos;enregistrement</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 rounded-2xl border text-sm font-semibold hover:bg-muted transition-colors"
                >Annuler</button>
                <button
                  onClick={() => addHizb.mutate(count)}
                  disabled={addHizb.isPending}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-md shadow-amber-200 dark:shadow-none"
                >
                  {addHizb.isPending ? 'Enregistrement…' : `Valider (${count} hizb${count > 1 ? 's' : ''})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

const TABS: { id: DashboardMode; label: string; icon: React.ElementType; activeColor: string }[] = [
  { id: 'lecture',      label: 'Lecture',      icon: BookOpen, activeColor: 'text-amber-600 dark:text-amber-400' },
  { id: 'memorisation', label: 'Mémorisation', icon: Star,     activeColor: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'objectifs',    label: 'Objectifs',    icon: Target,   activeColor: 'text-violet-600 dark:text-violet-400' },
]

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
    onError: (err) => setCreateError(err instanceof Error ? err.message : 'Erreur'),
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
    const text = `Rejoins ma halqa "${group.name}" sur Quran Tracker 📖\n\nCode : ${group.inviteCode}\n\nhttps://quran-tracker-web.vercel.app`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Rejoins ${group.name}`, text })
      } else {
        await navigator.clipboard.writeText(text)
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      }
    } catch { /* annulé */ }
  }

  // ── Chargement ───────────────────────────────────────────────────────────────

  if (groupsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-36 bg-muted rounded-xl" />
        <div className="h-12 bg-muted rounded-2xl" />
        <div className="flex flex-col items-center gap-4 pt-6">
          <div className="w-48 h-48 bg-muted rounded-full" />
          <div className="h-12 w-40 bg-muted rounded-2xl" />
        </div>
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
              <button type="submit" disabled={createGroup.isPending || groupName.length < 2}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {createGroup.isPending ? 'Création…' : 'Créer'}
              </button>
            </form>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
          </div>
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
              <button type="submit" disabled={joining || inviteCode.length < 6}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {joining ? 'Connexion…' : 'Rejoindre'}
              </button>
            </form>
            {joinError && <p className="text-xs text-red-500">{joinError}</p>}
          </div>
        </div>
      </div>
    )
  }

  const leaderboard = rawLeaderboard
    ? mapLeaderboard(rawLeaderboard).sort((a, b) => b.surahsMemorized - a.surahsMemorized)
    : []

  // ── Dashboard principal ──────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-20 md:pb-0">

      {/* En-tête groupe — minimaliste */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">{group.name}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {rawLeaderboard && (
              <span className="text-xs text-stone-400 dark:text-stone-500">
                👥 {rawLeaderboard.length} membre{rawLeaderboard.length > 1 ? 's' : ''}
                {' · '}
                📖 {rawLeaderboard.reduce((s, e) => s + Number(e.surahsMemorized), 0)} sourates
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.sheikhId === storeUser?.id && (
            <button onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-3 py-1.5 rounded-xl font-mono font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
              {copied ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> {group.inviteCode}</>}
            </button>
          )}
          <button onClick={handleShare}
            className="flex items-center gap-1.5 text-xs bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-3 py-1.5 rounded-xl font-semibold hover:opacity-80 active:scale-95 transition-all">
            {shared ? <><Check className="h-3.5 w-3.5" /> Copié</> : <><Share2 className="h-3.5 w-3.5" /> Partager</>}
          </button>
        </div>
      </div>

      {/* ── Tabs 3 modes ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800/60 rounded-2xl">
        {TABS.map(({ id, label, icon: Icon, activeColor }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all',
              mode === id
                ? `bg-white dark:bg-stone-900 shadow-sm ${activeColor}`
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xs:inline sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Contenu du tab actif ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {mode === 'lecture' && (
            <HizbLectureTab groupId={group.id} currentUserId={storeUser?.id ?? ''} />
          )}

          {mode === 'memorisation' && (
            <Leaderboard entries={leaderboard} isLoading={lbLoading} />
          )}

          {mode === 'objectifs' && (
            <GroupGoal groupId={group.id} isSheikh={group.sheikhId === storeUser?.id} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
