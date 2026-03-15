/**
 * @file chain.ts — Utilitaire de mock pour Drizzle ORM
 *
 * Drizzle utilise une API fluente chainable (select().from().where()…).
 * Ce helper crée un objet Proxy qui :
 *  - Renvoie le même proxy pour toute propriété / appel de méthode
 *  - Se comporte comme une Promise (a un .then() qui résout `data`)
 *
 * Usage :
 *   vi.mocked(db.select).mockReturnValue(chain([{ id: '1' }]) as any)
 *   vi.mocked(db.insert).mockReturnValue(chain([newRow]) as any)
 */
import { vi } from 'vitest'

type AnyFn = (...args: unknown[]) => unknown

/**
 * Crée une chaîne Drizzle mock qui résout avec `data` à la fin de la chaîne.
 */
export function chain(data: unknown = []): AnyFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proxy: any = new Proxy(vi.fn(), {
    get(_target, prop) {
      // Permet l'await : proxy.then(resolve) → resolve(data)
      if (prop === 'then') {
        return (resolve: (v: unknown) => void, _reject?: unknown) => resolve(data)
      }
      if (prop === 'catch') return (_fn: unknown) => proxy
      if (prop === 'finally') return (fn: () => void) => { fn(); return proxy }
      if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined
      // Toute méthode (from, where, limit, innerJoin, set, values, returning, …)
      // renvoie le même proxy
      return vi.fn(() => proxy)
    },
    apply() {
      // Quand le proxy est appelé comme une fonction, retourner le même proxy
      return proxy
    },
  })
  return proxy
}

/**
 * Constantes pratiques pour les tests.
 */
export const TEST_USER = {
  id: 'user-test-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'student',
} as const

export const TEST_SHEIKH = {
  id: 'sheikh-test-1',
  email: 'sheikh@example.com',
  name: 'Sheikh Test',
  role: 'sheikh',
} as const

export const TEST_GROUP = {
  id: 'group-test-1',
  name: 'Groupe Test',
  description: 'Description test',
  sheikhId: TEST_SHEIKH.id,
  inviteCode: 'TESTCODE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
} as const
