'use client'
/**
 * @file QuranClient — Lecture du Coran
 * @description
 *   - Liste des 114 sourates avec recherche
 *   - Lecture page par page (604 pages du mushaf)
 *   - Texte Uthmani Hafs 'an 'Âsim (ar.alafasy) via quran.com API v4
 *   - Couleurs tajweed intégrées
 *   - Marque-pages → met à jour les hizbs lus
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, Bookmark, BookmarkCheck,
  Search, X, BookOpen, Grid3X3, CheckCircle2, ArrowLeft,
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
  verse_key: string          // "1:7", "2:1" etc.
  text_uthmani_tajweed: string
  juz_number: number
  hizb_number: number
  page_number: number
}

interface QuranPageResponse {
  verses: QuranVerse[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QURAN_TOTAL_PAGES = 604
const QURAN_API = 'https://api.quran.com/api/v4'
const STORAGE_KEY_READ = 'ikraa_pages_read'  // Set<pageNumber>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)] ?? d)
}

function loadReadPages(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READ)
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set()
  } catch { return new Set() }
}

function saveReadPages(set: Set<number>) {
  localStorage.setItem(STORAGE_KEY_READ, JSON.stringify([...set]))
}

/** Noms des types de révélation */
function revelationLabel(t: string) {
  return t === 'meccan' ? 'Mecquoise' : 'Médinoise'
}

