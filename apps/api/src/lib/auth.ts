/**
 * @file Configuration Better Auth
 * @description Magic link + OAuth Google + gestion des sessions
 */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, emailOTP, bearer } from 'better-auth/plugins'
import { db, users, sessions, accounts, verifications } from '../../../../packages/db/src/index.ts'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  secret: process.env['BETTER_AUTH_SECRET'],
  baseURL: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3001',
  /**
   * Hook exécuté avant chaque création d'utilisateur.
   * Garantit que `name` n'est jamais vide (contrainte NOT NULL en DB).
   * Lors d'un magic link / OTP, Better Auth ne dispose que de l'email
   * → on utilise le préfixe email comme nom par défaut.
   */
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            name: user.name?.trim() || (user.email as string).split('@')[0] || 'Utilisateur',
          },
        }),
      },
    },
  },
  trustedOrigins: [
    (process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000').trim(),
    (process.env['BETTER_AUTH_URL'] ?? 'https://api-production-e758.up.railway.app').trim(),
    'http://localhost:3000',
    'http://localhost:3001',
    /^https:\/\/.*\.vercel\.app/,   // permet les chemins (/dashboard, etc.)
    /^https:\/\/.*\.railway\.app/,  // loopback inter-service Railway
  ],
  emailAndPassword: { enabled: false },
  advanced: {
    /**
     * Production : SameSite=None; Secure obligatoire pour Vercel → Railway cross-origin.
     * Local (HTTP) : secure:false car le flag Secure interdit les cookies sur HTTP —
     * le navigateur refuse de les stocker, ce qui casse toute session en dev.
     */
    defaultCookieAttributes: {
      sameSite: 'none' as const,
      secure: process.env['NODE_ENV'] === 'production',
    },
  },
  user: {
    /**
     * Mappe les noms de champs Better Auth vers les colonnes Drizzle.
     * Better Auth utilise "image" pour l'avatar ; notre schéma utilise "avatar".
     * Sans ce mapping, le Drizzle adapter lève BetterAuthError: field "image" does not exist.
     */
    fields: {
      image: 'avatar',
    },
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'student',
        input: false, // non modifiable via Better Auth directement
      },
    },
  },
  plugins: [
    // Permet l'auth via Authorization: Bearer <token> (cross-origin Vercel → Railway)
    bearer(),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        console.log(`📧 [OTP] Sending to: ${email}, code: ${otp}`)
        const { Resend } = await import('resend')
        const resend = new Resend(process.env['RESEND_API_KEY'])
        await resend.emails.send({
          from: process.env['EMAIL_FROM'] ?? 'noreply@qurantracker.app',
          to: email,
          subject: '🕌 Votre code de connexion — Quran Tracker',
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #10b981;">🕌 Quran Tracker</h2>
              <p>Votre code de connexion :</p>
              <div style="font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #10b981; text-align: center; padding: 20px; background: #f0fdf4; border-radius: 12px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #9ca3af; font-size: 14px;">Ce code expire dans 10 minutes. Ne le partagez pas.</p>
            </div>
          `,
        })
      },
      expiresIn: 600,
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.log(`📧 [MagicLink] Sending to: ${email}`)
        console.log(`🔗 [MagicLink] URL: ${url}`)
        // Envoi via Resend
        const { Resend } = await import('resend')
        const resend = new Resend(process.env['RESEND_API_KEY'])
        const result = await resend.emails.send({
          from: process.env['EMAIL_FROM'] ?? 'noreply@qurantracker.app',
          to: email,
          subject: '🕌 Connexion à Quran Tracker',
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #10b981;">🕌 Quran Tracker</h2>
              <p>Cliquez sur le lien ci-dessous pour vous connecter :</p>
              <a href="${url}" style="
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: bold;
              ">Se connecter</a>
              <p style="color: #9ca3af; font-size: 14px;">Ce lien expire dans 10 minutes.</p>
            </div>
          `,
        })
        if (result.error) {
          console.error('❌ [Resend] Error:', result.error)
          throw new Error(`Resend error: ${result.error.message}`)
        }
        console.log('✅ [Resend] Email sent, id:', result.data?.id)
      },
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 jours
    updateAge: 60 * 60 * 24,       // Renouvelle si actif
  },
})

export type Auth = typeof auth
