'use client'
/**
 * @file DashboardClient — Lecture | Mémorisation | Objectifs
 * Architecture 3 tabs avec progress ring animé pour la lecture quotidienne.
 */
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Share2, Check, Copy, BookOpen, Star, Target, ChevronLeft, ChevronRight } from 'lucide-react'
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
  createdAt: string
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
  currentReadingPage?: number | null
}

/** Hizb cyclique 1-60 */
function hizbPosition(total: number): number {
  if (total <= 0) return 0
  return ((total - 1) % 60) + 1
}

/** Estimation de la page à partir du hizb (1-60) */
function estimatedPage(hizb: number): number {
  if (hizb <= 0) return 1
  return Math.max(1, Math.round((hizb - 1) * (604 / 60)) + 1)
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
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const myEntry = leaderboard.find((e) => e.userId === currentUserId)
  const myHizbs = myEntry?.hizbsRead ?? 0

  // ── Compteur avec debounce : clics rapides accumulés, 1 requête après 600 ms ──
  const [localHizbs, setLocalHizbs] = useState<number | null>(null)
  const pendingDeltaRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Quand les données serveur arrivent et qu'il n'y a plus de delta pending,
  // on efface l'override local pour afficher la valeur fraîche du serveur.
  useEffect(() => {
    if (pendingDeltaRef.current === 0) {
      setLocalHizbs(null)
    }
  }, [myHizbs])

  /** Valeur brute accumulée (peut dépasser 60 sur plusieurs khatams) */
  const shownHizbsRaw = localHizbs ?? myHizbs
  /** Position cyclique 1-60 pour le ring et le compteur */
  const shownHizbs = shownHizbsRaw <= 0 ? 0 : ((shownHizbsRaw - 1) % 60) + 1
  /** Nombre de khatams complétés */
  const khatamCount = Math.floor(shownHizbsRaw / 60)
  const milestone = hizbMilestone(shownHizbs)

  const sorted = [...leaderboard].sort((a, b) => (b.hizbsRead ?? 0) - (a.hizbsRead ?? 0))

  const addHizb = useMutation({
    mutationFn: (delta: number) =>
      apiFetch<{ success: boolean; data: { hizbsRead: number } }>('/api/users/me/hizb', {
        method: 'POST',
        body: JSON.stringify({ count: delta }),
      }),
    onSuccess: (res) => {
      const newHizbs = res?.data?.hizbsRead
      if (newHizbs !== undefined) {
        // Fixe localHizbs à la valeur serveur AVANT setQueryData.
        // Si on faisait setLocalHizbs(null), React pourrait traiter ce render avant
        // que setQueryData ne mette myHizbs à jour → shownHizbs = null ?? ancienMyHizbs
        // → flash bref à l'ancienne valeur. En gardant un localHizbs explicite on
        // évite tout clignotement.
        setLocalHizbs(newHizbs)
        queryClient.setQueryData<Array<{ userId: string; hizbsRead: number }>>(
          ['group', groupId, 'leaderboard'],
          (old) => old?.map((e) => e.userId === currentUserId ? { ...e, hizbsRead: newHizbs } : e)
        )
      }
      queryClient.invalidateQueries({ queryKey: ['group'] })
    },
  })

  /**
   * Enregistre un clic +/- avec debounce de 600 ms.
   * Les clics rapides s'accumulent et déclenchent une seule requête.
   */
  const tapHizb = (step: number) => {
    const current = localHizbs ?? myHizbs
    const next = Math.max(0, current + step) // pas de cap à 60 — khatams multiples
    if (next === current) return
    setLocalHizbs(next)
    pendingDeltaRef.current += step
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      const total = pendingDeltaRef.current
      pendingDeltaRef.current = 0
      if (total !== 0) addHizb.mutate(total)
    }, 600)
  }

  return (
    <div className="space-y-6">
      {/* ── Hero : progress ring personnel ── */}
      <div className="flex flex-col items-center pt-2 pb-4 relative">
        {/* Ring + texte centré */}
        <div className="relative">
          <ProgressRing value={shownHizbs} max={60} size={200} thickness={14} color="#f59e0b" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-extrabold text-stone-900 dark:text-stone-100 tabular-nums leading-none">
              {shownHizbs}
            </span>
            <span className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              / 60 hizbs
            </span>
            {khatamCount > 0 && (
              <span className="mt-1 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                ×{khatamCount} ✨
              </span>
            )}
            {milestone && (
              <span className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                {milestone.emoji} {milestone.label}
              </span>
            )}
          </div>
        </div>

        {/* Sous-titre */}
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">
          {shownHizbs === 0
            ? "Commencez votre lecture dès aujourd'hui"
            : `${Math.round((shownHizbs / 60) * 100)}% du Coran lu`}
        </p>
        {khatamCount > 0 && (
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {shownHizbsRaw} hizbs lus au total
          </p>
        )}

        {/* ── Compteur inline +/- ── */}
        <div className="mt-4 flex items-center gap-4 justify-center">
          <button
            onClick={() => tapHizb(-1)}
            disabled={shownHizbsRaw <= 0}
            className="w-12 h-12 rounded-2xl border-2 border-stone-200 dark:border-stone-700 text-2xl font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition-all disabled:opacity-30"
          >−</button>
          <div className="text-center min-w-[80px]">
            <span className="text-2xl font-extrabold text-stone-800 dark:text-stone-100 tabular-nums">{shownHizbs}</span>
            <p className="text-xs text-stone-400 mt-0.5">hizbs lus</p>
          </div>
          <button
            onClick={() => tapHizb(1)}
            disabled={false}
            className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-2xl font-bold shadow-md shadow-amber-200 dark:shadow-amber-900/30 transition-all disabled:opacity-30"
          >+</button>
        </div>
        {addHizb.isError && (
          <p className="text-xs text-red-500 text-center mt-2">Erreur lors de l&apos;enregistrement</p>
        )}
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
              const hizb   = hizbPosition(entry.hizbsRead)
              const kt     = Math.floor((entry.hizbsRead ?? 0) / 60)
              const pct    = (hizb / 60) * 100
              const realPage = entry.currentReadingPage ?? null
              const estPage  = estimatedPage(hizb)
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    'px-3 py-2.5 rounded-xl transition-colors',
                    isMe
                      ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800'
                      : 'hover:bg-muted/40'
                  )}
                >
                  {/* Ligne 1 : rang · avatar · nom · badges */}
                  <div className="flex items-center gap-2.5">
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
                    {/* Badge Hizb */}
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                      H{hizb}
                    </span>
                    {/* Badge Page — vert si réelle, gris si estimée */}
                    {realPage ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                        P.{realPage}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-stone-400 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                        ~P.{estPage}
                      </span>
                    )}
                    {/* Badge Khatam */}
                    {kt > 0 && (
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        ×{kt} ✨
                      </span>
                    )}
                  </div>
                  {/* Ligne 2 : barre de progression hizb cyclique */}
                  <div className="mt-1.5 ml-[3.25rem] flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-400 tabular-nums w-8 text-right">{hizb}/60</span>
                  </div>
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
  const storeUser   = useAppStore((s) => s.user)
  const activeGroupId = useAppStore((s) => s.activeGroupId)
  const setActiveGroup = useAppStore((s) => s.setActiveGroup)

  const [mode, setMode] = useState<DashboardMode>('lecture')
  const [copied, setCopied] = useState(false)
  const [shared, setShared]   = useState(false)

  const { data: myGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => apiFetch<MyGroup[]>('/api/groups/me'),
    enabled: !!storeUser?.id,
  })

  // Synchroniser le groupe actif : si le store n'a pas encore d'activeGroupId,
  // utiliser le premier groupe retourné par l'API.
  useEffect(() => {
    if (!activeGroupId && myGroups && myGroups.length > 0 && myGroups[0]) {
      setActiveGroup(myGroups[0])
    }
  }, [myGroups, activeGroupId, setActiveGroup])

  // Groupe courant = celui du store (ou premier de la liste si store vide)
  const group   = myGroups?.find(g => g.id === activeGroupId) ?? myGroups?.[0]
  const groupId = group?.id

  const { data: rawLeaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['group', groupId, 'leaderboard'],
    queryFn: () => apiFetch<ApiLeaderboardEntry[]>(`/api/groups/${groupId}/leaderboard`),
    enabled: !!groupId,
  })

  useGroupRealtime({ groupId: groupId ?? '', enabled: !!groupId })

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
    const joinUrl = `${window.location.origin}/join/${group.inviteCode}`
    const text = `Rejoins ma halqa "${group.name}" sur Quran Tracker 📖\n\n${joinUrl}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Rejoins ${group.name}`, url: joinUrl, text })
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
      <div className="py-16 flex flex-col items-center gap-5 text-center max-w-sm mx-auto">
        <div className="text-5xl">🕌</div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Aucun groupe actif</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Rejoignez ou créez une halqa pour suivre votre progression en groupe.
          </p>
        </div>
        <a
          href="/groups"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-2xl transition-colors"
        >
          Gérer mes groupes →
        </a>
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
            <span>{label}</span>
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