/** Fetch les versets d'une page depuis quran.com */
async function fetchPage(page: number): Promise<QuranVerse[]> {
  const url = `${QURAN_API}/verses/by_page/${page}?language=fr&fields=text_uthmani_tajweed,juz_number,hizb_number,page_number&per_page=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as QuranPageResponse
  return data.verses
}

// ─── Composant : ligne de sourate ────────────────────────────────────────────

function SurahRow({
  surah,
  onClick,
}: {
  surah: Surah
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/60 active:bg-stone-100 dark:active:bg-stone-800 transition-colors text-left"
    >
      {/* Numéro */}
      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
          {surah.number}
        </span>
      </div>

      {/* Nom FR + translittération */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-stone-900 dark:text-stone-100 leading-tight">
          {surah.nameTranslit}
        </p>
        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
          {surah.nameFr} · {surah.versesCount} versets · {revelationLabel(surah.revelationType)}
        </p>
      </div>

      {/* Nom arabe */}
      <div className="flex flex-col items-end shrink-0">
        <span className="quran-font text-xl text-stone-800 dark:text-stone-200 leading-relaxed">
          {surah.nameAr}
        </span>
      </div>
    </button>
  )
}

// ─── Composant : vue de lecture (page mushaf) ─────────────────────────────────

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'

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
  onMarkRead: (page: number, hizbNumber: number) => void
  readPages: Set<number>
}) {
  const [page, setPage] = useState(Math.max(1, Math.min(initialPage, QURAN_TOTAL_PAGES)))
  const [bookmarked, setBookmarked] = useState(false)
  const [showBookmarkToast, setShowBookmarkToast] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const queryClient = useQueryClient()

  // Fetch les versets de la page courante
  const { data: verses = [], isLoading, isError } = useQuery<QuranVerse[]>({
    queryKey: ['quran-page', page],
    queryFn: () => fetchPage(page),
    staleTime: Infinity,
  })

  // Précharger la page suivante
  useEffect(() => {
    if (page < QURAN_TOTAL_PAGES) {
      queryClient.prefetchQuery({
        queryKey: ['quran-page', page + 1],
        queryFn: () => fetchPage(page + 1),
        staleTime: Infinity,
      })
    }
  }, [page, queryClient])

  // Vérifier si la page est bookmarkée
  useEffect(() => {
    setBookmarked(readPages.has(page))
  }, [page, readPages])

  const hizbOfPage = verses[0]?.hizb_number ?? 1
  const juzOfPage  = verses[0]?.juz_number ?? 1

  // Trouver la sourate courante
  const currentSurahNumber = verses[0]
    ? parseInt(verses[0].verse_key.split(':')[0] ?? '1')
    : 1
  const currentSurah = surahs.find((s) => s.number === currentSurahNumber)

  // Grouper les versets par sourate pour afficher les en-têtes
  const versesBySurah = useMemo(() => {
    const groups: { surahNumber: number; surahData?: Surah; verses: QuranVerse[] }[] = []
    for (const v of verses) {
      const sn = parseInt(v.verse_key.split(':')[0] ?? '1')
      const last = groups[groups.length - 1]
      if (!last || last.surahNumber !== sn) {
        groups.push({
          surahNumber: sn,
          surahData: surahs.find((s) => s.number === sn),
          verses: [v],
        })
      } else {
        last.verses.push(v)
      }
    }
    return groups
  }, [verses, surahs])

  // Navigation
  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, QURAN_TOTAL_PAGES)))
    window.scrollTo(0, 0)
  }, [])

  // Swipe sur mobile
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(dx) > 60) dx > 0 ? goTo(page - 1) : goTo(page + 1)
    touchStartX.current = null
  }

  // Marquer la page comme lue
  function handleBookmark() {
    if (bookmarked) return
    setBookmarked(true)
    onMarkRead(page, hizbOfPage)
    setShowBookmarkToast(true)
    setTimeout(() => setShowBookmarkToast(false), 2200)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#fdf8f0' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: '#fdf8f0', borderColor: '#e8e0d0' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="quran-font text-base font-bold text-stone-800 leading-tight">
            {currentSurah?.nameAr ?? ''}
          </p>
          <p className="text-[10px] text-stone-400">
            {currentSurah?.nameTranslit ?? ''} · Hafs ʿan ʿĀṣim
          </p>
        </div>

        <button
          onClick={handleBookmark}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
            bookmarked
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-stone-500 hover:bg-stone-200',
          )}
          title={bookmarked ? 'Page lue' : 'Marquer comme lu'}
        >
          {bookmarked
            ? <BookmarkCheck className="w-5 h-5" />
            : <Bookmark className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Contenu de la page ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 scrollbar-none">
        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-amber-500 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="text-center py-12 text-stone-400 text-sm">
            Erreur de chargement · Vérifiez votre connexion
          </div>
        )}

        {!isLoading && !isError && versesBySurah.map((group, gi) => (
          <div key={group.surahNumber} className="mb-2">
            {/* En-tête de sourate si le premier verset de la sourate est sur cette page */}
            {group.verses[0]?.verse_number === 1 && (
              <div className="my-4 text-center">
                {/* Décoration */}
                <div
                  className="mx-auto mb-2 flex items-center justify-center px-6 py-2.5 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', maxWidth: 280 }}
                >
                  <span className="quran-font text-white text-xl font-bold tracking-wide">
                    سُورَةُ {group.surahData?.nameAr ?? ''}
                  </span>
                </div>
                {group.surahData && (
                  <p className="text-[11px] text-stone-400 mb-2">
                    {group.surahData.nameTranslit} · {group.surahData.versesCount} versets · {revelationLabel(group.surahData.revelationType)}
                  </p>
                )}
                {/* Bismillah (toutes sauf At-Tawba=9 et Al-Fatiha car elle l'inclut comme v.1) */}
                {group.surahNumber !== 9 && group.surahNumber !== 1 && (
                  <p
                    className="quran-font text-center text-2xl text-stone-700 leading-loose my-3 px-2"
                    style={{ fontFamily: "'Amiri Quran', serif", lineHeight: 2.2 }}
                  >
                    {BISMILLAH}
                  </p>
                )}
              </div>
            )}

            {/* Texte coulant des versets — style mushaf */}
            <div
              className="quran-font tajweed-text text-right leading-loose text-stone-900"
              dir="rtl"
              style={{
                fontFamily: "'Amiri Quran', serif",
                fontSize: '1.55rem',
                lineHeight: 2.4,
                textAlign: 'justify',
                textAlignLast: 'right',
                wordSpacing: '0.1em',
              }}
            >
              {group.verses.map((v) => (
                <span key={v.verse_key} className="inline">
                  <span
                    dangerouslySetInnerHTML={{ __html: v.text_uthmani_tajweed }}
                  />
                  {' '}
                  <span className="verse-number" style={{ fontFamily: "'Amiri Quran', serif" }}>
                    {toArabicNumeral(v.verse_number)}
                  </span>
                  {' '}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer : page + Juz/Hizb + navigation ── */}
      <div
        className="border-t px-4 py-3 flex items-center justify-between"
        style={{ background: '#fdf8f0', borderColor: '#e8e0d0' }}
      >
        {/* Prev */}
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Infos */}
        <div className="text-center">
          <p className="text-sm font-bold text-stone-700">
            صفحة {toArabicNumeral(page)}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">
            ج{toArabicNumeral(juzOfPage)} · ح{toArabicNumeral(hizbOfPage)} · ص{toArabicNumeral(page)}
          </p>
        </div>

        {/* Next */}
        <button
          onClick={() => goTo(page + 1)}
          disabled={page === QURAN_TOTAL_PAGES}
          className="w-10 h-10 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Toast marque-page ── */}
      <AnimatePresence>
        {showBookmarkToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 z-10"
          >
            <BookmarkCheck className="w-4 h-4" />
            Page {page} marquée · +5 XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Composant : grille 60 hizbs ─────────────────────────────────────────────

function HizbGrid({
  surahs,
  readPages,
  onOpenSurah,
}: {
  surahs: Surah[]
  readPages: Set<number>
  onOpenSurah: (page: number) => void
}) {
  function toAr(n: number) { return toArabicNumeral(n) }

  // Pour chaque hizb, trouver la sourate principale
  const hizbCards = useMemo(() => {
    const cards = []
    for (let h = 1; h <= 60; h++) {
      const surahsInHizb = surahs.filter((s) => s.hizbNumber === h)
      const primarySurah = surahs.reduce((acc, s) => {
        return s.hizbNumber <= h ? s : acc
      }, surahs[0]!)
      // Calcul approximatif de la page du hizb
      const firstPage = surahsInHizb[0]?.startPage ?? primarySurah.startPage
      cards.push({ hizbNumber: h, juzNumber: Math.ceil(h / 2), primarySurah, surahsInHizb, startPage: firstPage })
    }
    return cards
  }, [surahs])

  const totalRead = Array.from({ length: 60 }, (_, i) => i + 1)
    .filter((h) => {
      const card = hizbCards.find((c) => c.hizbNumber === h)
      return card ? readPages.has(card.startPage) : false
    }).length

  return (
    <div>
      <p className="text-center text-xs text-stone-400 mb-4">
        {totalRead} / 60 hizbs lus
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {hizbCards.map((c) => {
          const isRead = readPages.has(c.startPage)
          return (
            <motion.button
              key={c.hizbNumber}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenSurah(c.startPage)}
              className={cn(
                'flex flex-col items-end text-right p-3.5 rounded-2xl border transition-all cursor-pointer',
                isRead
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800',
                'shadow-sm',
              )}
            >
              {isRead && (
                <div className="absolute top-2.5 left-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              )}
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 mb-1.5">
                ج {toAr(c.juzNumber)}
              </span>
              <span className="quran-font text-xl font-bold text-stone-800 dark:text-stone-100 leading-relaxed">
                {c.primarySurah.nameAr}
              </span>
              <span className="text-[9px] text-stone-400 mt-0.5">
                حزب {toAr(c.hizbNumber)}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

type QuranTab = 'surahs' | 'hizbs'

/**
 * Section Lecture du Coran.
 * - Onglet Sourates : liste 114 sourates + recherche
 * - Onglet Hizbs : grille 60 hizbs
 * - Vue lecture : page par page avec tajweed + marque-page
 */
export function QuranClient() {
  const queryClient  = useQueryClient()
  const [tab, setTab]             = useState<QuranTab>('surahs')
  const [search, setSearch]       = useState('')
  const [readingPage, setReadingPage] = useState<number | null>(null)
  const [readPages, setReadPages] = useState<Set<number>>(new Set())

  // Charger l'état de lecture depuis localStorage
  useEffect(() => { setReadPages(loadReadPages()) }, [])

  // Fetch les sourates (données locales statiques)
  const { data: surahs = [], isLoading: surahsLoading } = useQuery<Surah[]>({
    queryKey: ['surahs'],
    queryFn: () => apiFetch<Surah[]>('/api/surahs'),
    staleTime: Infinity,
  })

  // Filtrer les sourates par recherche
  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return surahs
    const q = search.toLowerCase()
    return surahs.filter(
      (s) =>
        s.nameTranslit.toLowerCase().includes(q) ||
        s.nameFr.toLowerCase().includes(q) ||
        s.nameAr.includes(q) ||
        String(s.number).includes(q),
    )
  }, [surahs, search])

  // Mutation : marquer un hizb comme lu
  const markHizb = useMutation({
    mutationFn: () =>
      apiFetch('/api/users/me/hizb', {
        method: 'POST',
        body: JSON.stringify({ count: 1 }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-activity'] })
    },
  })

  function handleMarkRead(page: number, _hizbNumber: number) {
    const updated = new Set(readPages)
    updated.add(page)
    setReadPages(updated)
    saveReadPages(updated)
    markHizb.mutate()
  }

  function openSurah(surah: Surah) {
    setReadingPage(surah.startPage)
  }

  return (
    <>
      {/* ── Vue lecture (full screen) ── */}
      <AnimatePresence>
        {readingPage !== null && (
          <motion.div
            key="reading"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
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

      {/* ── Vue principale ── */}
      <div className="pb-6">
        {/* Header */}
        <div className="text-center pt-2 pb-5">
          <h1 className="quran-font text-3xl font-bold text-stone-900 dark:text-stone-100 leading-relaxed">
            القرآن الكريم
          </h1>
          <p className="text-[11px] text-stone-400 mt-0.5">
            رواية حفص عن عاصم · Hafs ʿan ʿĀṣim
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 bg-stone-100 dark:bg-stone-800 rounded-2xl p-1">
          <button
            onClick={() => setTab('surahs')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === 'surahs'
                ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 shadow-sm'
                : 'text-stone-400 dark:text-stone-500',
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Sourates
          </button>
          <button
            onClick={() => setTab('hizbs')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === 'hizbs'
                ? 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 shadow-sm'
                : 'text-stone-400 dark:text-stone-500',
            )}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            60 Hizbs
          </button>
        </div>

        {/* ── Tab Sourates ── */}
        {tab === 'surahs' && (
          <div>
            {/* Barre de recherche */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Rechercher une sourate…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:border-amber-400 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Liste */}
            <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
              {surahsLoading
                ? [...Array(8)].map((_, i) => (
                    <div key={i} className="h-16 px-4 py-3 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-32" />
                        <div className="h-2.5 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-20" />
                      </div>
                    </div>
                  ))
                : filteredSurahs.length === 0
                  ? (
                    <p className="text-center py-10 text-stone-400 text-sm">
                      Aucune sourate trouvée
                    </p>
                  )
                  : filteredSurahs.map((surah) => (
                    <SurahRow
                      key={surah.id}
                      surah={surah}
                      onClick={() => openSurah(surah)}
                    />
                  ))
              }
            </div>
          </div>
        )}

        {/* ── Tab Hizbs ── */}
        {tab === 'hizbs' && !surahsLoading && (
          <HizbGrid
            surahs={surahs}
            readPages={readPages}
            onOpenSurah={(page) => setReadingPage(page)}
          />
        )}
      </div>
    </>
  )
}
