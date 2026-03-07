'use client'
/**
 * @file Store Zustand global
 * @description État global de l'application Quran Tracker
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Group } from '@quran-tracker/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppState {
  // User
  user: User | null
  setUser: (user: User | null) => void

  // Active group
  activeGroupId: string | null
  activeGroup: Group | null
  setActiveGroup: (group: Group | null) => void

  // Locale
  locale: 'fr' | 'ar' | 'en'
  setLocale: (locale: 'fr' | 'ar' | 'en') => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Notifications unread count
  unreadNotifications: number
  setUnreadNotifications: (count: number) => void
  decrementUnread: () => void

  // Reset
  reset: () => void
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  activeGroupId: null,
  activeGroup: null,
  locale: 'fr' as const,
  theme: 'system' as const,
  sidebarOpen: true,
  unreadNotifications: 0,
}

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * Store global Zustand avec persistance locale
 * Persiste : locale, theme, activeGroupId
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      setActiveGroup: (group) =>
        set({
          activeGroup: group,
          activeGroupId: group?.id ?? null,
        }),

      setLocale: (locale) => {
        // Mettre à jour le cookie pour next-intl
        document.cookie = `locale=${locale};path=/;max-age=31536000`
        set({ locale })
      },

      setTheme: (theme) => set({ theme }),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setUnreadNotifications: (unreadNotifications) =>
        set({ unreadNotifications }),

      decrementUnread: () =>
        set((state) => ({
          unreadNotifications: Math.max(0, state.unreadNotifications - 1),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'quran-tracker-store',
      // Ne persister que les données non-sensibles
      partialize: (state) => ({
        locale: state.locale,
        theme: state.theme,
        activeGroupId: state.activeGroupId,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
