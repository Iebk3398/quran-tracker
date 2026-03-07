/**
 * @file Schéma Drizzle — Tables groups & group_members
 */
import { pgTable, text, timestamp, pgEnum, primaryKey, index } from 'drizzle-orm/pg-core'
import { users } from './users'

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

export type Group = typeof groups.$inferSelect
export type NewGroup = typeof groups.$inferInsert
export type GroupMember = typeof groupMembers.$inferSelect
