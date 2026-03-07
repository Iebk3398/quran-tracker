'use client'
/**
 * @file Hook Realtime — Dashboard groupe temps réel
 * @description Utilise Supabase Realtime (PostgreSQL CDC)
 */
import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface UseGroupRealtimeOptions {
  groupId: string
  enabled?: boolean
}

/**
 * Hook qui écoute les changements en temps réel sur un groupe
 * Met à jour automatiquement le cache TanStack Query
 */
export function useGroupRealtime({ groupId, enabled = true }: UseGroupRealtimeOptions) {
  const queryClient = useQueryClient()

  const invalidateGroupData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['group', groupId, 'leaderboard'] })
    queryClient.invalidateQueries({ queryKey: ['group', groupId, 'feed'] })
    queryClient.invalidateQueries({ queryKey: ['group', groupId, 'stats'] })
  }, [queryClient, groupId])

  useEffect(() => {
    if (!enabled || !groupId) return

    // Connexion Supabase Realtime (lazy import pour éviter l'import côté serveur)
    let channel: ReturnType<typeof import('@supabase/supabase-js').createClient> extends Promise<infer T> ? T : never

    async function setupRealtime() {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
      )

      channel = supabase
        .channel(`group:${groupId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_feed',
          filter: `group_id=eq.${groupId}`,
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['group', groupId, 'feed'] })
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'memorization_progress',
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['group', groupId, 'leaderboard'] })
          queryClient.invalidateQueries({ queryKey: ['group', groupId, 'stats'] })
        })
        .subscribe()
    }

    setupRealtime()

    return () => {
      channel?.unsubscribe?.()
    }
  }, [groupId, enabled, queryClient])

  return { invalidate: invalidateGroupData }
}
