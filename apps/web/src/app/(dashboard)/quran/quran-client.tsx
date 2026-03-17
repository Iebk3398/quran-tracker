'use client'
/**
 * @file QuranClient — Lecture du Coran
 * @description
 *   - Liste des 114 sourates avec recherche
 *   - Lecture page par page (604 pages du mushaf)
 *   - Texte Uthmani Hafs ʿan ʿĀṣim via quran.com API v4
 *   - Couleurs tajweed — 15 règles colorées
 *   - Marque-pages → met à jour les hizbs lus
 *   - Contrôle de taille de police (A⁻ A⁺)
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Bookmark, BookmarkCheck, Search, X,
  BookOpen, ArrowLeft, ChevronLeft, ChevronRight,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const QURAN_TOTAL_PAGES = 604
const QURAN_API        = 'https://api.quran.com/api/v4'
const STORAGE_KEY_READ = 'ikraa_pages_read'
const FONT_SIZES       = [20, 24, 28, 32, 36, 40] as const
const DEFAULT_FONT_IDX = 2   // 28px

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toAr(n: number) {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)] ?? d)
}

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

// ─── SurahRow ─────────────────────────────────────────────────────────────────

function SurahRow({ surah, onClick }: { surah: Surah; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 active:bg-stone-100 transition-colors text-left"
    >
      {/* Numéro */}
      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
          {surah.number}
        </span>
      </div>

      {/* Infos FR */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-stone-900 dark:text-stone-100 leading-tight">
          {surah.nameTranslit}
        </p>
        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
          {surah.nameFr} · {surah.versesCount} versets
        </p>
      </div>

      {/* Nom arabe */}
      <span
        className="shrink-0 text-xl text-stone-800 dark:text-stone-200"
        style={{ fontFamily: "'Amiri Quran', 'Noto Naskh Arabic', serif", lineHeight: 1.8 }}
      >
        {surah.nameAr}
      </span>
    </button>
  )
}

// ─── ReadingView ──────────────────────────────────────────────────────────────

