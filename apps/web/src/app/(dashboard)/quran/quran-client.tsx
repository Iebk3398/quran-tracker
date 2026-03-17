'use client'
/**
 * @file QuranClient — Lecture du Coran
 * @description
 *   - Liste des 114 sourates avec recherche
 *   - Lecture page par page (604 pages du mushaf)
 *   - Texte Uthmani Hafs ʿan ʿĀṣim via quran.com API v4
 *   - Couleurs tajweed — injection inline style (15 règles)
 *   - Marque-page par verset (tap sur verset) → stocké en localStorage
 *   - Carte "Reprendre la lecture" dans la liste des sourates
 *   - Transition slide douce au changement de page
 *   - Contrôle de taille de police (A⁻ A⁺)
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Bookmark, BookmarkCheck, Search, X,
  ArrowLeft, ChevronLeft, ChevronRight, BookOpen,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Surah {
  id: number
  number: number
  nameAr: string
  nameFr: string
  nameTranslit: string
  versesCount: number
  juzNumber: number
  hizbNumber: number
  revelationType: string
  startPage: number
  endPage: number
}

interface QuranVerse {
  id: number
  verse_number: number
  verse_key: string
  text_uthmani_tajweed: string
  juz_number: number
  hizb_number: number
  page_number: number
}

/** Marque-page sur un verset spécifique (ex: sourate 16, verset 43) */
interface VerseBookmark {
  verseKey: string          // "16:43"
  page: number              // page du mushaf
  hizbNumber: number        // hizb (1–60) où se situe le verset
  juzNumber: number         // juz (1–30)
  surahNameTranslit: string // "An-Nahl"
  surahNameAr: string       // "النحل"
  verseNumber: number       // 43
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QURAN_TOTAL_PAGES    = 604
const QURAN_API            = 'https://api.quran.com/api/v4'
const STORAGE_KEY_READ     = 'ikraa_pages_read'
const STORAGE_KEY_VERSE_BK = 'ikraa_verse_bookmark'
const FONT_SIZES           = [20, 24, 28, 32, 36, 40] as const
const DEFAULT_FONT_IDX     = 2   // 28px

const QURAN_FONT = "'KFGQPC HAFS Uthmanic Script', 'UthmanicHafs', 'Scheherazade New', 'Noto Naskh Arabic', serif"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadReadPages(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const r = localStorage.getItem(STORAGE_KEY_READ)
    return r ? new Set(JSON.parse(r) as number[]) : new Set()
  } catch { return new Set() }
}

function saveReadPages(s: Set<number>) {
  localStorage.setItem(STORAGE_KEY_READ, JSON.stringify([...s]))
}

function loadVerseBookmark(): VerseBookmark | null {
  if (typeof window === 'undefined') return null
  try {
    const r = localStorage.getItem(STORAGE_KEY_VERSE_BK)
    return r ? JSON.parse(r) as VerseBookmark : null
  } catch { return null }
}

function saveVerseBookmark(b: VerseBookmark | null) {
  if (!b) localStorage.removeItem(STORAGE_KEY_VERSE_BK)
  else localStorage.setItem(STORAGE_KEY_VERSE_BK, JSON.stringify(b))
}

function revelationLabel(t: string) {
  return t === 'meccan' ? 'Mecquoise' : 'Médinoise'
}

