import type { ReactNode } from 'react'
import { DashboardSidebar } from '@/components/shared/sidebar'
import { DashboardTopbar } from '@/components/shared/topbar'
import { AuthGuard } from '@/components/shared/auth-guard'

interface SheikhLayoutProps {
  children: ReactNode
}

/**
 * Layout des routes sheikh (validation, demandes d'adhésion…).
 * Identique au layout dashboard : sidebar + topbar + AuthGuard.
 */
export default function SheikhLayout({ children }: SheikhLayoutProps) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-stone-50 dark:bg-stone-950">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardTopbar />
          <main className="flex-1 overflow-y-auto px-3 pt-3 pb-24 sm:px-4 sm:pt-4 md:pb-6 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
