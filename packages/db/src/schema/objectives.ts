/**
 * @file Schéma Drizzle — Tables objectives & objective_participants
 * @description Objectifs partagés de mémorisation entre membres d'un groupe
 */
import { pgTable, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'
import { nanoid } from 'nanoid'
import { users } from './users.ts'
import { groups } from './groups.ts'

/** Table des objectifs de mémorisation partagés */
export const objectives = pgTable(
  'objectives',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    title: text('title').notNull(),
    description: text('description'),
    /** null = objectif personnel, sinon partage de groupe */
    groupId: text('group_id').references(() => groups.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetDate: timestamp('target_date', { withTimezone: true }),
    /** JSON array de numéros de sourates, ex : "[1,2,36]" */
    surahIds: text('surah_ids').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index('objectives_group_idx').on(table.groupId),
    creatorIdx: index('objectives_creator_idx').on(table.createdBy),
  })
)

/** Table des participants à un objectif */
export const objectiveParticipants = pgTable(
  'objective_participants',
  {
    objectiveId: text('objective_id')
      .notNull()
      .references(() => objectives.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.objectiveId, t.userId] }),
    index('obj_participants_user_idx').on(t.userId),
  ]
)

export type Objective = typeof objectives.$inferSelect
export type NewObjective = typeof objectives.$inferInsert
export type ObjectiveParticipant = typeof objectiveParticipants.$inferSelect
