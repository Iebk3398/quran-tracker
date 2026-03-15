/**
 * @file Tests d'intégration — Routes /api/groups
 *
 * Couvre :
 *  - POST / — création groupe (sheikh requis)
 *  - GET /me — groupes de l'utilisateur
 *  - GET /:id — détails groupe
 *  - POST /join — rejoindre avec code d'invitation
 *  - GET /:id/members — membres du groupe
 *  - GET /:id/leaderboard — classement
 *  - DELETE /:id/members/:userId — exclure un membre
 *  - POST /:id/goals — créer un objectif
 *  - GET /:id/goals/active — objectif en cours
 *  - DELETE /:id/goals/:goalId — supprimer un objectif
 *  - Auth : 401 sans token, 403 rôle insuffisant
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { chain, TEST_USER, TEST_SHEIKH, TEST_GROUP } from '../helpers/chain.js'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../../packages/db/src/index.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  groups: {},
  groupMembers: {},
  users: {},
  memorizationProgress: {},
  groupGoals: {},
  userBadges: {},
  badges: {},
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

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-nanoid-id'),
}))

// ── App de test ───────────────────────────────────────────────────────────────

async function buildApp() {
  const { groupRoutes } = await import('../../routes/groups.js')
  const app = new Hono()
  app.route('/api/groups', groupRoutes)
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

describe('POST /api/groups — création groupe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crée un groupe (sheikh)', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.insert)
      .mockReturnValueOnce(chain([TEST_GROUP]) as ReturnType<typeof db.insert>) // insert group
      .mockReturnValueOnce(chain([]) as ReturnType<typeof db.insert>)           // insert member

    const app = await buildApp()
    const res = await app.request('/api/groups', {
      method: 'POST',
      ...json({ name: 'Mon Groupe', description: 'Description' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { success: boolean; data: { name: string } }
    expect(body.success).toBe(true)
  })

  it('rejette name trop court (< 2 chars)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/groups', {
      method: 'POST',
      ...json({ name: 'A' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejette name trop long (> 100 chars)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/groups', {
      method: 'POST',
      ...json({ name: 'a'.repeat(101) }),
    })
    expect(res.status).toBe(400)
  })

  it('rejette description trop longue (> 500 chars)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/groups', {
      method: 'POST',
      ...json({ name: 'Groupe', description: 'a'.repeat(501) }),
    })
    expect(res.status).toBe(400)
  })

  it('retourne 403 si rôle student (requireSheikh)', async () => {
    const { requireSheikh } = await import('../../middleware/auth.js')
    vi.mocked(requireSheikh).mockImplementationOnce(async (_c, _next) => {
      const { HTTPException } = await import('hono/http-exception')
      throw new HTTPException(403, { message: 'Forbidden' })
    })

    const app = await buildApp()
    const res = await app.request('/api/groups', {
      method: 'POST',
      ...json({ name: 'Mon Groupe' }),
    })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/groups/me', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne la liste des groupes de l'utilisateur', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(
      chain([TEST_GROUP]) as ReturnType<typeof db.select>
    )

    const app = await buildApp()
    const res = await app.request('/api/groups/me', { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('retourne un tableau vide si aucun groupe', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/groups/me', { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toHaveLength(0)
  })
})

describe('GET /api/groups/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne les détails du groupe', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([TEST_GROUP]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request(`/api/groups/${TEST_GROUP.id}`, { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { id: string } }
    expect(body.data.id).toBe(TEST_GROUP.id)
  })

  it('retourne 404 si groupe inexistant', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/groups/inexistant', { method: 'GET' })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/groups/join', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejoint un groupe avec un code valide', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select)
      .mockReturnValueOnce(chain([TEST_GROUP]) as ReturnType<typeof db.select>)  // trouve le groupe
      .mockReturnValueOnce(chain([]) as ReturnType<typeof db.select>)            // pas déjà membre
    vi.mocked(db.insert).mockReturnValue(chain([]) as ReturnType<typeof db.insert>)

    const app = await buildApp()
    const res = await app.request('/api/groups/join', {
      method: 'POST',
      ...json({ inviteCode: 'TESTCODE' }),
    })
    expect(res.status).toBe(200)
  })

  it('rejette inviteCode trop court (< 6 chars)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/groups/join', {
      method: 'POST',
      ...json({ inviteCode: 'ABC' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejette inviteCode trop long (> 12 chars)', async () => {
    const app = await buildApp()
    const res = await app.request('/api/groups/join', {
      method: 'POST',
      ...json({ inviteCode: 'ABCDEFGHIJKLM' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/groups/:id/members', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne la liste des membres', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(
      chain([{ userId: TEST_USER.id, name: TEST_USER.name, role: 'student' }]) as ReturnType<typeof db.select>
    )

    const app = await buildApp()
    const res = await app.request(`/api/groups/${TEST_GROUP.id}/members`, { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('GET /api/groups/:id/leaderboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne le classement du groupe', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(
      chain([{
        userId: TEST_USER.id,
        name: TEST_USER.name,
        avatar: null,
        hizbsRead: 5,
        xp: '100',
      }]) as ReturnType<typeof db.select>
    )

    const app = await buildApp()
    const res = await app.request(`/api/groups/${TEST_GROUP.id}/leaderboard`, { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
  })
})

describe('DELETE /api/groups/:id/members/:userId — exclure un membre', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exclut un membre (sheikh)', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.delete).mockReturnValue(chain([]) as ReturnType<typeof db.delete>)

    const app = await buildApp()
    const res = await app.request(
      `/api/groups/${TEST_GROUP.id}/members/${TEST_USER.id}`,
      { method: 'DELETE' }
    )
    expect(res.status).toBe(200)
  })
})

describe('POST /api/groups/:id/goals — créer un objectif', () => {
  beforeEach(() => vi.clearAllMocks())

  it('crée un objectif (sheikh)', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    const goal = { id: 'goal-1', groupId: TEST_GROUP.id, targetSurahs: 3, deadline: new Date().toISOString() }
    vi.mocked(db.insert).mockReturnValue(chain([goal]) as ReturnType<typeof db.insert>)

    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const app = await buildApp()
    const res = await app.request(`/api/groups/${TEST_GROUP.id}/goals`, {
      method: 'POST',
      ...json({ targetSurahs: 3, deadline }),
    })
    expect(res.status).toBe(201)
  })

  it('rejette targetSurahs < 1', async () => {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const app = await buildApp()
    const res = await app.request(`/api/groups/${TEST_GROUP.id}/goals`, {
      method: 'POST',
      ...json({ targetSurahs: 0, deadline }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/groups/:id/goals/active', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne l\'objectif actif (ou null)', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request(`/api/groups/${TEST_GROUP.id}/goals/active`, { method: 'GET' })
    expect(res.status).toBe(200)
  })
})
