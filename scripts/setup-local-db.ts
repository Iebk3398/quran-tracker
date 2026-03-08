/**
 * @file Setup base de données locale
 * @description Démarre PostgreSQL (embedded) + crée .env.local pour le dev sans Docker
 */
import EmbeddedPostgres from 'embedded-postgres'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const PG_PORT = 5433
const PG_USER = 'quran'
const PG_PASSWORD = 'qurantracker'
const PG_DB = 'quran_tracker'
const DATABASE_URL = `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}`

async function main() {
  console.log('🕌 Quran Tracker — Setup base de données locale\n')

  // ─── 1. Démarrer PostgreSQL embedded ────────────────────────────────────
  console.log(`📦 Démarrage PostgreSQL (port ${PG_PORT})...`)

  const pg = new EmbeddedPostgres({
    databaseDir: path.join(root, '.pg-data'),
    user: PG_USER,
    password: PG_PASSWORD,
    port: PG_PORT,
    persistent: true,
  })

  await pg.initialise()
  await pg.start()
  await pg.createDatabase(PG_DB)

  console.log(`✅ PostgreSQL prêt sur localhost:${PG_PORT}\n`)

  // ─── 2. Créer .env.local ─────────────────────────────────────────────────
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) {
    const envContent = `# Auto-généré par scripts/setup-local-db.ts
DATABASE_URL="${DATABASE_URL}"
DIRECT_URL="${DATABASE_URL}"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_URL="http://localhost:3001"
BETTER_AUTH_SECRET="dev-secret-local-32-chars-minimum!!"

# Supabase Realtime (optionnel en local)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""

# Redis (mock en local - rate limiting désactivé)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Email (en local, les magic links sont loggés dans la console)
RESEND_API_KEY="re_dev_local"
FROM_EMAIL="noreply@localhost"

# Google OAuth (optionnel en local)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# OpenAI (v2)
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
    // S'assurer que DATABASE_URL est correct
    let env = fs.readFileSync(envPath, 'utf8')
    if (!env.includes('DATABASE_URL=')) {
      env += `\nDATABASE_URL="${DATABASE_URL}"\nDIRECT_URL="${DATABASE_URL}"\n`
      fs.writeFileSync(envPath, env)
      console.log('✅ DATABASE_URL ajoutée à .env.local\n')
    }
  }

  // ─── 3. Migrations ────────────────────────────────────────────────────────
  console.log('🗄️  Exécution des migrations Drizzle...')
  try {
    process.env['DATABASE_URL'] = DATABASE_URL
    execSync('npm run db:migrate', {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL },
    })
    console.log('✅ Migrations OK\n')
  } catch (e) {
    console.warn('⚠️  Migrations échouées (peut-être déjà appliquées) — continuons\n')
  }

  // ─── 4. Seed ─────────────────────────────────────────────────────────────
  console.log('🌱 Seeding des données (114 sourates + 8 badges)...')
  try {
    execSync('npm run db:seed', {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL },
    })
    console.log('✅ Seed OK\n')
  } catch (e) {
    console.warn('⚠️  Seed échoué (données peut-être déjà présentes) — continuons\n')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Base de données prête !')
  console.log(`   PostgreSQL : localhost:${PG_PORT}`)
  console.log(`   Database   : ${PG_DB}`)
  console.log(`   User       : ${PG_USER}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Ne pas stopper postgres - le laisser tourner en arrière-plan
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Erreur:', err)
  process.exit(1)
})
