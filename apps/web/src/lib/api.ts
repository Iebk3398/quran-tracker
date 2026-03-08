/**
 * @file Utilitaire fetch API
 * @description Wrapper fetch avec credentials + base URL de l'API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

/**
 * Fetch vers l'API backend avec credentials (cookies de session)
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`)
  }

  const json = await res.json() as { data?: T } & T
  return json.data !== undefined ? json.data : json
}
