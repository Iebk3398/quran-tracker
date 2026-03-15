/**
 * @file Tests d'intégration — Routes /api/surahs
 *
 * Couvre :
 *  - GET / — liste toutes les sourates (pas d'auth)
 *  - GET /:id — détail d'une sourate (pas d'auth)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { chain } from '../helpers/chain.js'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../../packages/db/src/index.ts', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  surahs: {},
}))

// ── App de test ───────────────────────────────────────────────────────────────

async function buildApp() {
  const { surahRoutes } = await import('../../routes/surahs.js')
  const app = new Hono()
  app.route('/api/surahs', surahRoutes)
  app.onError((err, c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (err as any).status ?? 500
    return c.json({ success: false, message: err.message }, status)
  })
  return app
}

const MOCK_SURAHS = [
  { id: 1, name: 'Al-Fatiha', arabicName: 'الفاتحة', versesCount: 7, juzNumber: 1, revelationType: 'meccan' },
  { id: 2, name: 'Al-Baqara', arabicName: 'البقرة', versesCount: 286, juzNumber: 1, revelationType: 'medinan' },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/surahs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne toutes les sourates sans auth', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain(MOCK_SURAHS) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/surahs', { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('retourne 200 même si la DB est vide', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/surahs', { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toHaveLength(0)
  })
})

describe('GET /api/surahs/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne une sourate par ID', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([MOCK_SURAHS[0]]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/surahs/1', { method: 'GET' })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { id: number } }
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(1)
  })

  it('retourne 404 si sourate inexistante', async () => {
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/surahs/999', { method: 'GET' })
    expect(res.status).toBe(404)
  })

  it('ne requiert pas d\'authentification', async () => {
    // Aucun mock requireAuth — la route ne doit pas en avoir besoin
    const { db } = await import('../../../../packages/db/src/index.js')
    vi.mocked(db.select).mockReturnValue(chain([MOCK_SURAHS[0]]) as ReturnType<typeof db.select>)

    const app = await buildApp()
    const res = await app.request('/api/surahs/1', { method: 'GET' })
    expect(res.status).toBe(200)
  })
})
