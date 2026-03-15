/**
 * @file Tests d'intégration — Routes /api/users
 *
 * Couvre :
 *  - Protection auth (401 sans token)
 *  - GET /api/users/me — profil
 *  - PATCH /api/users/me — mise à jour profil + validation Zod
 *  - POST /api/users/me/hizb — incrémentation hizbs + validation count
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { chain, TEST_USER } from '../helpers/chain.js'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../../packages/db/src/index.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  users: {},
  groupMembers: {},
  memorizationProgress: {},
  sessions: {},
  accounts: {},
  verifications: {},
}))

vi.mock('../../middleware/auth.ts', () => ({
  requireAuth: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', TEST_USER)
    await next()
  }),
  requireSheikh: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', { ...TEST_USER, role: 'sheikh' })
    await next()
  }),
}))

// Mock feed (appelé par handlePostHizbEvents)
vi.mock('../../routes/feed.ts', () => ({
  createFeedEvent: vi.fn().mockResolvedValue(undefined),
}))

// Mock levels
vi.mock('../../lib/levels.ts', () => ({
  getLevelIndex: vi.fn(() => 0),
  LEVELS: [{ name: 'Débutant', emoji: '🌱' }],
}))

// ── App de test ───────────────────────────────────────────────────────────────

async function buildApp() {
  const { userRoutes } = await import('../../routes/users.js')
  const app = new Hono()
  app.route('/api/users', userRoutes)
  app.onError((err, c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (err as any).status ?? 500
    return c.json({ success: false, message: err.message }, status)
  })
  return app
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown) {
  return {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 401 sans auth (mock désactivé)', async () => {
    const { requireAuth } = await import('../../middleware/auth.js')
    vi.mocked(requireAuth).mockImplementationOnce(async (_c, _next) => {
      const { HTTPException } = await import('hono/http-exception')
      throw new HTTPException(401, { message: 'Unauthorized' })
    })

    const app = await buildApp()
    const res = await app.request('/api/users/me', { method: 'GET' })
    expect(res.status).toBe(401)
  })

  it('retourne le profil utilisateur', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([{
      id: TEST_USER.id,
      email: TEST_USER.email,
      name: TEST_USER.name,
      role: 'student',
      xp: '100',
      hizbsRead: 5,
    }]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/users/me', { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { id: string } }
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(TEST_USER.id)
  })

  it('retourne 404 si utilisateur inexistant en DB', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/users/me', { method: 'GET' })
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/users/me', () => {
  beforeEach(() => vi.clearAllMocks())

  it('met à jour le profil (name)', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    const updatedUser = { id: TEST_USER.id, name: 'Nouveau Nom', role: 'student' }
    vi.mocked(db.update).mockReturnValue(chain([updatedUser]) as ReturnType<typeof db.update>)

    const app = await buildApp()
    const res = await app.request('/api/users/me', {
      method: 'PATCH',
      ...json({ name: 'Nouveau Nom' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { name: string } }
    expect(body.success).toBe(true)
  })

  it('rejette un name trop court (< 1 char)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/users/me', {
      method: 'PATCH',
      ...json({ name: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejette un name trop long (> 100 chars)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/users/me', {
      method: 'PATCH',
      ...json({ name: 'a'.repeat(101) }),
    })
    expect(res.status).toBe(400)
  })

  it('rejette un role invalide', async () => {
    const app = await buildApp()
    const res = await app.request('/api/users/me', {
      method: 'PATCH',
      ...json({ role: 'super_admin' }),
    })
    expect(res.status).toBe(400)
  })

  it('accepte role parmi student | sheikh | parent', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.update).mockReturnValue(chain([{ ...TEST_USER, role: 'sheikh' }]) as ReturnType<typeof db.update>)

    const app = await buildApp()
    for (const role of ['student', 'sheikh', 'parent']) {
      const res = await app.request('/api/users/me', {
        method: 'PATCH',
        ...json({ role }),
      })
      expect(res.status).toBe(200)
    }
  })
})

describe('POST /api/users/me/hizb', () => {
  beforeEach(() => vi.clearAllMocks())

  it('enregistre des hizbs et retourne le total', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select)
      .mockReturnValue(chain([{ xp: '50', hizbsRead: 3 }]) as ReturnType<typeof db.select>)
    vi.mocked(db.update)
      .mockReturnValue(chain([{ hizbsRead: 4, xp: '55' }]) as ReturnType<typeof db.update>)

    const app = await buildApp()
    const res = await app.request('/api/users/me/hizb', {
      method: 'POST',
      ...json({ count: 1 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { hizbsRead: number } }
    expect(body.success).toBe(true)
    expect(typeof body.data.hizbsRead).toBe('number')
  })

  it('rejette count = 0 (min 1)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/users/me/hizb', {
      method: 'POST',
      ...json({ count: 0 }),
    })
    expect(res.status).toBe(400)
  })

  it('rejette count > 60 (max 60)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/users/me/hizb', {
      method: 'POST',
      ...json({ count: 61 }),
    })
    expect(res.status).toBe(400)
  })

  it('rejette un count non-entier', async () => {
    const app = await buildApp()
    const res = await app.request('/api/users/me/hizb', {
      method: 'POST',
      ...json({ count: 1.5 }),
    })
    expect(res.status).toBe(400)
  })

  it('accepte count à 60 (boundary)', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([{ xp: '0', hizbsRead: 0 }]) as ReturnType<typeof db.select>)
    vi.mocked(db.update).mockReturnValue(chain([{ hizbsRead: 60, xp: '300' }]) as ReturnType<typeof db.update>)

    const app = await buildApp()
    const res = await app.request('/api/users/me/hizb', {
      method: 'POST',
      ...json({ count: 60 }),
    })
    expect(res.status).toBe(200)
  })
})
