'use client'
/**
 * @file Page Paramètres
 * @description Préférences utilisateur : langue, thème, déconnexion
 */
import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { useAppStore } from '@/store'

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

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const user = session?.user

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm">Gérez vos préférences</p>
      </div>

      {/* Compte */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-base">👤 Compte</h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg font-bold text-emerald-600">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="font-medium">{user?.name ?? '—'}</p>
            <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
          </div>
        </div>
      </section>

      {/* Langue */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-base">🌐 Langue</h2>
        <div className="flex gap-2 flex-wrap">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              onClick={() => setLocale(l.value)}
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
