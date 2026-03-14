'use client'
/**
 * @file Page Paramètres
 * @description Préférences utilisateur : langue, thème, déconnexion
 */
import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAppStore } from '@/store'

interface UserProfile {
  id: string
  name: string
  email: string
  role: 'student' | 'sheikh' | 'parent' | 'super_admin'
  avatar: string | null
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Étudiant / Hafiz',
  sheikh: 'Sheikh / Enseignant',
  parent: 'Parent',
  super_admin: 'Super Admin',
}

const LOCALES = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
] as const

const THEMES = [
  { value: 'light', label: 'Clair', icon: '☀️' },
  { value: 'dark', label: 'Sombre', icon: '🌙' },
  { value: 'system', label: 'Système', icon: '💻' },
] as const

export default function SettingsPage() {
  const { data: session } = useSession()
  const { locale, setLocale, theme, setTheme } = useAppStore()
  const router = useRouter()

  const sessionUser = session?.user
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiFetch<UserProfile>('/api/users/me'),
    enabled: !!sessionUser?.id,
  })

  // Merge profile + session
  const email = profile?.email ?? (sessionUser as { email?: string } | undefined)?.email ?? ''
  const name = profile?.name || email.split('@')[0] || '—'
  const role = profile?.role ?? 'student'
  const avatar = profile?.avatar
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  async function handleSignOut() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('ba-session-token')
    await signOut()
    router.push('/login')
  }

  function handleSetLocale(value: 'fr' | 'ar' | 'en') {
    setLocale(value)
    // Recharger la page pour que next-intl prenne en compte le nouveau cookie
    router.refresh()
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm">Gérez vos préférences</p>
      </div>

      {/* Compte */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-base">👤 Compte</h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-lg font-bold text-emerald-600 overflow-hidden flex-shrink-0">
            {avatar
              ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{name}</p>
              <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          </div>
        </div>
      </section>

      {/* Thème */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-base">🎨 Thème</h2>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                theme === t.value
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Langue */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-base">🌐 Langue</h2>
        <div className="flex gap-2 flex-wrap">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              onClick={() => handleSetLocale(l.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                locale === l.value
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">La langue s&apos;applique au rechargement de la page</p>
      </section>

      {/* Déconnexion */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold text-base mb-3">🚪 Session</h2>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Se déconnecter
        </button>
      </section>
    </div>
  )
}
