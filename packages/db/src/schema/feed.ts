/**
 * @file Schéma Drizzle — Tables group_feed & notifications
 */
import { pgTable, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { groups } from './groups'

export const feedEventTypeEnum = pgEnum('feed_event_type', [
  'surah_memorized',
  'surah_validated',
  'badge_earned',
  'milestone_reached',
  'streak_record',
  'group_joined',
  'announcement',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'revision_reminder',
  'validation_done',
  'badge_earned',
  'group_announcement',
  'new_member',
])

/** Feed du groupe */
export const groupFeed = pgTable(
  'group_feed',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: feedEventTypeEnum('type').notNull(),
    content: text('content').notNull(),         // JSON stringifié
    reactions: text('reactions').notNull().default('{}'),  // JSON
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index('feed_group_idx').on(table.groupId),
    dateIdx: index('feed_date_idx').on(table.createdAt),
  })
)

/** Notifications individuelles */
export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    payload: text('payload').notNull().default('{}'),  // JSON
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    unreadIdx: index('notifications_unread_idx').on(table.userId, table.readAt),
  })
)

export type GroupFeedItem = typeof groupFeed.$inferSelect
export type Notification = typeof notifications.$inferSelect
