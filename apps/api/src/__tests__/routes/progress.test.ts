/**
 * @file Tests d'intégration — Routes /api/progress
 *
 * Couvre :
 *  - GET /:userId — progression d'un utilisateur
 *  - POST / — créer / mettre à jour une progression
 *  - POST /:id/validate — valider une progression (sheikh)
 *  - GET /group/:groupId — progressions du groupe
 *  - GET /due/:userId — sourates à réviser
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { chain, TEST_USER, TEST_SHEIKH, TEST_GROUP } from '../helpers/chain.js'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../../packages/db/src/index.ts', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  memorizationProgress: {},
  users: {},
  groups: {},
  groupMembers: {},
  userBadges: {},
  badges: {},
  surahs: {},
  revisionSessions: {},
}))

vi.mock('../../middleware/auth.ts', () => ({
  requireAuth: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', TEST_USER)
    await next()
  }),
  requireSheikh: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('user', TEST_SHEIKH)
    await next()
  }),
}))

vi.mock('../../routes/feed.ts', () => ({
  createFeedEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/badges.ts', () => ({
  getNewlyEarnedBadges: vi.fn(() => []),
  calculateXP: vi.fn(() => 0),
}))

vi.mock('../../lib/levels.ts', () => ({
  getLevelIndex: vi.fn(() => 0),
  LEVELS: [{ name: 'Débutant', emoji: '🌱' }],
}))

// ── App de test ───────────────────────────────────────────────────────────────

async function buildApp() {
  const { progressRoutes } = await import('../../routes/progress.js')
  const app = new Hono()
  app.route('/api/progress', progressRoutes)
  app.onError((err, c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (err as any).status ?? 500
    return c.json({ success: false, message: err.message }, status)
  })
  return app
}

function json(body: unknown) {
  return {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/progress/:userId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne la progression d\'un utilisateur', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(
      chain([{ surahId: 1, status: 'memorized', updatedAt: new Date() }]) as ReturnType<typeof db.select>
    )

    const app = await buildApp()
    const res = await app.request(`/api/progress/${TEST_USER.id}`, { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('retourne un tableau vide si aucune progression', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request(`/api/progress/${TEST_USER.id}`, { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toHaveLength(0)
  })
})

describe('POST /api/progress — mise à jour progression', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crée une nouvelle progression', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    const newProgress = { id: 'prog-1', userId: TEST_USER.id, surahId: 1, status: 'in_progress' }
    vi.mocked(db.select)
      .mockReturnValueOnce(chain([]) as ReturnType<typeof db.select>)             // aucune progression existante
      .mockReturnValueOnce(chain([{ xp: '0' }]) as ReturnType<typeof db.select>) // user xp
      .mockReturnValueOnce(chain([]) as ReturnType<typeof db.select>)             // user badges
      .mockReturnValueOnce(chain([]) as ReturnType<typeof db.select>)             // memorized count
    vi.mocked(db.insert).mockReturnValue(chain([newProgress]) as ReturnType<typeof db.insert>)
    vi.mocked(db.update).mockReturnValue(chain([]) as ReturnType<typeof db.update>)

    const app = await buildApp()
    const res = await app.request('/api/progress', {
      method: 'POST',
      ...json({ surahId: 1, status: 'in_progress' }),
    })
    expect(res.status).toBe(200)
  })

  it('rejette un status invalide', async () => {
    const app = await buildApp()
    const res = await app.request('/api/progress', {
      method: 'POST',
      ...json({ surahId: 1, status: 'invalid_status' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejette surahId non-entier', async () => {
    const app = await buildApp()
    const res = await app.request('/api/progress', {
      method: 'POST',
      ...json({ surahId: 'abc', status: 'in_progress' }),
    })
    expect(res.status).toBe(400)
  })

  it('accepte les status valides', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select)
      .mockReturnValue(chain([{ xp: '0' }]) as ReturnType<typeof db.select>)
    vi.mocked(db.insert).mockReturnValue(chain([{}]) as ReturnType<typeof db.insert>)
    vi.mocked(db.update).mockReturnValue(chain([{}]) as ReturnType<typeof db.update>)

    const app = await buildApp()
    for (const status of ['in_progress', 'memorized', 'consolidated', 'needs_review']) {
      const res = await app.request('/api/progress', {
        method: 'POST',
        ...json({ surahId: 1, status }),
      })
      // 200 ou 201 selon si insert ou update
      expect([200, 201]).toContain(res.status)
    }
  })
})

describe('POST /api/progress/:id/validate — validation sheikh', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valide une progression (sheikh)', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select)
      .mockReturnValueOnce(chain([{ id: 'prog-1', userId: TEST_USER.id, surahId: 1, status: 'in_progress' }]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(chain([{ xp: '0' }]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(chain([]) as ReturnType<typeof db.select>)
      .mockReturnValueOnce(chain([]) as ReturnType<typeof db.select>)
    vi.mocked(db.update).mockReturnValue(chain([{ status: 'memorized' }]) as ReturnType<typeof db.update>)

    const app = await buildApp()
    const res = await app.request('/api/progress/prog-1/validate', {
      method: 'POST',
      ...json({ status: 'memorized', notes: 'Bien mémorisé' }),
    })
    expect(res.status).toBe(200)
  })

  it('retourne 403 si rôle student', async () => {
    const { requireSheikh } = await import('../../middleware/auth.js')
    vi.mocked(requireSheikh).mockImplementationOnce(async (_c, _next) => {
      const { HTTPException } = await import('hono/http-exception')
      throw new HTTPException(403, { message: 'Forbidden' })
    })

    const app = await buildApp()
    const res = await app.request('/api/progress/prog-1/validate', {
      method: 'POST',
      ...json({ status: 'memorized' }),
    })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/progress/group/:groupId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les progressions du groupe', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([{
      userId: TEST_USER.id,
      userName: TEST_USER.name,
      surahId: 1,
      status: 'in_progress',
    }]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request(`/api/progress/group/${TEST_GROUP.id}`, { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
  })
})

describe('GET /api/progress/due/:userId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les sourates à réviser', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(
      chain([{ surahId: 1, lastRevised: new Date(), status: 'memorized' }]) as ReturnType<typeof db.select>
    )

    const app = await buildApp()
    const res = await app.request(`/api/progress/due/${TEST_USER.id}`, { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
  })
})
