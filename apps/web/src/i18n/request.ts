import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

/**
 * Configuration next-intl côté serveur
 * Détecte la locale depuis le cookie ou utilise 'fr' par défaut
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'fr'

  // Valider la locale
  const supportedLocales = ['fr', 'ar', 'en']
  const validLocale = supportedLocales.includes(locale) ? locale : 'fr'

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  }
})
