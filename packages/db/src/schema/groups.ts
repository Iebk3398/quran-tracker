/**
 * @file Schéma Drizzle — Tables groups, group_members & group_goals
 */
import { pgTable, text, timestamp, pgEnum, primaryKey, index, integer, boolean } from 'drizzle-orm/pg-core'
import { users } from './users.ts'

export const groupMemberRoleEnum = pgEnum('group_member_role', [
  'sheikh',
  'student',
  'parent',
])

/** Table des groupes */
export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sheikhId: text('sheikh_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  inviteCode: text('invite_code').notNull().unique(),
  isActive: text('is_active').notNull().default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Table des membres du groupe */
export const groupMembers = pgTable(
  'group_members',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    role: groupMemberRoleEnum('role').notNull().default('student'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.groupId] }),
    groupIdx: index('group_members_group_idx').on(table.groupId),
  })
)

/** Table des objectifs communs du groupe */
export const groupGoals = pgTable(
  'group_goals',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    description: text('description'),
    /** Numéro de sourate de début (1–114). Null = pas de filtre par plage */
    surahFrom: integer('surah_from'),
    /** Numéro de sourate de fin (1–114). Null = pas de filtre par plage */
    surahTo: integer('surah_to'),
    /** Nombre de sourates cible (utilisé quand pas de plage définie) */
    targetCount: integer('target_count'),
    deadline: timestamp('deadline', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index('group_goals_group_idx').on(table.groupId),
  })
)

export type Group = typeof groups.$inferSelect
export type NewGroup = typeof groups.$inferInsert
export type GroupMember = typeof groupMembers.$inferSelect
export type GroupGoal = typeof groupGoals.$inferSelect
export type NewGroupGoal = typeof groupGoals.$inferInsert
