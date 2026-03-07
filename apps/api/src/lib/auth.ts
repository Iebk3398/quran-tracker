/**
 * @file Configuration Better Auth
 * @description Magic link + OAuth Google + gestion des sessions
 */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { db, users, sessions, accounts, verifications } from '@quran-tracker/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { users, sessions, accounts, verifications },
  }),
  secret: process.env['BETTER_AUTH_SECRET'],
  baseURL: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Envoi via Resend
        const { Resend } = await import('resend')
        const resend = new Resend(process.env['RESEND_API_KEY'])
        await resend.emails.send({
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
