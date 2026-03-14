'use client'
/**
 * @file Sidebar du dashboard
 * @description Navigation latérale avec support RTL et mobile
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'

interface NavItem {
  href: string
  icon: React.ElementType
  labelKey: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { href: '/profile', icon: User, labelKey: 'nav.profile' },
  { href: '/surahs', icon: BookMarked, labelKey: 'nav.surahs' },
  { href: '/validate', icon: CheckCircle, labelKey: 'nav.validate', adminOnly: true },
  { href: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

/**
 * Sidebar principale du dashboard
 * Collapsible sur desktop, drawer sur mobile
 */
export function DashboardSidebar() {
  const t = useTranslations()
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, user } = useAppStore()

  const isSheikh = user?.role === 'sheikh' || user?.role === 'super_admin'

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

        {/* Footer */}
        <div className="border-t border-stone-200 p-2 dark:border-stone-800">
          <button
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:hidden">
        {navItems.map((item) => {
          if (item.adminOnly && !isSheikh) return null

          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-stone-500 dark:text-stone-400'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
