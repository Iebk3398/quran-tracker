/**
 * @file Script de démarrage local
 * @description Lance PostgreSQL (PGlite WASM) + Redis mock + serveurs de dev
 * Utilisé quand Docker n'est pas disponible.
 */
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

async function main() {
  console.log('🕌 Quran Tracker — Démarrage local (sans Docker)\n')

  // ─── 1. PGlite (PostgreSQL WASM) ─────────────────────────────────────────
  console.log('📦 Démarrage PostgreSQL (PGlite WASM)...')
  const dbPath = path.join(root, '.pglite-data')
  fs.mkdirSync(dbPath, { recursive: true })

  const pg = new PGlite(dbPath)
  await pg.waitReady

  console.log('✅ PostgreSQL prêt (données persistées dans .pglite-data/)\n')

  // ─── 2. Générer le .env.local ─────────────────────────────────────────────
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) {
    const envContent = `# Auto-généré par scripts/dev-local.ts
# Base de données locale (PGlite WASM - pas besoin de Docker)
DATABASE_URL="file:./.pglite-data"
DIRECT_URL="file:./.pglite-data"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_URL="http://localhost:3001"
BETTER_AUTH_SECRET="dev-secret-change-in-production-32chars!!"

# Supabase (optionnel en local - pour Realtime)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""

# Redis (désactivé en local)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Email (désactivé en local - magic links logués dans la console)
RESEND_API_KEY="re_dev_no_email"
FROM_EMAIL="noreply@localhost"

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# OpenAI (v2 - optionnel)
OPENAI_API_KEY=""

# Cloudflare R2 (optionnel)
R2_ENDPOINT=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
`
    fs.writeFileSync(envPath, envContent)
    console.log('✅ .env.local créé\n')
  } else {
    console.log('ℹ️  .env.local existe déjà\n')
  }

  console.log('🚀 Tout est prêt ! Lance maintenant :')
  console.log('   npm run dev\n')
}

main().catch(console.error)
