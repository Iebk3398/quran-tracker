'use client'
/**
 * @file Topbar du dashboard
 * @description
 *   - Desktop : spacer + actions (theme, langue, notifs, avatar)
 *   - Mobile  : groupe actif (tappable → bottom sheet) + actions
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  Users,
  Check,
  Plus,
  Settings,
  X,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupOption {
  id: string
  name: string
  description: string | null
  sheikhId: string
  inviteCode: string
  createdAt: string
  role: 'sheikh' | 'student' | 'parent'
}

// ─── GroupBottomSheet ─────────────────────────────────────────────────────────

/**
 * Bottom sheet mobile pour changer de groupe actif.
 * Slides up avec un spring Framer Motion, backdrop semi-transparent.
 */
function GroupBottomSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const { activeGroupId, setActiveGroup, user } = useAppStore()

  const { data: myGroups = [] } = useQuery<GroupOption[]>({
    queryKey: ['my-groups'],
    queryFn: () => apiFetch('/api/groups/me'),
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  function switchGroup(g: GroupOption) {
    setActiveGroup(g as Parameters<typeof setActiveGroup>[0])
    onClose()
    router.push('/dashboard')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white dark:bg-stone-900 shadow-2xl pb-safe"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              <h2 className="font-semibold text-stone-800 dark:text-stone-200 text-base">
                Mes groupes
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Groups list */}
            <div className="px-3 space-y-1 max-h-64 overflow-y-auto">
              {myGroups.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-6">
                  Aucun groupe
                </p>
              ) : (
                myGroups.map((g) => {
                  const isActive = g.id === activeGroupId
                  return (
                    <button
                      key={g.id}
                      onClick={() => switchGroup(g)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left',
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40'
                          : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                      )}
                    >
                      {/* Role icon */}
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base',
                        isActive
                          ? 'bg-emerald-500'
                          : 'bg-stone-100 dark:bg-stone-800'
                      )}>
                        {isActive
                          ? <Check className="w-4 h-4 text-white" />
                          : <Users className={cn('w-4 h-4', isActive ? 'text-white' : 'text-stone-500')} />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-semibold text-sm truncate',
                          isActive
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-stone-800 dark:text-stone-200'
                        )}>
                          {g.name}
                        </p>
                        <p className="text-xs text-stone-400 truncate">
                          {g.role === 'sheikh' ? '👑 Sheikh' : g.role === 'parent' ? '👨‍👩‍👧 Parent' : '📖 Élève'}
                        </p>
                      </div>

                      {isActive && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                          Actif
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            {/* Actions */}
            <div className="px-3 pt-2 pb-4 mt-1 border-t border-stone-100 dark:border-stone-800 space-y-1">
              <button
                onClick={() => { router.push('/groups'); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-stone-500" />
                </div>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Gérer les groupes
                </span>
              </button>
              <button
                onClick={() => { router.push('/groups?tab=join'); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Rejoindre un groupe
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

/**
 * Barre de navigation supérieure du dashboard.
 * - Mobile  : bouton groupe actif → bottom sheet de sélection
 * - Desktop : spacer (la sidebar gère le groupe)
 */
export function DashboardTopbar() {
  const t = useTranslations()
  const {
    user,
    locale,
    setLocale,
    theme,
    setTheme,
    unreadNotifications,
    activeGroup,
  } = useAppStore()

  const [langOpen, setLangOpen] = useState(false)
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)

  const locales = [
    { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
    { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' },
    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  ]

  return (
    <>
      <header className="flex h-14 sm:h-16 flex-shrink-0 items-center justify-between border-b border-stone-200 bg-white px-3 sm:px-4 dark:border-stone-800 dark:bg-stone-900">

        {/* ── Mobile left: active group button ── */}
        <button
          onClick={() => setGroupSheetOpen(true)}
          className="flex items-center gap-2 md:hidden min-w-0 max-w-[50vw] rounded-xl px-2 py-1.5 -ml-1 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors active:scale-95"
          aria-label="Changer de groupe"
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500">
            <Users className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
              {activeGroup?.name ?? 'Mes groupes'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-stone-400" />
          </div>
        </button>

        {/* ── Desktop spacer ── */}
        <div className="hidden md:block" />

        {/* ── Right actions ── */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300 transition-colors"
            aria-label="Changer le thème"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300 transition-colors"
              aria-label="Langue"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:block">
                {locales.find((l) => l.code === locale)?.flag ?? '🌐'}
              </span>
            </button>

            {langOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLangOpen(false)}
                />
                <div className="absolute end-0 top-full z-50 mt-1 w-40 rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-800">
                  {locales.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLocale(l.code)
                        setLangOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-700',
                        locale === l.code
                          ? 'font-medium text-emerald-600 dark:text-emerald-400'
                          : 'text-stone-700 dark:text-stone-300'
                      )}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button
            className="relative rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300 transition-colors"
            aria-label={t('notifications.title')}
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* Avatar */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 select-none">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        </div>
      </header>

      {/* Group bottom sheet — mobile only */}
      <GroupBottomSheet
        open={groupSheetOpen}
        onClose={() => setGroupSheetOpen(false)}
      />
    </>
  )
}
