'use client'
/**
 * @file SurahsClient — Mes 114 sourates avec CRUD inline
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'
import type { Surah, MemorizationStatus } from '@quran-tracker/types'

interface ProgressEntry {
  surahId: number
  status: MemorizationStatus
  verseFrom?: number | null
  verseTo?: number | null
  nextReviewAt?: string | null
  validatedBySheikhAt?: string | null
}

const STATUS: Record<MemorizationStatus, { label: string; dot: string; pill: string; bg: string }> = {
  not_started: {
    label: 'Non commencé',
    dot: 'bg-slate-300',
    pill: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    bg: 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
  },
  in_progress: {
    label: 'En cours',
    dot: 'bg-amber-400',
    pill: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    bg: 'hover:bg-amber-50/80 dark:hover:bg-amber-900/20',
  },
  memorized: {
    label: 'Mémorisé',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    bg: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20',
  },
  consolidated: {
    label: 'Consolidé',
    dot: 'bg-violet-500',
    pill: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
    bg: 'hover:bg-violet-50/80 dark:hover:bg-violet-900/20',
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

interface MenuState {
  surahId: number
  versesCount: number
  currentStatus: MemorizationStatus
  verseFrom: number | null
  verseTo: number | null
  pendingStatus: MemorizationStatus | null
}

export function SurahsClient() {
  const { data: session } = useSession()
  const user = session?.user as { id: string } | undefined
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MemorizationStatus | 'all'>('all')
  const [menu, setMenu] = useState<MenuState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menu) return
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === 'Escape') { setMenu(null); return }
      if (e instanceof MouseEvent && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null)
      }
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handle)
    }
  }, [menu])

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
    mutationFn: ({ surahId, status, verseFrom, verseTo }: {
      surahId: number; status: MemorizationStatus
      verseFrom?: number | null; verseTo?: number | null
    }) =>
      apiFetch('/api/progress', {
        method: 'POST',
        body: JSON.stringify({ surahId, status, verseFrom: verseFrom ?? null, verseTo: verseTo ?? null }),
      }),
    onMutate: async ({ surahId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['progress', user?.id] })
      const prev = queryClient.getQueryData<ProgressEntry[]>(['progress', user?.id])
      queryClient.setQueryData<ProgressEntry[]>(['progress', user?.id], (old = []) => {
        const idx = old.findIndex(p => p.surahId === surahId)
        if (idx >= 0) return old.map(p => p.surahId === surahId ? { ...p, status } : p)
        return [...old, { surahId, status }]
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['progress', user?.id], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      setMenu(null)
    },
  })

  const pMap = useMemo(() => new Map(progress.map(p => [p.surahId, p])), [progress])

  const enriched = useMemo(() =>
    allSurahs.map(s => ({
      ...s,
      status: pMap.get(s.id)?.status ?? 'not_started' as MemorizationStatus,
      verseFrom: pMap.get(s.id)?.verseFrom ?? null,
      verseTo: pMap.get(s.id)?.verseTo ?? null,
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

  function openMenu(s: typeof enriched[0]) {
    setMenu({
      surahId: s.id,
      versesCount: s.versesCount,
      currentStatus: s.status,
      verseFrom: s.verseFrom,
      verseTo: s.verseTo,
      pendingStatus: null,
    })
  }

  function confirmSave() {
    if (!menu) return
    const status = menu.pendingStatus ?? menu.currentStatus
    updateStatus.mutate({
      surahId: menu.surahId,
      status,
      verseFrom: menu.verseFrom,
      verseTo: menu.verseTo,
    })
  }

  if (l1 || l2) return <Skeleton />

  return (
    <div className="space-y-4 pb-20 md:pb-0">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { n: stats.memorized, label: 'Mémorisées', dot: 'bg-emerald-500', v: 'memorized' as const },
          { n: stats.inProgress, label: 'En cours', dot: 'bg-amber-400', v: 'in_progress' as const },
          { n: stats.notStarted, label: 'Non commencé', dot: 'bg-slate-300', v: 'not_started' as const },
          { n: stats.toReview, label: 'À réviser', dot: 'bg-violet-500', v: null },
        ].map(({ n, label, dot, v }) => (
          <button key={label}
            onClick={() => v && setFilter(f => f === v ? 'all' : v)}
            className={`flex flex-col gap-1.5 p-3 rounded-2xl border bg-card text-left transition-all active:scale-[0.97] ${v && filter === v ? 'ring-2 ring-emerald-600 ring-offset-1 shadow-sm' : 'hover:shadow-sm'}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-2xl font-bold tabular-nums tracking-tight">{n}</span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher — Al-Fatiha, 114…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-muted-foreground shadow-sm"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.value
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900'
                : 'bg-card border text-muted-foreground hover:text-foreground hover:border-foreground/20'
            }`}
          >
            {f.value !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${STATUS[f.value as MemorizationStatus].dot}`} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Juz list */}
      {juzGroups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-sm font-medium">Aucune sourate trouvée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {juzGroups.map(({ juz, list, pct }) => (
            <div key={juz} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              {/* Juz header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Juz {juz}</span>
                  {pct === 100 && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-full tracking-wide">COMPLET</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums text-muted-foreground w-7 text-right">{pct}%</span>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/40">
                {list.map(surah => (
                  <div key={surah.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <span className="w-7 text-center text-xs font-bold text-muted-foreground flex-shrink-0 tabular-nums">{surah.number}</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{surah.nameFr}</span>
                        {surah.validated && <span className="text-[10px] font-bold text-emerald-600 flex-shrink-0">✓</span>}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <span>{surah.versesCount}v</span>
                        {surah.status === 'in_progress' && surah.verseFrom && (
                          <span className="text-amber-600 font-medium">· v.{surah.verseFrom}{surah.verseTo ? `–${surah.verseTo}` : '+'}</span>
                        )}
                      </div>
                    </div>

                    <span className="arabic-text text-sm font-bold hidden sm:block flex-shrink-0 text-right opacity-80">{surah.nameAr}</span>

                    {/* Status button */}
                    <div className="relative flex-shrink-0" ref={menu?.surahId === surah.id ? menuRef : undefined}>
                      <button
                        onClick={() => menu?.surahId === surah.id ? setMenu(null) : openMenu(surah)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${STATUS[surah.status].pill}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS[surah.status].dot}`} />
                        <span className="hidden sm:inline">{STATUS[surah.status].label}</span>
                        <svg className={`w-3 h-3 opacity-40 transition-transform ${menu?.surahId === surah.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {menu?.surahId === surah.id && (
                        <div className="absolute right-0 top-full mt-1.5 z-30 bg-card border shadow-xl rounded-2xl overflow-hidden w-52 p-1">
                          {/* Status options */}
                          {ALL_STATUSES.map(s => (
                            <button key={s}
                              onClick={() => setMenu(m => m ? { ...m, pendingStatus: s } : null)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                                (menu.pendingStatus ?? menu.currentStatus) === s
                                  ? `${STATUS[s].pill} font-semibold`
                                  : `text-foreground ${STATUS[s].bg}`
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS[s].dot}`} />
                              {STATUS[s].label}
                              {(menu.pendingStatus ?? menu.currentStatus) === s && (
                                <svg className="w-3.5 h-3.5 ml-auto text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}

                          {/* Verse range (when in_progress selected) */}
                          {(menu.pendingStatus ?? menu.currentStatus) === 'in_progress' && (
                            <div className="px-2 pb-1 mt-1 pt-1 border-t">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Où en es-tu ?</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] text-muted-foreground">De</label>
                                  <input type="number" min={1} max={surah.versesCount}
                                    value={menu.verseFrom ?? ''}
                                    onChange={e => setMenu(m => m ? { ...m, verseFrom: e.target.value ? Number(e.target.value) : null } : null)}
                                    placeholder="1"
                                    className="w-full mt-0.5 px-2 py-1 text-xs rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                                <span className="text-muted-foreground text-xs mt-4">→</span>
                                <div className="flex-1">
                                  <label className="text-[10px] text-muted-foreground">À</label>
                                  <input type="number" min={1} max={surah.versesCount}
                                    value={menu.verseTo ?? ''}
                                    onChange={e => setMenu(m => m ? { ...m, verseTo: e.target.value ? Number(e.target.value) : null } : null)}
                                    placeholder={String(surah.versesCount)}
                                    className="w-full mt-0.5 px-2 py-1 text-xs rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Save button */}
                          <div className="px-2 pb-2 mt-1 pt-1 border-t">
                            <button
                              onClick={confirmSave}
                              disabled={updateStatus.isPending}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                              {updateStatus.isPending ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                          </div>
                        </div>
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
      <div className="grid grid-cols-4 gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl" />)}</div>
      <div className="h-10 bg-muted rounded-xl" />
      <div className="flex gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-7 w-24 bg-muted rounded-full" />)}</div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-muted rounded-2xl" />)}
    </div>
  )
}
