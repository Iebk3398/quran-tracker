/**
 * @file Utilitaire fetch API
 * @description Wrapper fetch avec credentials + base URL de l'API
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const AUTH_TOKEN_KEY = 'ba-session-token'

/**
 * Fetch vers l'API backend.
 * - Envoie les cookies (localhost dev)
 * - Envoie Authorization: Bearer <token> (production cross-origin Vercel → Railway)
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`)
  }

  const json = await res.json() as { data?: T } & T
  return json.data !== undefined ? json.data : json
}
