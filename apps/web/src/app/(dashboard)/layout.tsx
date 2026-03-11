import type { ReactNode } from 'react'
import { DashboardSidebar } from '@/components/shared/sidebar'
import { DashboardTopbar } from '@/components/shared/topbar'
import { SessionBootstrap } from '@/components/shared/session-bootstrap'

interface DashboardLayoutProps {
  children: ReactNode
}

/**
 * Layout principal du dashboard
 * Inclut la sidebar et la topbar
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-stone-50 dark:bg-stone-950">
      <SessionBootstrap />
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
