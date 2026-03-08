'use client'
/**
 * @file SurahsClient — Mes 114 sourates avec mise à jour inline
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

const STATUS: Record<MemorizationStatus, { label: string; dot: string; pill: string; menu: string }> = {
  not_started: {
    label: 'Non commencé',
    dot: 'bg-stone-300',
    pill: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
    menu: 'hover:bg-stone-50 dark:hover:bg-stone-800',
  },
  in_progress: {
    label: 'En cours',
    dot: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    menu: 'hover:bg-amber-50 dark:hover:bg-amber-900/20',
  },
  memorized: {
    label: 'Mémorisé',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    menu: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  },
  consolidated: {
    label: 'Consolidé',
    dot: 'bg-blue-500',
    pill: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    menu: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
  },
}

const ALL_STATUSES = ['not_started', 'in_progress', 'memorized', 'consolidated'] as MemorizationStatus[]

const FILTERS: { value: MemorizationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'memorized', label: 'Mémorisées' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'not_started', label: 'Non commencé' },
  { value: 'consolidated', label: 'Consolidées' },
]

export function SurahsClient() {
  const { data: session } = useSession()
  const user = session?.user as { id: string } | undefined
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MemorizationStatus | 'all'>('all')
  const [openMenu, setOpenMenu] = useState<number | null>(null)

  const { data: allSurahs = [], isLoading: l1 } = useQuery({
    queryKey: ['surahs'],
    queryFn: () => apiFetch<Surah[]>('/api/surahs'),
  })

  const { data: progress = [], isLoading: l2 } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => apiFetch<ProgressEntry[]>(`/api/progress/${user!.id}`),
    enabled: !!user?.id,
  })

  const updateStatus = useMutation({
    mutationFn: ({ surahId, status }: { surahId: number; status: MemorizationStatus }) =>
      apiFetch('/api/progress', { method: 'POST', body: JSON.stringify({ surahId, status }) }),
    onMutate: async ({ surahId, status }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['progress', user?.id] })
      const prev = queryClient.getQueryData<ProgressEntry[]>(['progress', user?.id])
      queryClient.setQueryData<ProgressEntry[]>(['progress', user?.id], (old = []) => {
        const idx = old.findIndex(p => p.surahId === surahId)
        if (idx >= 0) return old.map(p => p.surahId === surahId ? { ...p, status } : p)
        return [...old, { surahId, status }]
      })
      setOpenMenu(null)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['progress', user?.id], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', user?.id] })
    },
  })

  const pMap = useMemo(() => new Map(progress.map(p => [p.surahId, p])), [progress])

  const enriched = useMemo(() =>
    allSurahs.map(s => ({
      ...s,
      status: pMap.get(s.id)?.status ?? 'not_started' as MemorizationStatus,
      validated: !!pMap.get(s.id)?.validatedBySheikhAt,
      dueReview: !!(pMap.get(s.id)?.nextReviewAt && new Date(pMap.get(s.id)!.nextReviewAt!) <= new Date()),
    })), [allSurahs, pMap])

  const stats = useMemo(() => ({
    memorized: enriched.filter(s => s.status === 'memorized' || s.status === 'consolidated').length,
    inProgress: enriched.filter(s => s.status === 'in_progress').length,
    notStarted: enriched.filter(s => s.status === 'not_started').length,
    toReview: enriched.filter(s => s.dueReview).length,
  }), [enriched])

  const filtered = useMemo(() =>
    enriched.filter(s => {
      const q = search.toLowerCase()
      return (
        (q === '' || s.nameFr.toLowerCase().includes(q) || s.nameAr.includes(search) || String(s.number) === search) &&
        (filter === 'all' || s.status === filter)
      )
    }), [enriched, search, filter])

  const juzGroups = useMemo(() => {
    const map = new Map<number, typeof filtered>()
    filtered.forEach(s => { map.set(s.juzNumber, [...(map.get(s.juzNumber) ?? []), s]) })
    return [...map.entries()].sort(([a], [b]) => b - a).map(([juz, list]) => {
      const done = list.filter(s => s.status === 'memorized' || s.status === 'consolidated').length
      return { juz, list, pct: Math.round((done / list.length) * 100) }
    })
  }, [filtered])

  if (l1 || l2) return <Skeleton />

  return (
    <div className="space-y-4 pb-20 md:pb-0">

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { n: stats.memorized,  label: 'Mémorisées',     dot: 'bg-emerald-500', active: filter === 'memorized',    onClick: () => setFilter(f => f === 'memorized' ? 'all' : 'memorized') },
          { n: stats.inProgress, label: 'En cours',       dot: 'bg-amber-400',   active: filter === 'in_progress',  onClick: () => setFilter(f => f === 'in_progress' ? 'all' : 'in_progress') },
          { n: stats.notStarted, label: 'Non commencées', dot: 'bg-stone-300',   active: filter === 'not_started',  onClick: () => setFilter(f => f === 'not_started' ? 'all' : 'not_started') },
          { n: stats.toReview,   label: 'À réviser',      dot: 'bg-blue-500',    active: false,                     onClick: () => {} },
        ].map(({ n, label, dot, active, onClick }) => (
          <button key={label} onClick={onClick}
            className={`flex flex-col gap-1 p-3 rounded-xl border bg-card text-left transition-all active:scale-95 ${active ? 'ring-2 ring-emerald-500 ring-offset-1' : 'hover:bg-muted/40'}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-xl font-bold tabular-nums">{n}</span>
            </div>
            <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Al-Fatiha, An-Nas, 114…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === f.value
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.value !== 'all' && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${STATUS[f.value as MemorizationStatus].dot}`} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {juzGroups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-sm">Aucune sourate trouvée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {juzGroups.map(({ juz, list, pct }) => (
            <div key={juz} className="rounded-2xl border bg-card overflow-hidden">
              {/* Juz header */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Juz {juz}</span>
                  {pct === 100 && (
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      Complet
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-stone-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              </div>

              {/* Surahs */}
              <div className="divide-y divide-border/50">
                {list.map(surah => (
                  <div key={surah.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">

                    {/* Number */}
                    <span className="w-8 text-center text-xs font-bold text-muted-foreground flex-shrink-0">
                      {surah.number}
                    </span>

                    {/* Names */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{surah.nameFr}</span>
                        {surah.validated && (
                          <span className="text-[10px] text-emerald-600 font-semibold flex-shrink-0">✓ Sheikh</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{surah.versesCount}v</span>
                    </div>

                    {/* Arabic */}
                    <span className="arabic-text text-sm font-semibold hidden sm:block flex-shrink-0 text-right">{surah.nameAr}</span>

                    {/* Status — inline dropdown */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setOpenMenu(openMenu === surah.id ? null : surah.id)}
                        className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80 active:scale-95 ${STATUS[surah.status].pill}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS[surah.status].dot}`} />
                        <span className="hidden xs:inline sm:inline">{STATUS[surah.status].label}</span>
                        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {openMenu === surah.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 z-20 bg-card border shadow-lg rounded-2xl overflow-hidden w-44 py-1">
                            {ALL_STATUSES.map(s => (
                              <button
                                key={s}
                                onClick={() => updateStatus.mutate({ surahId: surah.id, status: s })}
                                disabled={updateStatus.isPending}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${STATUS[s].menu} ${surah.status === s ? 'font-semibold' : 'font-normal'}`}
                              >
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS[s].dot}`} />
                                <span>{STATUS[s].label}</span>
                                {surah.status === s && (
                                  <svg className="w-3.5 h-3.5 ml-auto text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
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

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
      </div>
      <div className="h-10 bg-muted rounded-xl" />
      <div className="flex gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-7 w-24 bg-muted rounded-full" />)}</div>
      {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-2xl" />)}
    </div>
  )
}
