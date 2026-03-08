/**
 * @file Script de reset de la base de données
 * @description Supprime toutes les tables, types et le schéma drizzle
 *              puis permet de relancer les migrations proprement.
 *              ⚠️  DESTRUCTIF — à n'utiliser qu'en développement !
 */
// Env loaded via --env-file-if-exists flag in package.json scripts (Node 22+)
import postgres from 'postgres'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const sql = postgres(connectionString, { max: 1 })

console.log('🧹 Resetting database...')
console.log('   Dropping tables...')

// Drop tables in reverse dependency order
await sql`DROP TABLE IF EXISTS "notifications" CASCADE`
await sql`DROP TABLE IF EXISTS "group_feed" CASCADE`
await sql`DROP TABLE IF EXISTS "user_badges" CASCADE`
await sql`DROP TABLE IF EXISTS "badges" CASCADE`
await sql`DROP TABLE IF EXISTS "revision_sessions" CASCADE`
await sql`DROP TABLE IF EXISTS "memorization_progress" CASCADE`
await sql`DROP TABLE IF EXISTS "surahs" CASCADE`
await sql`DROP TABLE IF EXISTS "group_members" CASCADE`
await sql`DROP TABLE IF EXISTS "groups" CASCADE`
await sql`DROP TABLE IF EXISTS "verifications" CASCADE`
await sql`DROP TABLE IF EXISTS "sessions" CASCADE`
await sql`DROP TABLE IF EXISTS "accounts" CASCADE`
await sql`DROP TABLE IF EXISTS "users" CASCADE`

console.log('   Dropping enum types...')

await sql`DROP TYPE IF EXISTS "public"."notification_type" CASCADE`
await sql`DROP TYPE IF EXISTS "public"."feed_event_type" CASCADE`
await sql`DROP TYPE IF EXISTS "public"."memorization_status" CASCADE`
await sql`DROP TYPE IF EXISTS "public"."revelation_type" CASCADE`
await sql`DROP TYPE IF EXISTS "public"."group_member_role" CASCADE`
await sql`DROP TYPE IF EXISTS "public"."user_role" CASCADE`

console.log('   Dropping drizzle tracking schema...')

await sql`DROP SCHEMA IF EXISTS "drizzle" CASCADE`

console.log('✅ Database reset complete!')
console.log('')
console.log('👉 Now run: npm run db:migrate')
console.log('👉 Then:    npm run db:seed')

await sql.end()
