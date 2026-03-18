'use client'
/**
 * @file Sidebar du dashboard
 * @description Navigation latérale avec group switcher et support RTL/mobile
 */
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  User,
  CheckCircle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  BookMarked,
  Users,
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { signOut, AUTH_TOKEN_KEY } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api'

interface NavItem {
  href: string
  icon: React.ElementType
  labelKey: string
  /** Label court pour la bottom nav mobile (max ~6 caractères) */
  mobileLabel: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', mobileLabel: 'Accueil'  },
  { href: '/groups',    icon: Users,           labelKey: 'nav.groups',    mobileLabel: 'Groupes'  },
  { href: '/profile',   icon: User,            labelKey: 'nav.profile',   mobileLabel: 'Profil'   },
  { href: '/quran',     icon: BookOpen,        labelKey: 'nav.quran',     mobileLabel: 'Coran'    },
  { href: '/surahs',    icon: BookMarked,      labelKey: 'nav.surahs',    mobileLabel: 'Mémo'     },
  { href: '/validate',  icon: CheckCircle,     labelKey: 'nav.validate',  mobileLabel: 'Valider', adminOnly: true },
  { href: '/settings',  icon: Settings,        labelKey: 'nav.settings',  mobileLabel: 'Réglages' },
]

// ─── Group Switcher ───────────────────────────────────────────────────────────

interface GroupOption {
  id: string
  name: string
  description: string | null
  sheikhId: string
  inviteCode: string
  createdAt: string
  role: 'sheikh' | 'student' | 'parent'
}

/**
 * Sélecteur de groupe actif affiché dans la sidebar desktop.
 * Affiche le groupe courant avec un dropdown pour en changer.
 */
function GroupSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const { activeGroupId, activeGroup, setActiveGroup, user } = useAppStore()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: myGroups = [] } = useQuery<GroupOption[]>({
    queryKey: ['my-groups'],
    queryFn: () => apiFetch('/api/groups/me'),
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  // Fermer le dropdown en cliquant ailleurs
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Synchroniser activeGroup depuis myGroups si le store n'a pas encore de groupe
  useEffect(() => {
    if (!activeGroupId && myGroups.length > 0 && myGroups[0]) {
      setActiveGroup(myGroups[0] as Parameters<typeof setActiveGroup>[0])
    }
  }, [myGroups, activeGroupId, setActiveGroup])

  const currentName = activeGroup?.name ?? myGroups.find(g => g.id === activeGroupId)?.name

  if (myGroups.length === 0) {
    return (
      <Link
        href="/groups"
        className="flex items-center gap-2 mx-2 mb-1 px-3 py-2 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
        title="Rejoindre un groupe"
      >
        <Plus className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="text-xs font-medium truncate">Rejoindre un groupe</span>}
      </Link>
    )
  }

  return (
    <div ref={dropdownRef} className="relative mx-2 mb-1">
      <button
        onClick={() => setOpen(!open)}
        title={currentName ?? 'Groupes'}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors text-left',
          collapsed && 'justify-center'
        )}
      >
        <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Users className="w-3 h-3 text-white" />
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate leading-tight">
              {currentName ?? '—'}
            </span>
            <ChevronDown className={cn('w-3 h-3 text-emerald-500 flex-shrink-0 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-50 mt-1 w-56 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-lg overflow-hidden',
              collapsed ? 'left-10' : 'left-0 right-0 w-auto'
            )}
          >
            <div className="p-1">
              {myGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGroup(g as Parameters<typeof setActiveGroup>[0])
                    setOpen(false)
                    router.push('/dashboard')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
                >
                  <div className={cn(
                    'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
                    g.id === activeGroupId ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-700'
                  )}>
                    {g.id === activeGroupId
                      ? <Check className="w-3 h-3 text-white" />
                      : <Users className="w-3 h-3 text-stone-500" />}
                  </div>
                  <span className="flex-1 text-sm text-stone-700 dark:text-stone-300 truncate">{g.name}</span>
                  {g.role === 'sheikh' && (
                    <span className="text-[10px] text-amber-500 font-semibold flex-shrink-0">Sheikh</span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-stone-100 dark:border-stone-800 p-1">
              <Link
                href="/groups"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Gérer les groupes</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Sidebar principale du dashboard
 * Collapsible sur desktop, drawer sur mobile
 */
export function DashboardSidebar() {
  const t = useTranslations()
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, user, reset } = useAppStore()

  const isSheikh = user?.role === 'sheikh' || user?.role === 'super_admin'

  /**
   * Déconnexion : vide les données locales, reset le store,
   * lance signOut en arrière-plan (fire & forget) et redirige immédiatement.
   * On n'attend PAS signOut() car il peut hanger en cross-origin (Vercel → Railway).
   */
  function handleLogout() {
    // 1. Vider les données locales immédiatement
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
    // 2. Supprimer le cookie de session pour éviter la boucle middleware
    if (typeof document !== 'undefined') {
      document.cookie = 'ba-logged-in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
    // 3. Reset du store Zustand
    reset()
    // 4. Invalider la session côté serveur en arrière-plan (sans bloquer la redirection)
    signOut().catch(() => null)
    // 5. Redirection immédiate
    window.location.href = '/login'
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 72 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative hidden flex-shrink-0 flex-col border-e border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:flex"
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4 dark:border-stone-800">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  Quran Tracker
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {!sidebarOpen && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Group Switcher */}
        <div className="py-2 border-b border-stone-100 dark:border-stone-800">
          <GroupSwitcher collapsed={!sidebarOpen} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            if (item.adminOnly && !isSheikh) return null

            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                  )}
                />
                <AnimatePresence mode="wait">
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        {/* Footer — Déconnexion desktop */}
        <div className="border-t border-stone-200 p-2 dark:border-stone-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-stone-400 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && (
              <span className="overflow-hidden whitespace-nowrap">
                {t('nav.logout')}
              </span>
            )}
          </button>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="absolute -end-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
          aria-label={sidebarOpen ? 'Réduire la sidebar' : 'Agrandir la sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-3 w-3 text-stone-500" />
          ) : (
            <ChevronRight className="h-3 w-3 text-stone-500" />
          )}
        </button>
      </motion.aside>

      {/* Mobile Bottom Navigation — labels courts pour tenir sur petits écrans */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:hidden safe-bottom">
        {navItems
          .filter((item) => !(item.adminOnly && !isSheikh))
          .map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors min-w-0',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-500 dark:text-stone-400'
                )}
              >
                <Icon className="h-[22px] w-[22px] flex-shrink-0" />
                <span className="truncate w-full text-center leading-tight px-0.5">
                  {item.mobileLabel}
                </span>
              </Link>
            )
          })}

        {/* Bouton déconnexion mobile */}
        <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium text-red-500 transition-colors hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 min-w-0"
          aria-label="Se déconnecter"
        >
          <LogOut className="h-[22px] w-[22px] flex-shrink-0" />
          <span className="leading-tight">Quitter</span>
        </button>
      </nav>
    </>
  )
}
