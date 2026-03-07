'use client'
/**
 * @file Client tRPC pour Next.js
 * @description Configuration du client tRPC avec TanStack Query
 */
import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'

// Type importé depuis l'API (en dev: path alias, en prod: package)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppRouter = any

export const trpc = createTRPCReact<AppRouter>()

/**
 * Crée le client tRPC avec le lien HTTP vers l'API
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env['NEXT_PUBLIC_APP_URL'] ?? ''}/api/trpc`,
        transformer: superjson,
        headers() {
          return {
            'Content-Type': 'application/json',
          }
        },
      }),
    ],
  })
}
