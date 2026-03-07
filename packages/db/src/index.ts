/**
 * @file Point d'entrée du package db
 * @description Connexion PostgreSQL via Drizzle ORM + Supabase
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

/** Client PostgreSQL (pooled pour l'API, direct pour les migrations) */
const client = postgres(connectionString, {
  max: process.env['NODE_ENV'] === 'production' ? 10 : 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

/** Instance Drizzle ORM avec tous les schémas */
export const db = drizzle(client, { schema })

export * from './schema'
export type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
