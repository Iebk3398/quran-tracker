/**
 * @file Schéma Drizzle — Tables badges & user_badges
 */
import { pgTable, text, timestamp, integer, index } from 'drizzle-orm/pg-core'
import { users } from './users.ts'

/** Définitions des badges */
export const badges = pgTable('badges', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameAr: text('name_ar').notNull(),
  description: text('description').notNull(),
  iconUrl: text('icon_url').notNull(),
  condition: text('condition').notNull(),   // JSON stringifié
  xpReward: integer('xp_reward').notNull().default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Badges obtenus par les utilisateurs */
export const userBadges = pgTable(
  'user_badges',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: text('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('user_badges_user_idx').on(table.userId),
  })
)

export type Badge = typeof badges.$inferSelect
export type UserBadge = typeof userBadges.$inferSelect
