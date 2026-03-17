'use client'
/**
 * @file SurahsClient — Mes 114 sourates avec CRUD inline
 */
import { useState, useMemo } from 'react'
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
    dot: 'bg-emerald-700',
    pill: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    bg: 'hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30',
  },
}

const ALL_STATUSES = ['not_started', 'in_progress', 'memorized'] as MemorizationStatus[]

const JUZ_NAMES_AR: Record<number, string> = {
  1: 'الأوَّل', 2: 'الثَّاني', 3: 'الثَّالث', 4: 'الرَّابع', 5: 'الخَامس',
  6: 'السَّادس', 7: 'السَّابع', 8: 'الثَّامن', 9: 'التَّاسع', 10: 'العَاشر',
  11: 'الحَادي عَشَر', 12: 'الثَّاني عَشَر', 13: 'الثَّالث عَشَر', 14: 'الرَّابع عَشَر', 15: 'الخَامس عَشَر',
  16: 'السَّادس عَشَر', 17: 'السَّابع عَشَر', 18: 'الثَّامن عَشَر', 19: 'التَّاسع عَشَر', 20: 'العِشْرُون',
  21: 'الحَادي والعِشْرُون', 22: 'الثَّاني والعِشْرُون', 23: 'الثَّالث والعِشْرُون',
  24: 'الرَّابع والعِشْرُون', 25: 'الخَامس والعِشْرُون', 26: 'السَّادس والعِشْرُون',
  27: 'السَّابع والعِشْرُون', 28: 'الثَّامن والعِشْرُون', 29: 'التَّاسع والعِشْرُون', 30: 'الثَّلَاثُون',
}


export function SurahsClient() {
  const { data: session } = useSession()
  const user = session?.user as { id: string } | undefined
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [openJuz, setOpenJuz] = useState<Set<number>>(new Set())

  function toggleJuz(juz: number) {
    setOpenJuz(prev => {
      const next = new Set(prev)
      if (next.has(juz)) next.delete(juz)
      else next.add(juz)
      return next
    })
  }

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
    mutationFn: ({ surahId, status }: {
      surahId: number; status: MemorizationStatus
    }) =>
      apiFetch('/api/progress', {
        method: 'POST',
        body: JSON.stringify({ surahId, status, verseFrom: null, verseTo: null }),
      }),
    onMutate: async ({ surahId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['progress', user?.id] })
      const prev = queryClient.getQueryData<ProgressEntry[]>(['progress', user?.id])
      queryClient.setQueryData<ProgressEntry[]>(['progress', user?.id], (old = []) => {
        const patch = { status, verseFrom: null, verseTo: null }
        const idx = old.findIndex(p => p.surahId === surahId)
        if (idx >= 0) return old.map(p => p.surahId === surahId ? { ...p, ...patch } : p)
        return [...old, { surahId, ...patch }]
      })
      return { prev }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] })
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['progress', user?.id], ctx.prev)
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
    memorized: enriched.filter(s => s.status === 'memorized').length,
    inProgress: enriched.filter(s => s.status === 'in_progress').length,
    notStarted: enriched.filter(s => s.status === 'not_started').length,
    toReview: enriched.filter(s => s.dueReview).length,
  }), [enriched])

  const filtered = useMemo(() =>
    enriched.filter(s => {
      const q = search.toLowerCase()
      const matchSearch = q === '' || s.nameFr.toLowerCase().includes(q) || s.nameAr.includes(search) || String(s.number) === search
      return matchSearch
    }), [enriched, search])

  const juzGroups = useMemo(() => {
    const map = new Map<number, typeof filtered>()
    filtered.forEach(s => { map.set(s.juzNumber, [...(map.get(s.juzNumber) ?? []), s]) })
    return [...map.entries()].sort(([a], [b]) => a - b).map(([juz, list]) => {
      const totalVerses = list.reduce((sum, s) => sum + s.versesCount, 0)
      const doneVerses = list
        .filter(s => s.status === 'memorized' || s.status === 'consolidated')
        .reduce((sum, s) => sum + s.versesCount, 0)
      return { juz, list, pct: totalVerses > 0 ? Math.round((doneVerses / totalVerses) * 100) : 0 }
    })
  }, [filtered])

  function cycleStatus(surah: typeof enriched[0]) {
    const CYCLE: MemorizationStatus[] = ['not_started', 'in_progress', 'memorized']
    const idx = CYCLE.indexOf(surah.status)
    const next = CYCLE[(idx + 1) % CYCLE.length]!
    updateStatus.mutate({ surahId: surah.id, status: next })
  }

  if (l1 || l2) return <Skeleton />

  return (
    <div className="space-y-4 pb-20 md:pb-0">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: stats.memorized, label: 'Mémorisées', dot: 'bg-emerald-500' },
          { n: stats.inProgress, label: 'En cours', dot: 'bg-amber-400' },
          { n: stats.notStarted, label: 'Non commencé', dot: 'bg-slate-300' },
        ].map(({ n, label, dot }) => (
          <div key={label}
            className="flex flex-col gap-1.5 p-3 rounded-2xl border bg-card text-left"
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight">{n}</span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          </div>
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
              {/* Juz header — cliquable pour replier */}
              <button
                type="button"
                onClick={() => toggleJuz(juz)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${!openJuz.has(juz) ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Juz {juz}</span>
                  <span className="arabic-text text-sm font-semibold text-stone-600 dark:text-stone-400 mx-2">
                    {JUZ_NAMES_AR[juz] ?? ''}
                  </span>
                  {pct === 100 && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-full tracking-wide">COMPLET</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums text-muted-foreground w-7 text-right">{pct}%</span>
                </div>
              </button>

              {/* Rows — masqués si Juz replié */}
              {openJuz.has(juz) && <div className="divide-y divide-border/40">
                {list.map(surah => (
                  <div key={surah.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-muted/20 transition-colors">
                    <span className="w-6 sm:w-7 text-center text-xs font-bold text-muted-foreground flex-shrink-0 tabular-nums">{surah.number}</span>

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

                    <span className="arabic-text text-sm font-bold flex-shrink-0 text-right opacity-80">{surah.nameAr}</span>

                    {/* Status button — Cycle au tap */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => cycleStatus(surah)}
                        disabled={updateStatus.isPending && updateStatus.variables?.surahId === surah.id}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                          surah.dueReview
                            ? 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                            : STATUS[surah.status].pill
                        }`}
                      >
                        {updateStatus.isPending && updateStatus.variables?.surahId === surah.id ? (
                          <span className="w-3 h-3 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${surah.dueReview ? 'bg-orange-400' : STATUS[surah.status].dot}`} />
                        )}
                        <span className="hidden sm:inline">{surah.dueReview ? 'À réviser' : STATUS[surah.status].label}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>}
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
