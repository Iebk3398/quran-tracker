'use client'
/**
 * @file SurahsClient — Liste des 114 sourates avec CRUD inline
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'
import type { Surah, MemorizationStatus } from '@quran-tracker/types'

interface ProgressEntry {
  surahId: number
  status: MemorizationStatus
  nextReviewAt?: string | null
  validatedBySheikhAt?: string | null
}

const STATUS_CONFIG: Record<MemorizationStatus, { label: string; emoji: string; color: string }> = {
  not_started: { label: 'Non commencé', emoji: '⬜', color: 'bg-stone-100 text-stone-600 border-stone-200' },
  in_progress:  { label: 'En cours',     emoji: '🟡', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  memorized:    { label: 'Mémorisé',     emoji: '🟢', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  consolidated: { label: 'Consolidé',    emoji: '🔵', color: 'bg-blue-100 text-blue-700 border-blue-200' },
}

const ALL_STATUSES = ['not_started', 'in_progress', 'memorized', 'consolidated'] as MemorizationStatus[]

export function SurahsClient() {
  const { data: session } = useSession()
  const user = session?.user as { id: string } | undefined
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<MemorizationStatus | 'all'>('all')
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)

  const { data: allSurahs = [], isLoading: surahsLoading } = useQuery({
    queryKey: ['surahs'],
    queryFn: () => apiFetch<Surah[]>('/api/surahs'),
  })

  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => apiFetch<ProgressEntry[]>(`/api/progress/${user!.id}`),
    enabled: !!user?.id,
  })

  const updateStatus = useMutation({
    mutationFn: ({ surahId, status }: { surahId: number; status: MemorizationStatus }) =>
      apiFetch('/api/progress', {
        method: 'POST',
        body: JSON.stringify({ surahId, status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', user?.id] })
      setOpenDropdown(null)
    },
  })

  const progressMap = useMemo(
    () => new Map(progress.map((p) => [p.surahId, p])),
    [progress]
  )

  const surahsWithStatus = useMemo(
    () => allSurahs.map((s) => ({
      ...s,
      status: progressMap.get(s.id)?.status ?? 'not_started' as MemorizationStatus,
      nextReviewAt: progressMap.get(s.id)?.nextReviewAt,
      validated: !!progressMap.get(s.id)?.validatedBySheikhAt,
    })),
    [allSurahs, progressMap]
  )

  const filtered = useMemo(() => {
    return surahsWithStatus.filter((s) => {
      const matchSearch = search === '' ||
        s.nameFr.toLowerCase().includes(search.toLowerCase()) ||
        s.nameAr.includes(search) ||
        String(s.number).includes(search)
      const matchStatus = filterStatus === 'all' || s.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [surahsWithStatus, search, filterStatus])

  // Stats
  const stats = useMemo(() => ({
    memorized: surahsWithStatus.filter(s => s.status === 'memorized' || s.status === 'consolidated').length,
    inProgress: surahsWithStatus.filter(s => s.status === 'in_progress').length,
    notStarted: surahsWithStatus.filter(s => s.status === 'not_started').length,
    toReview: surahsWithStatus.filter(s => s.nextReviewAt && new Date(s.nextReviewAt) <= new Date()).length,
  }), [surahsWithStatus])

  // Group by Juz
  const juzGroups = useMemo(() => {
    const groups = new Map<number, typeof filtered>()
    filtered.forEach(s => {
      const list = groups.get(s.juzNumber) ?? []
      list.push(s)
      groups.set(s.juzNumber, list)
    })
    return Array.from(groups.entries())
      .sort(([a], [b]) => b - a) // Juz 30 en premier (Juz Amma)
      .map(([juz, surahs]) => {
        const done = surahs.filter(s => s.status === 'memorized' || s.status === 'consolidated').length
        const pct = Math.round((done / surahs.length) * 100)
        const complete = pct === 100
        return { juz, surahs, pct, complete }
      })
  }, [filtered])

  const isLoading = surahsLoading || progressLoading

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
        {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox value={stats.memorized} label="Mémorisées" emoji="🟢" color="text-emerald-600" onClick={() => setFilterStatus(filterStatus === 'memorized' ? 'all' : 'memorized')} active={filterStatus === 'memorized'} />
        <StatBox value={stats.inProgress} label="En cours" emoji="🟡" color="text-amber-600" onClick={() => setFilterStatus(filterStatus === 'in_progress' ? 'all' : 'in_progress')} active={filterStatus === 'in_progress'} />
        <StatBox value={stats.notStarted} label="Non commencées" emoji="⬜" color="text-stone-600" onClick={() => setFilterStatus(filterStatus === 'not_started' ? 'all' : 'not_started')} active={filterStatus === 'not_started'} />
        <StatBox value={stats.toReview} label="À réviser" emoji="🔵" color="text-blue-600" onClick={() => setFilterStatus('all')} active={false} />
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une sourate..."
            className="w-full pl-8 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as MemorizationStatus | 'all')}
          className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="not_started">⬜ Non commencé</option>
          <option value="in_progress">🟡 En cours</option>
          <option value="memorized">🟢 Mémorisé</option>
          <option value="consolidated">🔵 Consolidé</option>
        </select>
      </div>

      {/* List by Juz */}
      {juzGroups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-2">🔍</div>
          <p>Aucune sourate trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {juzGroups.map(({ juz, surahs: juzSurahs, pct, complete }) => (
            <div key={juz} className="rounded-xl border bg-card overflow-hidden">
              {/* Juz header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Juz {juz}</span>
                  {complete && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Complet ✅</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-stone-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-stone-500'}`}>{pct}%</span>
                </div>
              </div>

              {/* Surahs */}
              <div className="divide-y">
                {juzSurahs.map((surah) => (
                  <div key={surah.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    {/* Number */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${STATUS_CONFIG[surah.status].color} border`}>
                      {surah.number}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{surah.nameFr}</div>
                      <div className="text-xs text-muted-foreground">{surah.versesCount} versets · {surah.revelationType === 'meccan' ? 'Mecquoise' : 'Médinoise'}</div>
                    </div>

                    {/* Arabic name */}
                    <div className="arabic-text text-base font-semibold text-right hidden sm:block">{surah.nameAr}</div>

                    {/* Status badge — inline dropdown */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === surah.id ? null : surah.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80 ${STATUS_CONFIG[surah.status].color}`}
                      >
                        {STATUS_CONFIG[surah.status].emoji}
                        <span className="hidden sm:inline">{STATUS_CONFIG[surah.status].label}</span>
                        <span className="text-[10px] opacity-60">▾</span>
                      </button>

                      {openDropdown === surah.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute right-0 top-full mt-1 z-20 bg-card border rounded-xl shadow-lg overflow-hidden w-44">
                            {ALL_STATUSES.map(status => (
                              <button
                                key={status}
                                onClick={() => updateStatus.mutate({ surahId: surah.id, status })}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left ${surah.status === status ? 'bg-muted font-medium' : ''}`}
                                disabled={updateStatus.isPending}
                              >
                                {STATUS_CONFIG[status].emoji}
                                <span>{STATUS_CONFIG[status].label}</span>
                                {surah.status === status && <span className="ml-auto text-emerald-600">✓</span>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sheikh validated */}
                    {surah.validated && (
                      <span className="text-xs text-emerald-600 font-medium hidden md:block flex-shrink-0">✓ Sheikh</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatBox({ value, label, emoji, color, onClick, active }: {
  value: number; label: string; emoji: string; color: string
  onClick: () => void; active: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border bg-card text-left transition-all hover:shadow-sm ${active ? 'ring-2 ring-emerald-500' : ''}`}
    >
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label} {emoji}</div>
    </button>
  )
}
