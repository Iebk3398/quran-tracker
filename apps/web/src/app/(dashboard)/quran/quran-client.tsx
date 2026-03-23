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
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import {
  Bookmark, BookmarkCheck, Search, X,
  ArrowLeft, ChevronLeft, ChevronRight,
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
  /** Texte Unicode Uthmani pur — non utilisé pour le rendu principal */
  text_uthmani: string
  /**
   * HTML tajweed niveau-verset fourni par l'API quran.com.
   * Balises <tajweed class=TYPE>…</tajweed> autour des caractères portant
   * une règle. On injecte ce HTML après remplacement des balises par des
   * <span style="color:…"> — display:contents préserve le shaping arabe.
   */
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
const DEFAULT_FONT_IDX     = 2   // 28px — Moushaf Madani 1421 (KFGQPC Hafs)

const QURAN_FONT = "'KFGQPC HAFS Uthmanic Script', 'UthmanicHafs', 'Scheherazade New', 'Noto Naskh Arabic', serif"

/** Variants de transition de page — custom = 'forward' | 'back' */
const PAGE_VARIANTS: Variants = {
  enter: (dir: string) => ({
    x: dir === 'forward' ? '-100%' : '100%',
    opacity: 0.7,
  }),
  visible: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: string) => ({
    x: dir === 'forward' ? '100%' : '-100%',
    opacity: 0.7,
  }),
}

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
  // text_uthmani_tajweed au niveau VERSET = même source que quran.com.
  // Les balises <tajweed class=TYPE> annotent les caractères précis portant
  // une règle tajweed — pas le mot entier. Cela donne le même rendu sélectif
  // que l'app de référence (seuls الرَّحْمَنِ, مَالِكِ, الصِّرَاطَ… colorés).
  const url = `${QURAN_API}/verses/by_page/${page}?language=fr`
    + `&fields=text_uthmani,text_uthmani_tajweed,juz_number,hizb_number,page_number`
    + `&per_page=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { verses: QuranVerse[] }
  return data.verses
}

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'

// ─── Tajweed ──────────────────────────────────────────────────────────────────

/**
 * Couleurs tajweed — injection sur les spans issus du HTML verset-level.
 * Seules les règles "colorées" sont listées. Les autres (<tajweed class=ham_wasl>,
 * <tajweed class=laam_shamsiyah>, etc.) reçoivent explicitement #1c1610 (noir)
 * dans applyTajweedColors — aucune couleur n'est jamais héritée via CSS.
 */
const TAJWEED_COLORS: Record<string, string> = {
  // 🟠 Madd (orange) — prolongations naturelles, permissibles, obligatoires
  madda_normal:          '#c47f17',
  madda_permissible:     '#c47f17',
  madda_obligatory:      '#c47f17',
  // 🔵 Bleu foncé — Madd nécessaire (6 harakat stricts)
  madda_necessary:       '#1d4ed8',
  // 🟢 Vert — Ghunna
  ghunna:                '#16a34a',
  // 🔴 Rouge — Idgham
  idgham_ghunna:         '#dc2626',
  idgham_wo_ghunna:      '#dc2626',
  idgham_mutajanisayn:   '#dc2626',
  idgham_mutaqaribayn:   '#dc2626',
  // 🩵 Teal — Ikhfa
  ikhafa:                '#0d9488',
  ikhafa_shafawi:        '#0d9488',
  // 🟣 Violet — Iqlab
  iqlab:                 '#9333ea',
  // 🔵 Bleu vif — Qalaqah
  qalaqah:               '#3b82f6',
}

/**
 * Supprime le marqueur de fin de verset du HTML tajweed.
 * L'API ajoute un <span class=end>١</span> (ou similaire) en fin de verset.
 */
function stripVerseEndMarker(html: string): string {
  return html
    .replace(/<span[^>]*class=end[^>]*>[^<]*<\/span>\s*$/, '')
    .replace(/<span[^>]*>[٠-٩۰-۹]+<\/span>\s*$/, '')
    .trim()
}

/**
 * Convertit le HTML tajweed verset-level en HTML avec couleurs inline.
 *
 * Stratégie :
 *  • <tajweed class=TYPE> → <span style="color:COLOR"> où COLOR est soit la
 *    couleur tajweed de la règle, soit #1c1610 (noir forcé) pour les règles
 *    non-colorées (ham_wasl, laam_shamsiyah, slnt…).
 *  • Couleur toujours EXPLICITE → zéro héritage CSS parasite.
 *  • Le CSS global .tajweed-text span { display:contents } préserve le shaping
 *    arabe (ligatures intra-mot et inter-mots intactes).
 */
function applyTajweedColors(html: string): string {
  return html
    .replace(/<tajweed class=([a-z_]+)>/g, (_m, cls: string) => {
      const color = TAJWEED_COLORS[cls] ?? '#1c1610'
      return `<span style="color:${color}">`
    })
    .replace(/<\/tajweed>/g, '</span>')
}

/**
 * Convertit un nombre en chiffres arabes orientaux (٠١٢٣٤٥٦٧٨٩)
 */
function toAr(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)] ?? d)
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
  onSyncHizbPosition,
  readPages,
  verseBookmark,
  onSetVerseBookmark,
}: {
  initialPage: number
  initialVerseKey?: string   // si fourni, scroll automatique vers ce verset
  surahs: Surah[]
  onClose: () => void
  onMarkRead: (page: number, hizb: number) => void
  /** Synchronise la position hizb dans le dashboard (valeur absolue, jamais en arrière) */
  onSyncHizbPosition: (page: number, hizbNumber: number) => void
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

  // Swipe mobile — livre arabe : glisser DROITE (g→d) = page suivante
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0]?.clientX ?? null }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    // Livre arabe RTL : glisser DROITE (g→d) avance d'une page (numéro supérieur)
    if (Math.abs(dx) > 55) { if (dx > 0) goTo(page + 1); else goTo(page - 1) }
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
   * Si ≥ 1 hizb de lecture est détecté, affiche un prompt discret
   * pour synchroniser le compteur du dashboard.
   */
  function handleVerseBookmark(v: QuranVerse, surah?: Surah) {
    const isCurrentBookmark = verseBookmark?.verseKey === v.verse_key
    if (isCurrentBookmark) {
      onSetVerseBookmark(null)
      showToast('Marque-page supprimé')
    } else {
      const bk: VerseBookmark = {
        verseKey: v.verse_key,
        page: v.page_number ?? page,
        hizbNumber: v.hizb_number,
        juzNumber: v.juz_number,
        surahNameTranslit: surah?.nameTranslit ?? '',
        surahNameAr: surah?.nameAr ?? '',
        verseNumber: v.verse_number,
      }
      onSetVerseBookmark(bk)
      // Sync automatique — met à jour hizb + page dans le classement groupe
      onSyncHizbPosition(v.page_number ?? page, v.hizb_number)
      showToast(`📌 H${v.hizb_number} · P.${v.page_number ?? page} · ${surah?.nameTranslit ?? ''} ${v.verse_key}`)
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
        className="shrink-0 flex items-center justify-between px-3 py-2"
        style={{ background: '#f8f5ee', borderBottom: '1px solid #ede8df' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200/60 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-[15px] font-bold text-stone-800" style={{ fontFamily: QURAN_FONT }}>
            {currentSurah?.nameAr ?? ''}
          </p>
          <p className="text-[10px] text-stone-400 font-medium tracking-wide">{currentSurah?.nameTranslit ?? ''}</p>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={() => setFontIdx((i) => Math.max(0, i - 1))} disabled={fontIdx === 0}
            className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 disabled:opacity-25 transition-colors text-[13px] font-semibold">A</button>
          <button onClick={() => setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))} disabled={fontIdx === FONT_SIZES.length - 1}
            className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-900 disabled:opacity-25 transition-colors text-[18px] font-bold">A</button>
        </div>
      </div>

      {/* ══ CONTENU ══════════════════════════════════════════════════════════════ */}
      {/* Wrapper relatif + overflow-hidden → permet à deux pages d'être visibles simultanément */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="sync" initial={false} custom={pageDir}>
        <motion.div
          key={animKey}
          custom={pageDir}
          variants={PAGE_VARIANTS}
          initial="enter"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute inset-0 overflow-y-auto scrollbar-none px-5 py-3"
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
                {/* Titre sobre : séparateur fin + nom en texte opaque */}
                <div className="flex items-center gap-3 mx-4 mb-3">
                  <div className="flex-1 h-px" style={{ background: 'rgba(180,130,30,0.2)' }} />
                  <span
                    className="text-xl"
                    style={{ fontFamily: QURAN_FONT, color: 'rgba(60,40,10,0.75)', letterSpacing: '0.01em' }}
                  >
                    {group.surah?.nameAr ?? ''}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(180,130,30,0.2)' }} />
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-3">
                  {group.surah?.nameTranslit} · {group.surah?.nameFr} · {group.surah?.versesCount} versets · {revelationLabel(group.surah?.revelationType ?? '')}
                </p>
                {/* Bismillah header uniquement pour les sourates 2–114 (sauf At-Tawbah 9).
                    La sourate 1 (Al-Fatiha) est exclue car son verset 1 EST la bismillah —
                    l'afficher ici créerait un double. */}
                {group.sn !== 9 && group.sn !== 1 && (
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

            {/* ── Versets — texte continu mot-par-mot avec couleurs tajweed ── */}
            <div
              className="text-center mb-6"
              dir="rtl"
              style={{
                fontFamily: QURAN_FONT,
                fontSize,
                lineHeight: 2.8,
                color: '#1c1610',
                textAlign: 'center',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
              }}
            >
              {group.verses.map((v) => {
                const isVBk = verseBookmark?.verseKey === v.verse_key
                /* Badge numéro de verset — cercle doré style mushaf */
                const verseBadge = (
                  <span
                    key="badge"
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
                    {/* HTML tajweed verset-level : seuls les caractères portant une règle sont colorés */}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: applyTajweedColors(stripVerseEndMarker(v.text_uthmani_tajweed))
                      }}
                    />
                    {verseBadge}{' '}
                  </span>
                )
              })}
            </div>
          </div>
        ))}

        <div className="h-4" />
        </motion.div>
        </AnimatePresence>
      </div>

      {/* ══ FOOTER compact ══════════════════════════════════════════════════════ */}
      <div className="shrink-0 px-3 pb-3 pt-1.5" style={{ background: '#f8f5ee' }}>
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-2xl"
        style={{ background: '#eee8dc', border: '1px solid #e0d8ca' }}
      >
        {/* Gauche : font size */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page === 1}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-200/70 disabled:opacity-20 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => goTo(page + 1)}
            disabled={page === QURAN_TOTAL_PAGES}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-200/70 disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Centre : marque-page verset (pill) ou position */}
        {verseBookmark && verseBookmark.page === page ? (
          <button
            onClick={() => onSetVerseBookmark(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[12px] font-semibold transition-colors"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            {verseBookmark.verseKey}
          </button>
        ) : (
          <button
            onClick={handlePageBookmark}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors',
              pageBookmarked
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            P.{page}
          </button>
        )}

        {/* Droite : J · H · P */}
        <div className="text-[11px] font-semibold text-stone-400 tabular-nums text-right">
          <span className="text-emerald-600">J{juz}</span>
          <span className="text-stone-300 mx-1">·</span>
          <span className="text-amber-500">H{hizb}</span>
          <span className="text-stone-300 mx-1">·</span>
          <span>P{page}</span>
        </div>
      </div>
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

const STORAGE_KEY_ONBOARDED = 'ikraa_quran_onboarded'

export function QuranClient() {
  const queryClient   = useQueryClient()
  const currentUserId = useAppStore(s => s.user?.id)
  const groupId       = useAppStore(s => s.activeGroupId)
  const [search, setSearch]               = useState('')
  const [readingPage, setReadingPage]     = useState<number | null>(null)
  const [initialVerseKey, setInitialVerseKey] = useState<string | undefined>(undefined)
  const [readPages, setReadPages]         = useState<Set<number>>(new Set())
  const [verseBookmark, setVerseBookmarkState] = useState<VerseBookmark | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    setReadPages(loadReadPages())
    setVerseBookmarkState(loadVerseBookmark())
    // Message d'accueil — affiché une seule fois
    if (!localStorage.getItem(STORAGE_KEY_ONBOARDED)) {
      setShowOnboarding(true)
    }
  }, [])

  function dismissOnboarding() {
    localStorage.setItem(STORAGE_KEY_ONBOARDED, '1')
    setShowOnboarding(false)
  }

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
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })

  /** Synchronise la position de lecture absolue dans le dashboard (PUT — jamais en arrière) */
  const syncHizbPosition = useMutation({
    mutationFn: (vars: { position: number; page?: number }) =>
      apiFetch('/api/users/me/hizb', { method: 'PUT', body: JSON.stringify(vars) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group'] })
    },
  })

  function handleMarkRead(page: number, _hizb: number) {
    const updated = new Set(readPages)
    updated.add(page)
    setReadPages(updated)
    saveReadPages(updated)
    markHizb.mutate()
  }

  /** Marque la page comme lue localement + synchronise la position hizb ET la page dans le dashboard */
  function handleSyncHizbPosition(page: number, hizbNumber: number) {
    const updated = new Set(readPages)
    updated.add(page)
    setReadPages(updated)
    saveReadPages(updated)
    syncHizbPosition.mutate({ position: hizbNumber, page })
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
            onSyncHizbPosition={handleSyncHizbPosition}
            readPages={readPages}
            verseBookmark={verseBookmark}
            onSetVerseBookmark={handleSetVerseBookmark}
          />
        </div>
      )}

      {/* ── Message d'accueil (first-time) ───────────────────────────────────── */}
      {showOnboarding && (
        <div
          className="mx-4 mb-4 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fdf6e3 0%, #fef9ec 100%)', border: '1px solid #e8d9a0' }}
        >
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-stone-800 mb-2">
                  Bienvenue dans la lecture du Coran 📖
                </p>
                <ul className="space-y-1.5 text-[12.5px] text-stone-600">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-px">📌</span>
                    <span><strong>Marque-page :</strong> appuie sur un verset pour le marquer — ta progression se synchronise dans le dashboard.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stone-400 mt-px">👆</span>
                    <span><strong>Navigation :</strong> glisse horizontalement pour changer de page, ou utilise les flèches (tablette/bureau).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-px">🎨</span>
                    <span><strong>Couleurs tajweed :</strong> rouge = qalaqah · bleu = madd · vert = ghunnah/idgham · orange = ikhafa · violet = iqlab.</span>
                  </li>
                </ul>
              </div>
            </div>
            <button
              onClick={dismissOnboarding}
              className="mt-3 w-full py-2 rounded-xl text-[13px] font-semibold text-amber-800 transition-colors hover:bg-amber-100/60"
              style={{ background: 'rgba(200,168,75,0.13)', border: '1px solid rgba(200,168,75,0.35)' }}
            >
              Compris, commencer la lecture
            </button>
          </div>
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

        {/* ── Carte position de lecture + vue hizb ── */}
        {verseBookmark && (
          <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1.5px solid #a7f3d0', background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf8 100%)' }}>
            {/* Ligne du haut — reprendre la lecture */}
            <button
              onClick={() => openReading(verseBookmark.page, verseBookmark.verseKey)}
              className="w-full flex items-center gap-3 px-4 pt-4 pb-3 text-left transition-all active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                <BookmarkCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800 leading-tight">Reprendre la lecture</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {verseBookmark.surahNameTranslit} · V.{verseBookmark.verseNumber}
                </p>
              </div>
              <p className="text-xl text-emerald-700 shrink-0" style={{ fontFamily: QURAN_FONT }}>
                {verseBookmark.surahNameAr}
              </p>
            </button>

            {/* Séparateur */}
            <div className="mx-4 h-px" style={{ background: 'rgba(16,185,129,0.15)' }} />

            {/* Vue hizb détaillée */}
            <div className="px-4 pb-4 pt-3 space-y-2.5">
              {/* Badges info */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  Hizb {verseBookmark.hizbNumber}/60
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  Juz {verseBookmark.juzNumber}
                </span>
                <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                  Page {verseBookmark.page}
                </span>
              </div>

              {/* Barre de progression hizb 1-60 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-emerald-700 font-semibold">Position dans le Coran</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {Math.round((verseBookmark.hizbNumber / 60) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(verseBookmark.hizbNumber / 60) * 100}%`,
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">Al-Fatiha</span>
                  <span className="text-[9px] text-muted-foreground">An-Nass</span>
                </div>
              </div>
            </div>
          </div>
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
