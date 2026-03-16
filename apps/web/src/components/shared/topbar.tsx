'use client'
/**
 * @file Topbar du dashboard
 * @description Barre supérieure avec notifications, sélecteur de langue et theme toggle
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Sun, Moon, Globe, BookOpen } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

/**
 * Barre de navigation supérieure du dashboard
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
  } = useAppStore()

  const [langOpen, setLangOpen] = useState(false)

  const locales = [
    { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
    { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' },
    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  ]

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-900">
      {/* Left — Logo mobile (masqué sur md car la sidebar prend le relais) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
          Quran Tracker
        </span>
      </div>

      <div className="hidden md:block" /> {/* Spacer desktop */}

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
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
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            aria-label="Langue"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:block">
              {locales.find((l) => l.code === locale)?.flag ?? '🌐'}
            </span>
          </button>

          {langOpen && (
            <>
              {/* Backdrop pour fermer le dropdown */}
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
          className="relative rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
          aria-label={t('notifications.title')}
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        {/* Avatar avec initiale */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
          {user?.name?.charAt(0).toUpperCase() ?? '?'}
        </div>
      </div>
    </header>
  )
}
