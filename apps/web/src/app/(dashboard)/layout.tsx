import type { ReactNode } from 'react'
import { DashboardSidebar } from '@/components/shared/sidebar'
import { DashboardTopbar } from '@/components/shared/topbar'
import { AuthGuard } from '@/components/shared/auth-guard'

interface DashboardLayoutProps {
  children: ReactNode
}

/**
 * Layout principal du dashboard
 * AuthGuard vérifie la session → redirige vers /login si non authentifié.
 * SessionBootstrap est remplacé par AuthGuard (même logique + protection).
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-stone-50 dark:bg-stone-950">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardTopbar />

          <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-8 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
