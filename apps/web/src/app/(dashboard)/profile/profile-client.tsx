'use client'
/**
 * @file ProfileClient — Profil utilisateur (stats + heatmap + progression Juz)
 */
import { Suspense, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore as useStore } from '@/store'
import { apiFetch } from '@/lib/api'
import { HeatmapCalendar } from '@/components/quran/heatmap-calendar'
import Link from 'next/link'
import type { Surah, MemorizationStatus } from '@quran-tracker/types'

interface ProgressEntry {
  surahId: number
  status: MemorizationStatus
  lastRevisedAt?: string | null
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: 'student' | 'sheikh' | 'parent' | 'super_admin'
  avatar: string | null
  xp?: string | null
  currentStreak?: number | null
  longestStreak?: number | null
  hizbsRead?: number | null
  currentReadingPage?: number | null
}

const ROLES = [
  { value: 'student', label: 'Étudiant / Hafiz', emoji: '📖' },
  { value: 'sheikh', label: 'Sheikh / Enseignant', emoji: '🎓' },
  { value: 'parent', label: 'Parent', emoji: '👨‍👩‍👧' },
] as const

interface BadgeStats {
  surahsMemorized: number
  hasFatiha: boolean
  hasJuzAmma: boolean
  hasJuz29: boolean
  hizbsRead: number
  totalXp: number
}

interface ProfileBadge {
  id: string
  emoji: string
  name: string
  hint: string
  category: 'memo' | 'lecture' | 'niveau'
  check: (s: BadgeStats) => boolean
}

const PROFILE_BADGES: ProfileBadge[] = [
  // ── Mémorisation ─────────────────────────────────────────────
  { id: 'fatiha',       emoji: '🕌', name: 'La Fatiha',        hint: 'Mémoriser Al-Fatiha',          category: 'memo',    check: s => s.hasFatiha },
  { id: 'first-surah',  emoji: '🌟', name: 'Premier pas',      hint: '1 sourate mémorisée',          category: 'memo',    check: s => s.surahsMemorized >= 1 },
  { id: 'five-surahs',  emoji: '🎗️', name: '5 sourates',       hint: '5 sourates mémorisées',        category: 'memo',    check: s => s.surahsMemorized >= 5 },
  { id: 'ten-surahs',   emoji: '🎯', name: '10 sourates',      hint: '10 sourates mémorisées',       category: 'memo',    check: s => s.surahsMemorized >= 10 },
  { id: 'twenty-surahs',emoji: '📿', name: '20 sourates',      hint: '20 sourates mémorisées',       category: 'memo',    check: s => s.surahsMemorized >= 20 },
  { id: 'juz-tabarak',  emoji: '💫', name: 'Juz Tabarak',      hint: 'Mémoriser le 29ème Juz',       category: 'memo',    check: s => s.hasJuz29 },
  { id: 'juz-amma',     emoji: '🌙', name: 'Juz Amma',         hint: 'Mémoriser le 30ème Juz',       category: 'memo',    check: s => s.hasJuzAmma },
  { id: 'half-quran',   emoji: '⭐', name: 'Mi-chemin',        hint: '57 sourates mémorisées',       category: 'memo',    check: s => s.surahsMemorized >= 57 },
  { id: 'hafiz',        emoji: '🏆', name: 'Hafiz',            hint: '114 sourates mémorisées',      category: 'memo',    check: s => s.surahsMemorized >= 114 },
  // ── Lecture quotidienne ───────────────────────────────────────
  { id: 'hizb-1',       emoji: '📖', name: '1er hizb',         hint: 'Lire son 1er hizb',            category: 'lecture', check: s => s.hizbsRead >= 1 },
  { id: 'hizb-5',       emoji: '🗓️', name: '5 hizbs',          hint: '5 hizbs lus',                  category: 'lecture', check: s => s.hizbsRead >= 5 },
  { id: 'hizb-10',      emoji: '📚', name: '10 hizbs',         hint: '10 hizbs lus',                 category: 'lecture', check: s => s.hizbsRead >= 10 },
  { id: 'hizb-20',      emoji: '📘', name: '20 hizbs',         hint: '20 hizbs lus (1/3 du Coran)',  category: 'lecture', check: s => s.hizbsRead >= 20 },
  { id: 'hizb-30',      emoji: '🔖', name: '30 hizbs',         hint: '30 hizbs lus (moitié)',        category: 'lecture', check: s => s.hizbsRead >= 30 },
  { id: 'khatam',       emoji: '✨', name: 'Khatam',           hint: 'Lire le Coran en entier',      category: 'lecture', check: s => s.hizbsRead >= 60 },
  { id: 'khatam-2',     emoji: '💎', name: 'Khatam × 2',      hint: '2 lectures complètes du Coran', category: 'lecture', check: s => s.hizbsRead >= 120 },
]

