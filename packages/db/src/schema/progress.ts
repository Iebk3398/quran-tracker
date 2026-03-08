/**
 * @file Schéma Drizzle — Table memorization_progress
 * @description Suivi de mémorisation par utilisateur et sourate
 */
import {
  pgTable, text, timestamp, integer, real, pgEnum, index, unique
} from 'drizzle-orm/pg-core'
import { users } from './users.ts'
import { surahs } from './surahs.ts'

export const memorizationStatusEnum = pgEnum('memorization_status', [
  'not_started',
  'in_progress',
  'memorized',
  'consolidated',
])

/** Table de progression de mémorisation */
export const memorizationProgress = pgTable(
  'memorization_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    surahId: integer('surah_id')
      .notNull()
      .references(() => surahs.id, { onDelete: 'restrict' }),
    status: memorizationStatusEnum('status').notNull().default('not_started'),
    verseFrom: integer('verse_from'),
    verseTo: integer('verse_to'),
    lastRevisedAt: timestamp('last_revised_at', { withTimezone: true }),
    validatedBySheikhAt: timestamp('validated_by_sheikh_at', { withTimezone: true }),
    validatedBySheikhId: text('validated_by_sheikh_id')
      .references(() => users.id),
    sheikhNotes: text('sheikh_notes'),
    retentionScore: real('retention_score').notNull().default(2.5),   // SM-2 ease factor
    repetitionCount: integer('repetition_count').notNull().default(0),
    intervalDays: integer('interval_days').notNull().default(1),
    nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSurahUnique: unique().on(table.userId, table.surahId),
    userIdx: index('progress_user_idx').on(table.userId),
    surahIdx: index('progress_surah_idx').on(table.surahId),
    nextReviewIdx: index('progress_next_review_idx').on(table.nextReviewAt),
  })
)

/** Table des sessions de révision */
export const revisionSessions = pgTable(
  'revision_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    surahId: integer('surah_id')
      .notNull()
      .references(() => surahs.id, { onDelete: 'restrict' }),
    duration: integer('duration').notNull(),   // en minutes
    quality: integer('quality').notNull(),     // 0-5 (SM-2)
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('revision_user_idx').on(table.userId),
    dateIdx: index('revision_date_idx').on(table.createdAt),
  })
)

export type MemorizationProgress = typeof memorizationProgress.$inferSelect
export type NewMemorizationProgress = typeof memorizationProgress.$inferInsert
export type RevisionSession = typeof revisionSessions.$inferSelect
export type NewRevisionSession = typeof revisionSessions.$inferInsert
