import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/shared/auth-guard'

interface SheikhLayoutProps {
  children: ReactNode
}

/**
 * Layout des routes sheikh (validation, gestion groupe)
 * AuthGuard protège toutes les pages de ce groupe.
 */
export default function SheikhLayout({ children }: SheikhLayoutProps) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  )
}