async function fetchPage(page: number): Promise<QuranVerse[]> {
  const url = `${QURAN_API}/verses/by_page/${page}?language=fr&fields=text_uthmani_tajweed,juz_number,hizb_number,page_number&per_page=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { verses: QuranVerse[] }
  return data.verses
}

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

// ─── Tajweed — injection inline style ────────────────────────────────────────
// L'API quran.com retourne : <tajweed class=ham_wasl>ٱ</tajweed>
// Tag custom <tajweed> avec attribut class SANS guillemets.
// Noms réels vérifiés sur l'API : ikhafa, qalaqah, laam_shamsiyah...

const TAJWEED_COLORS: Record<string, string> = {
  ham_wasl:               '#9ba3ae',
  slnt:                   '#c9d0d7',
  laam_shamsiyah:         '#9ba3ae',   // API: laam_shamsiyah (pas laam_shamsiyya)
  madda_obligatory:       '#0d47a1',
  madda_necessary:        '#1565c0',
  madda_permissible:      '#1976d2',
  madda_normal:           '#64b5f6',
  ghunnah:                '#2e7d32',
  ikhafa:                 '#e65100',   // API: ikhafa (pas ikhfa)
  ikhafa_shafawi:         '#bf360c',
  idgham_ghunnah:         '#388e3c',
  idgham_wo_ghunnah:      '#1b5e20',
  idgham_shafawi:         '#33691e',
  idgham_mutajanisayn:    '#2e7d32',
  idgham_mutaqaribbayn:   '#1b5e20',
  iqlab:                  '#7b1fa2',
  qalaqah:                '#c62828',   // API: qalaqah (pas qalqalah)
}

/**
 * Convertit un nombre en chiffres arabes orientaux (٠١٢٣٤٥٦٧٨٩)
 */
function toAr(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)] ?? d)
}

/**
 * Supprime le marqueur de fin de verset de l'API quran.com.
 * Format réel : <span class=end>١</span>
 */
function stripVerseEndMarker(html: string): string {
  return html
    .replace(/<span class=end>[^<]*<\/span>\s*$/, '')
    .replace(/<span[^>]*>[\u0660-\u0669\u06F0-\u06F9]+<\/span>\s*$/, '')
    .trim()
}

/**
 * Injecte les couleurs tajweed en style inline dans le HTML brut de l'API.
 * Format réel API : <tajweed class=ham_wasl>ٱ</tajweed>
 * Tag custom <tajweed> avec class sans guillemets.
 */
function applyTajweedColors(html: string): string {
  return html.replace(/<tajweed class=([a-z_]+)>/g, (_match, cls: string) => {
    const color = TAJWEED_COLORS[cls]
    return color
      ? `<tajweed class=${cls} style="color:${color};font-style:normal">`
      : `<tajweed class=${cls}>`
  })
}

// ─── SurahRow ─────────────────────────────────────────────────────────────────

function SurahRow({ surah, onClick }: { surah: Surah; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 active:bg-stone-100 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
          {surah.number}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-stone-900 dark:text-stone-100 leading-tight">
          {surah.nameTranslit}
        </p>
        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
          {surah.nameFr} · {surah.versesCount} versets
        </p>
      </div>
      <span
        className="shrink-0 text-xl text-stone-800 dark:text-stone-200"
        style={{ fontFamily: QURAN_FONT, lineHeight: 1.8 }}
      >
        {surah.nameAr}
      </span>
    </button>
  )
}

// ─── ReadingView ──────────────────────────────────────────────────────────────

function ReadingView({
  initialPage,
  initialVerseKey,
  surahs,
  onClose,
  onMarkRead,
  readPages,
  verseBookmark,
  onSetVerseBookmark,
}: {
  initialPage: number
  initialVerseKey?: string   // si fourni, scroll automatique vers ce verset
  surahs: Surah[]
  onClose: () => void
  onMarkRead: (page: number, hizb: number) => void
  readPages: Set<number>
  verseBookmark: VerseBookmark | null
  onSetVerseBookmark: (b: VerseBookmark | null) => void
}) {
  const [page, setPage]             = useState(Math.max(1, Math.min(initialPage, QURAN_TOTAL_PAGES)))
  const [fontIdx, setFontIdx]       = useState(DEFAULT_FONT_IDX)
  const [pageBookmarked, setPageBookmarked] = useState(false)
  const [toastMsg, setToastMsg]     = useState<string | null>(null)
  const [animKey, setAnimKey]       = useState(0)
  const [pageDir, setPageDir]       = useState<'forward' | 'back'>('forward')
  const touchStartX                 = useRef<number | null>(null)
  const targetVerseRef              = useRef<string | null>(initialVerseKey ?? null)
  const queryClient                 = useQueryClient()

  const fontSize = FONT_SIZES[fontIdx] ?? 28

  const { data: verses = [], isLoading, isError } = useQuery<QuranVerse[]>({
    queryKey: ['quran-page', page],
    queryFn: () => fetchPage(page),
    staleTime: Infinity,
  })

  // Précharger pages adjacentes
  useEffect(() => {
    if (page < QURAN_TOTAL_PAGES)
      queryClient.prefetchQuery({ queryKey: ['quran-page', page + 1], queryFn: () => fetchPage(page + 1), staleTime: Infinity })
    if (page > 1)
      queryClient.prefetchQuery({ queryKey: ['quran-page', page - 1], queryFn: () => fetchPage(page - 1), staleTime: Infinity })
  }, [page, queryClient])

  useEffect(() => { setPageBookmarked(readPages.has(page)) }, [page, readPages])

  // Auto-scroll vers un verset cible après chargement
  useEffect(() => {
    if (!targetVerseRef.current || isLoading || verses.length === 0) return
    const el = document.getElementById(`verse-${targetVerseRef.current}`)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
      targetVerseRef.current = null
    }
  }, [verses, isLoading])

  const juz  = verses[0]?.juz_number  ?? 1
  const hizb = verses[0]?.hizb_number ?? 1

  const currentSurahNum = verses[0] ? parseInt(verses[0].verse_key.split(':')[0] ?? '1') : 1
  const currentSurah    = surahs.find((s) => s.number === currentSurahNum)

  const groups = useMemo(() => {
    const result: { sn: number; surah?: Surah; verses: QuranVerse[] }[] = []
    for (const v of verses) {
      const sn = parseInt(v.verse_key.split(':')[0] ?? '1')
      const last = result[result.length - 1]
      if (!last || last.sn !== sn)
        result.push({ sn, surah: surahs.find((s) => s.number === sn), verses: [v] })
      else
        last.verses.push(v)
    }
    return result
  }, [verses, surahs])

  const goTo = useCallback((p: number) => {
    const newPage = Math.max(1, Math.min(p, QURAN_TOTAL_PAGES))
    if (newPage === page) return
    setPageDir(newPage > page ? 'forward' : 'back')
    setAnimKey((k) => k + 1)
    setPage(newPage)
  }, [page])

  // Swipe mobile
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0]?.clientX ?? null }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(dx) > 55) dx > 0 ? goTo(page - 1) : goTo(page + 1)
    touchStartX.current = null
  }

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2200)
  }

  /** Marque la page comme lue (compteur hizb) */
  function handlePageBookmark() {
    if (pageBookmarked) return
    setPageBookmarked(true)
    onMarkRead(page, hizb)
    showToast(`Page ${page} marquée · +5 XP`)
  }

  /**
   * Marque un verset comme signet de lecture.
   * Un deuxième tap sur le même verset supprime le signet.
   */
  function handleVerseBookmark(v: QuranVerse, surah?: Surah) {
    const isCurrentBookmark = verseBookmark?.verseKey === v.verse_key
    if (isCurrentBookmark) {
      onSetVerseBookmark(null)
      showToast('Marque-page supprimé')
    } else {
      const bk: VerseBookmark = {
        verseKey: v.verse_key,
        page,
        hizbNumber: v.hizb_number,
        juzNumber: v.juz_number,
        surahNameTranslit: surah?.nameTranslit ?? '',
        surahNameAr: surah?.nameAr ?? '',
        verseNumber: v.verse_number,
      }
      onSetVerseBookmark(bk)
      showToast(`Marque-page : ${surah?.nameTranslit ?? ''} ${v.verse_key}`)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#f8f5ee' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ══ HEADER ══════════════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-2.5"
        style={{ background: '#f8f5ee', borderBottom: '1px solid #e8e1d5' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200/60 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center px-2">
          <p
            className="font-semibold text-stone-800 text-base leading-none"
            style={{ fontFamily: QURAN_FONT }}
          >
            {currentSurah?.nameAr ?? ''}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5 font-medium tracking-wide">
            {currentSurah?.nameTranslit ?? ''}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
            disabled={fontIdx === 0}
            className="flex items-center justify-center text-stone-500 hover:text-stone-800 disabled:opacity-30 transition-colors px-1"
            style={{ fontSize: 13, fontWeight: 600 }}
          >A</button>
          <button
            onClick={() => setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
            disabled={fontIdx === FONT_SIZES.length - 1}
            className="flex items-center justify-center text-stone-700 hover:text-stone-900 disabled:opacity-30 transition-colors px-1"
            style={{ fontSize: 18, fontWeight: 700 }}
          >A</button>
          {/* Marque-page PAGE (compteur hizb) */}
          <button
            onClick={handlePageBookmark}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-colors ml-0.5',
              pageBookmarked ? 'text-emerald-600' : 'text-stone-500 hover:text-stone-800',
            )}
          >
            {pageBookmarked
              ? <BookmarkCheck className="w-[18px] h-[18px]" />
              : <Bookmark className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* ══ CONTENU ══════════════════════════════════════════════════════════════ */}
      <div
        key={animKey}
        className={`flex-1 overflow-y-auto scrollbar-none px-5 py-3 ${pageDir === 'forward' ? 'quran-page-forward' : 'quran-page-back'}`}
      >
        {isLoading && (
          <div className="flex justify-center items-center h-52">
            <div className="w-7 h-7 rounded-full border-2 border-stone-300 border-t-amber-500 animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-center text-stone-400 text-sm pt-16">
            Erreur de chargement · Vérifiez votre connexion
          </p>
        )}

        {!isLoading && !isError && groups.map((group) => (
          <div key={group.sn}>
            {/* En-tête de sourate */}
            {group.verses[0]?.verse_number === 1 && (
              <div className="mb-5 mt-2 text-center">
                <div
                  className="mx-auto mb-2.5 px-5 py-2.5 rounded-2xl inline-flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #c8a84b 0%, #8a6a1f 100%)',
                    boxShadow: '0 2px 12px rgba(180,130,30,0.25)',
                    minWidth: 200,
                  }}
                >
                  <span
                    className="text-white text-xl font-bold"
                    style={{ fontFamily: QURAN_FONT, letterSpacing: '0.02em' }}
                  >
                    سُورَةُ {group.surah?.nameAr ?? ''}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-3">
                  {group.surah?.nameTranslit} · {group.surah?.nameFr} · {group.surah?.versesCount} versets · {revelationLabel(group.surah?.revelationType ?? '')}
                </p>
                {group.sn !== 9 && (
                  <div className="my-4">
                    <p
                      className="text-center text-stone-700"
                      style={{ fontFamily: QURAN_FONT, fontSize: fontSize + 2, lineHeight: 2.2, direction: 'rtl' }}
                    >
                      {BISMILLAH}
                    </p>
                    <div className="mt-3 mx-auto w-20 h-px" style={{ background: 'linear-gradient(to right, transparent, #c8a84b, transparent)' }} />
                  </div>
                )}
              </div>
            )}

            {/* ── Versets — texte continu avec numéros en cercles dorés ── */}
            <div
              className="tajweed-text text-right mb-6"
              dir="rtl"
              style={{
                fontFamily: QURAN_FONT,
                fontSize,
                lineHeight: 3.8,        // espace suffisant pour tous les diacritiques
                color: '#1c1610',
              }}
            >
              {group.verses.map((v) => {
                const isVBk = verseBookmark?.verseKey === v.verse_key
                /* Badge numéro de verset — cercle doré style mushaf */
                const verseBadge = (
                  <span
                    aria-label={`Verset ${v.verse_number}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '1.55em',
                      height: '1.55em',
                      borderRadius: '50%',
                      border: '1.5px solid #b8942a',
                      color: '#7a5c1e',
                      fontSize: '0.52em',
                      margin: '0 5px',
                      verticalAlign: 'middle',
                      backgroundColor: 'rgba(200,168,75,0.12)',
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    {toAr(v.verse_number)}
                  </span>
                )
                return (
                  <span
                    key={v.verse_key}
                    id={`verse-${v.verse_key}`}
                    onClick={() => handleVerseBookmark(v, group.surah)}
                    style={isVBk ? {
                      backgroundColor: 'rgba(16,185,129,0.12)',
                      borderRadius: '6px',
                      padding: '1px 4px',
                      cursor: 'pointer',
                      outline: '1.5px solid rgba(16,185,129,0.35)',
                      outlineOffset: '2px',
                    } : { cursor: 'pointer' }}
                  >
                    {/* Texte tajweed sans le marqueur de fin intégré par l'API */}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: applyTajweedColors(stripVerseEndMarker(v.text_uthmani_tajweed))
                      }}
                    />
                    {/* Notre propre badge numéro verset */}
                    {verseBadge}
                    {' '}
                  </span>
                )
              })}
            </div>
          </div>
        ))}

        <div className="h-4" />
      </div>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-2.5"
        style={{ background: '#f8f5ee', borderTop: '1px solid #e8e1d5' }}
      >
        {/* Prev — desktop only */}
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="invisible md:visible w-9 h-9 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200/70 disabled:opacity-25 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Centre : J · H · P + marque-page verset si actif */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
            <span className="text-emerald-600">J</span>
            <span className="text-stone-800 tabular-nums">{juz}</span>
            <span className="text-stone-300 mx-1">·</span>
            <span className="text-amber-600">H</span>
            <span className="text-stone-800 tabular-nums">{hizb}</span>
            <span className="text-stone-300 mx-1">·</span>
            <span className="text-stone-500">P</span>
            <span className="text-stone-800 tabular-nums">{page}</span>
          </div>
          {/* Indicateur du marque-page verset actif sur cette page */}
          {verseBookmark && verseBookmark.page === page && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
              <BookmarkCheck className="w-3 h-3" />
              {verseBookmark.surahNameTranslit} · V.{verseBookmark.verseNumber}
            </div>
          )}
        </div>

        {/* Next — desktop only */}
        <button
          onClick={() => goTo(page + 1)}
          disabled={page === QURAN_TOTAL_PAGES}
          className="invisible md:visible w-9 h-9 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200/70 disabled:opacity-25 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ══ TOAST ════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key={toastMsg}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-xl whitespace-nowrap"
          >
            <BookmarkCheck className="w-4 h-4 shrink-0" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function QuranClient() {
  const queryClient = useQueryClient()
  const [search, setSearch]               = useState('')
  const [readingPage, setReadingPage]     = useState<number | null>(null)
  const [initialVerseKey, setInitialVerseKey] = useState<string | undefined>(undefined)
  const [readPages, setReadPages]         = useState<Set<number>>(new Set())
  const [verseBookmark, setVerseBookmarkState] = useState<VerseBookmark | null>(null)

  useEffect(() => {
    setReadPages(loadReadPages())
    setVerseBookmarkState(loadVerseBookmark())
  }, [])

  const { data: surahs = [], isLoading } = useQuery<Surah[]>({
    queryKey: ['surahs'],
    queryFn: () => apiFetch<Surah[]>('/api/surahs'),
    staleTime: Infinity,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return surahs
    return surahs.filter(
      (s) =>
        s.nameTranslit.toLowerCase().includes(q) ||
        s.nameFr.toLowerCase().includes(q) ||
        s.nameAr.includes(q) ||
        String(s.number).includes(q),
    )
  }, [surahs, search])

  const markHizb = useMutation({
    mutationFn: () =>
      apiFetch('/api/users/me/hizb', { method: 'POST', body: JSON.stringify({ count: 1 }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-activity'] })
    },
  })

  function handleMarkRead(page: number, _hizb: number) {
    const updated = new Set(readPages)
    updated.add(page)
    setReadPages(updated)
    saveReadPages(updated)
    markHizb.mutate()
  }

  function handleSetVerseBookmark(b: VerseBookmark | null) {
    setVerseBookmarkState(b)
    saveVerseBookmark(b)
  }

  /** Ouvre la lecture sur une page, avec scroll optionnel vers un verset */
  function openReading(page: number, verseKey?: string) {
    setInitialVerseKey(verseKey)
    setReadingPage(page)
  }

  return (
    <>
      {/* Vue lecture full-screen */}
      {readingPage !== null && (
        <div className="fixed inset-0 z-50">
          <ReadingView
            initialPage={readingPage}
            initialVerseKey={initialVerseKey}
            surahs={surahs}
            onClose={() => { setReadingPage(null); setInitialVerseKey(undefined) }}
            onMarkRead={handleMarkRead}
            readPages={readPages}
            verseBookmark={verseBookmark}
            onSetVerseBookmark={handleSetVerseBookmark}
          />
        </div>
      )}

      {/* Liste des sourates */}
      <div className="pb-6">
        {/* En-tête */}
        <div className="text-center pt-2 pb-5">
          <h1
            className="text-3xl font-bold text-stone-900 dark:text-stone-100"
            style={{ fontFamily: QURAN_FONT, lineHeight: 1.8 }}
          >
            القرآن الكريم
          </h1>
          <p className="text-[11px] text-stone-400 mt-0.5 tracking-wide">
            رواية حفص عن عاصم · Hafs ʿan ʿĀṣim
          </p>
        </div>

        {/* ── Carte "Reprendre la lecture" ── */}
        {verseBookmark && (
          <button
            onClick={() => openReading(verseBookmark.page, verseBookmark.verseKey)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-4 text-left transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              border: '1.5px solid #a7f3d0',
            }}
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
              <BookmarkCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-800 leading-tight">
                Reprendre la lecture
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {verseBookmark.surahNameTranslit} · V.{verseBookmark.verseNumber}
              </p>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <p
                className="text-lg text-emerald-700 leading-tight"
                style={{ fontFamily: QURAN_FONT }}
              >
                {verseBookmark.surahNameAr}
              </p>
              {/* Hizb + page du marque-page */}
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                  H {verseBookmark.hizbNumber}
                </span>
                <span className="text-[10px] text-emerald-500 tabular-nums">
                  P.{verseBookmark.page}
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Rechercher une sourate…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Liste */}
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
          {isLoading
            ? [...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 px-4 py-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-28" />
                    <div className="h-2.5 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-20" />
                  </div>
                  <div className="w-12 h-5 bg-stone-100 dark:bg-stone-800 rounded animate-pulse" />
                </div>
              ))
            : filtered.length === 0
              ? <p className="text-center py-10 text-stone-400 text-sm">Aucune sourate trouvée</p>
              : filtered.map((s) => (
                  <SurahRow
                    key={s.id}
                    surah={s}
                    onClick={() => openReading(s.startPage)}
                  />
                ))
          }
        </div>
      </div>
    </>
  )
}