function ReadingView({
  initialPage,
  surahs,
  onClose,
  onMarkRead,
  readPages,
}: {
  initialPage: number
  surahs: Surah[]
  onClose: () => void
  onMarkRead: (page: number, hizb: number) => void
  readPages: Set<number>
}) {
  const [page, setPage]           = useState(Math.max(1, Math.min(initialPage, QURAN_TOTAL_PAGES)))
  const [fontIdx, setFontIdx]     = useState(DEFAULT_FONT_IDX)
  const [bookmarked, setBookmarked] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const queryClient = useQueryClient()

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

  useEffect(() => { setBookmarked(readPages.has(page)) }, [page, readPages])

  const juz  = verses[0]?.juz_number  ?? 1
  const hizb = verses[0]?.hizb_number ?? 1

  // Sourate courante
  const currentSurahNum  = verses[0] ? parseInt(verses[0].verse_key.split(':')[0] ?? '1') : 1
  const currentSurah     = surahs.find((s) => s.number === currentSurahNum)

  // Grouper versets par sourate (pour en-têtes)
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
    setPage(Math.max(1, Math.min(p, QURAN_TOTAL_PAGES)))
  }, [])

  // Swipe mobile
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0]?.clientX ?? null }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(dx) > 55) dx > 0 ? goTo(page - 1) : goTo(page + 1)
    touchStartX.current = null
  }

  function handleBookmark() {
    if (bookmarked) return
    setBookmarked(true)
    onMarkRead(page, hizb)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: '#f8f5ee' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ══ HEADER ══════════════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-2.5"
        style={{ background: '#f8f5ee', borderBottom: '1px solid #e8e1d5' }}
      >
        {/* Retour */}
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200/60 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Titre */}
        <div className="flex-1 text-center px-2">
          <p
            className="font-semibold text-stone-800 text-base leading-none"
            style={{ fontFamily: "'Amiri Quran', 'Noto Naskh Arabic', serif" }}
          >
            {currentSurah?.nameAr ?? ''}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5 font-medium tracking-wide">
            {currentSurah?.nameTranslit ?? ''}
          </p>
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-1">
          {/* Font size */}
          <button
            onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
            disabled={fontIdx === 0}
            className="flex items-center justify-center text-stone-500 hover:text-stone-800 disabled:opacity-30 transition-colors px-1"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            A
          </button>
          <button
            onClick={() => setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
            disabled={fontIdx === FONT_SIZES.length - 1}
            className="flex items-center justify-center text-stone-700 hover:text-stone-900 disabled:opacity-30 transition-colors px-1"
            style={{ fontSize: 18, fontWeight: 700 }}
          >
            A
          </button>
          {/* Marque-page */}
          <button
            onClick={handleBookmark}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-colors ml-0.5',
              bookmarked ? 'text-emerald-600' : 'text-stone-500 hover:text-stone-800',
            )}
          >
            {bookmarked
              ? <BookmarkCheck className="w-[18px] h-[18px]" />
              : <Bookmark className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* ══ CONTENU ══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-3">

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center items-center h-52">
            <div className="w-7 h-7 rounded-full border-2 border-stone-300 border-t-amber-500 animate-spin" />
          </div>
        )}

        {/* Erreur */}
        {isError && (
          <p className="text-center text-stone-400 text-sm pt-16">
            Erreur de chargement · Vérifiez votre connexion
          </p>
        )}

        {/* Groupes de versets */}
        {!isLoading && !isError && groups.map((group) => (
          <div key={group.sn}>
            {/* En-tête de sourate si v.1 commence sur cette page */}
            {group.verses[0]?.verse_number === 1 && (
              <div className="mb-5 mt-2 text-center">
                {/* Bandeau doré */}
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
                    style={{ fontFamily: "'Amiri Quran', serif", letterSpacing: '0.02em' }}
                  >
                    سُورَةُ {group.surah?.nameAr ?? ''}
                  </span>
                </div>

                {/* Infos sourate */}
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-3">
                  {group.surah?.nameTranslit} · {group.surah?.nameFr} · {group.surah?.versesCount} versets · {revelationLabel(group.surah?.revelationType ?? '')}
                </p>

                {/* Bismillah (sauf At-Tawba=9) */}
                {group.sn !== 9 && (
                  <div className="my-4">
                    <p
                      className="text-center text-stone-700"
                      style={{
                        fontFamily: "'Amiri Quran', serif",
                        fontSize: fontSize + 2,
                        lineHeight: 2.2,
                        direction: 'rtl',
                      }}
                    >
                      {BISMILLAH}
                    </p>
                    <div className="mt-3 mx-auto w-20 h-px" style={{ background: 'linear-gradient(to right, transparent, #c8a84b, transparent)' }} />
                  </div>
                )}
              </div>
            )}

            {/* Versets */}
            {group.verses.map((v) => (
              <div
                key={v.verse_key}
                className="mb-1 pb-3"
                style={{ borderBottom: '1px solid rgba(200,168,75,0.12)' }}
              >
                <div
                  className="tajweed-text text-right quran-reading-text"
                  dir="rtl"
                  style={{
                    fontFamily: "'Amiri Quran', serif",
                    fontSize,
                    lineHeight: 2.2,
                    color: '#2c2415',
                    wordSpacing: '0.12em',
                    letterSpacing: '0.01em',
                  }}
                  /*
                   * Le texte tajweed de quran.com inclut déjà le marqueur de fin de verset.
                   * Aucun numéro supplémentaire n'est ajouté.
                   */
                  dangerouslySetInnerHTML={{ __html: v.text_uthmani_tajweed }}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Espace bas */}
        <div className="h-4" />
      </div>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════════ */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-2.5"
        style={{ background: '#f8f5ee', borderTop: '1px solid #e8e1d5' }}
      >
        {/* Prev */}
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200/70 disabled:opacity-25 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* J · H · P */}
        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
          <span className="text-emerald-600 dark:text-emerald-400">J</span>
          <span className="text-stone-800 tabular-nums">{juz}</span>
          <span className="text-stone-300 mx-1">·</span>
          <span className="text-amber-600">H</span>
          <span className="text-stone-800 tabular-nums">{hizb}</span>
          <span className="text-stone-300 mx-1">·</span>
          <span className="text-stone-500">P</span>
          <span className="text-stone-800 tabular-nums">{page}</span>
        </div>

        {/* Next */}
        <button
          onClick={() => goTo(page + 1)}
          disabled={page === QURAN_TOTAL_PAGES}
          className="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200/70 disabled:opacity-25 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ══ TOAST MARQUE-PAGE ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-xl"
          >
            <BookmarkCheck className="w-4 h-4" />
            Page {page} marquée · +5 XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function QuranClient() {
  const queryClient = useQueryClient()
  const [search, setSearch]           = useState('')
  const [readingPage, setReadingPage] = useState<number | null>(null)
  const [readPages, setReadPages]     = useState<Set<number>>(new Set())

  useEffect(() => { setReadPages(loadReadPages()) }, [])

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

  return (
    <>
      {/* Vue lecture full-screen */}
      <AnimatePresence>
        {readingPage !== null && (
          <motion.div
            key="reading"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
            className="fixed inset-0 z-50"
          >
            <ReadingView
              initialPage={readingPage}
              surahs={surahs}
              onClose={() => setReadingPage(null)}
              onMarkRead={handleMarkRead}
              readPages={readPages}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des sourates */}
      <div className="pb-6">
        {/* En-tête */}
        <div className="text-center pt-2 pb-5">
          <h1
            className="text-3xl font-bold text-stone-900 dark:text-stone-100"
            style={{ fontFamily: "'Amiri Quran', 'Noto Naskh Arabic', serif", lineHeight: 1.8 }}
          >
            القرآن الكريم
          </h1>
          <p className="text-[11px] text-stone-400 mt-0.5 tracking-wide">
            رواية حفص عن عاصم · Hafs ʿan ʿĀṣim
          </p>
        </div>

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
                  <SurahRow key={s.id} surah={s} onClick={() => setReadingPage(s.startPage)} />
                ))
          }
        </div>
      </div>
    </>
  )
}