export function ProfileClient() {
  // Le store Zustand est hydraté par AuthGuard via verifySessionDirect()
  // useSession() de Better Auth ne fonctionne pas en cross-origin (Vercel → Railway)
  const storeUser = useStore((s) => s.user)
  const queryClient = useQueryClient()

  // ── Full profile from API (includes role, xp, streaks) ──
  // enabled dès que le store a un user (garanti par AuthGuard)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiFetch<UserProfile>('/api/users/me'),
    enabled: !!storeUser?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 2,
  })

  // Merge: profile API en priorité, store comme fallback garanti
  const email = profile?.email ?? storeUser?.email ?? ''
  const user = profile
    ? { ...profile, email }
    : storeUser
      ? { id: storeUser.id, name: storeUser.name, email, role: storeUser.role ?? 'student' as const, avatar: storeUser.avatar ?? null }
      : undefined

  // ── Edit profile state ──
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editRole, setEditRole] = useState<'student' | 'sheikh' | 'parent'>('student')
  const [saveError, setSaveError] = useState('')

  const updateProfile = useMutation({
    mutationFn: (body: { name?: string; avatar?: string | null; role?: string }) =>
      apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      setIsEditing(false)
      setSaveError('')
    },
    onError: (e: Error) => setSaveError(e.message),
  })

  function openEdit() {
    // Fallback: si le nom est vide (cas OTP), on pré-remplit avec le préfixe email
    const fallbackName = user?.name?.trim() || email.split('@')[0] || ''
    setEditName(fallbackName)
    setEditAvatar(user?.avatar ?? '')
    const validRoles: ('student' | 'sheikh' | 'parent')[] = ['student', 'sheikh', 'parent']
    setEditRole(validRoles.includes(user?.role as 'student') ? (user!.role as 'student' | 'sheikh' | 'parent') : 'student')
    setSaveError('')
    setIsEditing(true)
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    // Fallback name si vide : préfixe email
    const nameToSend = editName.trim() || email.split('@')[0] || 'Utilisateur'
    updateProfile.mutate({
      name: nameToSend,
      avatar: editAvatar.trim() || null,
      role: editRole,
    })
  }

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => apiFetch<ProgressEntry[]>(`/api/progress/${user!.id}`),
    enabled: !!user?.id,
  })

  const { data: allSurahs } = useQuery({
    queryKey: ['surahs'],
    queryFn: () => apiFetch<Surah[]>('/api/surahs'),
  })

  const progressMap = new Map(progress?.map((p) => [p.surahId, p.status]) ?? [])

  const surahsWithStatus = allSurahs?.map((s) => ({
    ...s,
    status: progressMap.get(s.id) ?? 'not_started' as MemorizationStatus,
  })) ?? []

  /** Compte sourates mémorisées ET consolidées — cohérent avec le SQL du leaderboard */
  const surahsMemorized = surahsWithStatus.filter(
    s => s.status === 'memorized' || s.status === 'consolidated'
  ).length

  // Juz progression — top 5 with most progress
  const juzProgress = Array.from({ length: 30 }, (_, i) => {
    const juz = i + 1
    const juzSurahs = surahsWithStatus.filter(s => s.juzNumber === juz)
    if (juzSurahs.length === 0) return null
    const done = juzSurahs.filter(s => s.status === 'memorized').length
    const pct = Math.round((done / juzSurahs.length) * 100)
    const firstName = juzSurahs[0]?.nameFr ?? ''
    const lastName = juzSurahs[juzSurahs.length - 1]?.nameFr ?? ''
    return { juz, pct, done, total: juzSurahs.length, firstName, lastName }
  })
    .filter((j): j is NonNullable<typeof j> => j !== null && j.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  // Badges
  const hasFatiha = surahsWithStatus.find(s => s.id === 1)?.status === 'memorized'
  const hasJuzAmma = surahsWithStatus.length > 0 && surahsWithStatus.filter(s => s.id >= 78 && s.id <= 114).every(s => s.status === 'memorized')
  const hasJuz29   = surahsWithStatus.length > 0 && surahsWithStatus.filter(s => s.id >= 67 && s.id <= 77).every(s => s.status === 'memorized')
  const badgeStats: BadgeStats = { surahsMemorized, hasFatiha, hasJuzAmma, hasJuz29, hizbsRead: profile?.hizbsRead ?? 0, totalXp: 0 }
  const earnedIds = new Set(PROFILE_BADGES.filter(b => b.check(badgeStats)).map(b => b.id))
  const badgesByCategory = {
    memo: PROFILE_BADGES.filter(b => b.category === 'memo'),
    lecture: PROFILE_BADGES.filter(b => b.category === 'lecture'),
  }

  // Total verses memorized
  const totalVersesMemorized = surahsWithStatus
    .filter(s => s.status === 'memorized')
    .reduce((acc, s) => acc + (s.versesCount ?? 0), 0)
  const totalVerses = allSurahs?.reduce((acc, s) => acc + (s.versesCount ?? 0), 0) ?? 6236
  const completionPct = allSurahs?.length ? Math.round((surahsMemorized / 114) * 100) : 0

  // Group revisions by date (sum per day)
  const heatmapData = (() => {
    const map = new Map<string, number>()
    progress
      ?.filter(p => p.lastRevisedAt)
      .forEach(p => {
        const date = new Date(p.lastRevisedAt!).toISOString().split('T')[0]!
        map.set(date, (map.get(date) ?? 0) + 1)
      })
    return Array.from(map.entries()).map(([date, count]) => ({ date, count, duration: 0 }))
  })()

  if (profileLoading || progressLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 bg-muted rounded-xl" />
        <div className="grid grid-cols-4 gap-3"><div className="h-20 bg-muted rounded-xl col-span-4" /></div>
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">

      {/* ── Modal d'édition du profil ── */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
          <div className="relative w-full max-w-sm bg-card rounded-2xl border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-base">Modifier le profil</h2>
              <button onClick={() => setIsEditing(false)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground text-sm">✕</button>
            </div>

            <form onSubmit={submitEdit} className="space-y-4">
              {/* Avatar preview */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xl font-bold text-emerald-600 overflow-hidden flex-shrink-0">
                  {editAvatar
                    ? <img src={editAvatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setEditAvatar('')} />
                    : (editName ? editName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : initials)}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">URL avatar (optionnel)</label>
                  <input
                    type="text"
                    value={editAvatar}
                    onChange={e => setEditAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Nom complet */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nom complet</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Ex : Ahmed Benali"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Rôle */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Mon rôle</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setEditRole(r.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${
                        editRole === r.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500 ring-offset-1'
                          : 'border-border hover:border-emerald-300 hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-xl">{r.emoji}</span>
                      <span className="text-[10px] font-semibold leading-tight">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email (non modifiable)</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm rounded-xl border bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>

              {saveError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{saveError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={updateProfile.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
                  {updateProfile.isPending ? 'Enregistrement…' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero header */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xl font-bold text-emerald-600 overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{user?.name ?? 'Mon Profil'}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {user?.role && (
                <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {ROLES.find(r => r.value === user.role)?.label ?? user.role}
                </span>
              )}
            </div>
          </div>
          {/* Bouton éditer */}
          <button onClick={openEdit}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:bg-muted transition-colors">
            ✏️ Modifier
          </button>
        </div>

        {/* Stats inline */}
        <div className="mt-4 pt-4 border-t space-y-3">
          {/* Barre de progression globale */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Progression du Coran</span>
              <span className="text-xs font-bold text-emerald-600">{surahsMemorized}/114 sourates · {completionPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{totalVersesMemorized.toLocaleString()} versets mémorisés</span>
              <span>{(totalVerses - totalVersesMemorized).toLocaleString()} restants</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Badges mémorisation + lecture ── */}
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        {/* Lecture quotidienne — hizbs lus */}
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 space-y-1.5">
          {(() => {
            const total = profile?.hizbsRead ?? 0
            const hizb = total <= 0 ? 0 : ((total - 1) % 60) + 1
            const khatams = Math.floor(total / 60)
            return (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">📚 Lecture quotidienne</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-blue-600">H{hizb}/60</span>
                  {khatams > 0 && (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                      ×{khatams} ✨
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
          {(() => {
            const total = profile?.hizbsRead ?? 0
            const hizb = total <= 0 ? 0 : ((total - 1) % 60) + 1
            const khatams = Math.floor(total / 60)
            const readingPage = profile?.currentReadingPage ?? null
            // Sourate en cours déterminée depuis la page de lecture (startPage ≤ page ≤ endPage)
            const readingSurah = readingPage
              ? allSurahs?.find(s => s.startPage <= readingPage && s.endPage >= readingPage)
              : null
            return (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl font-black text-blue-600 tabular-nums">H{hizb}</span>
                  <span className="text-xs font-semibold text-muted-foreground">/60</span>
                  {readingPage && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full tabular-nums">
                      P.{readingPage}
                    </span>
                  )}
                  {khatams > 0 && (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                      ×{khatams} ✨
                    </span>
                  )}
                </div>
                {readingSurah && (
                  <p className="text-xs text-muted-foreground">
                    📍 {readingSurah.nameEn} — {readingSurah.nameFr}
                  </p>
                )}
                <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${(hizb / 60) * 100}%` }} />
                </div>
              </>
            )
          })()}
        </div>

        {/* ── Badges ── */}
        <div className="pt-2 border-t space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Badges · {earnedIds.size}/{PROFILE_BADGES.length} obtenus
          </p>

          {([
            { key: 'memo',    label: '📖 Mémorisation' },
            { key: 'lecture', label: '📚 Lecture'       },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <p className="text-[10px] text-muted-foreground mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {badgesByCategory[key].map(badge => {
                  const earned = earnedIds.has(badge.id)
                  return (
                    <div
                      key={badge.id}
                      title={earned ? badge.name : `🔒 ${badge.hint}`}
                      className={`flex flex-col items-center gap-1 w-14 transition-opacity ${earned ? '' : 'opacity-30'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                        earned ? 'bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-400 dark:ring-amber-600' : 'bg-muted'
                      }`}>
                        {badge.emoji}
                      </div>
                      <span className="text-[9px] text-center leading-tight text-muted-foreground truncate w-full px-0.5">
                        {badge.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activité */}
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Mon activité</p>
        <Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded-lg" />}>
          <HeatmapCalendar data={heatmapData} />
        </Suspense>
      </div>

      {/* Progression Coran */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progression Coran</p>
          <Link href="/surahs" className="text-xs text-emerald-600 font-semibold hover:underline">
            Tout voir →
          </Link>
        </div>

        {juzProgress.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📖</div>
            <p className="text-sm text-muted-foreground mb-3">Aucune progression pour l&apos;instant</p>
            <Link href="/surahs"
              className="inline-flex items-center gap-1 text-sm font-medium bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Commencer maintenant →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Résumé global */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2.5 text-center">
                <div className="text-base font-bold text-emerald-600">{surahsWithStatus.filter(s => s.status === 'memorized').length}</div>
                <div className="text-[10px] text-muted-foreground">Mémorisées</div>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-2.5 text-center">
                <div className="text-base font-bold text-amber-600">{surahsWithStatus.filter(s => s.status === 'in_progress').length}</div>
                <div className="text-[10px] text-muted-foreground">En cours</div>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-2.5 text-center">
                <div className="text-base font-bold text-blue-600">{juzProgress.filter(j => j.pct === 100).length}/30</div>
                <div className="text-[10px] text-muted-foreground">Juz complets</div>
              </div>
            </div>

            {/* Top juz en cours */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Meilleure progression</p>
            {juzProgress.map(({ juz, pct, done, total, firstName, lastName }) => (
              <div key={juz} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-10">Juz {juz}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-32">{firstName} → {lastName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">{done}/{total}</span>
                    <span className={`text-xs font-bold tabular-nums w-9 text-right ${pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-stone-400'}`}>{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-stone-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
