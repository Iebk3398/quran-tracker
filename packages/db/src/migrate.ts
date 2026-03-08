/**
 * @file Script de migration Drizzle
 * @description Applique toutes les migrations SQL en attente
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.local from monorepo root (packages/db → packages → root)
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql)

console.log('🗄️  Applying migrations...')

await migrate(db, {
  migrationsFolder: path.join(__dirname, 'migrations'),
})

console.log('✅ Migrations applied successfully')
await sql.end()
