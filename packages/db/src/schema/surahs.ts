/**
 * @file Schéma Drizzle — Table surahs
 * @description Les 114 sourates du Coran (référentiel immuable)
 */
import { pgTable, integer, text, pgEnum } from 'drizzle-orm/pg-core'

export const revelationTypeEnum = pgEnum('revelation_type', ['meccan', 'medinan'])

/** Table des 114 sourates */
export const surahs = pgTable('surahs', {
  id: integer('id').primaryKey(),
  number: integer('number').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
  nameEn: text('name_en').notNull(),
  nameTranslit: text('name_translit').notNull(),
  versesCount: integer('verses_count').notNull(),
  juzNumber: integer('juz_number').notNull(),
  hizbNumber: integer('hizb_number').notNull(),
  revelationType: revelationTypeEnum('revelation_type').notNull(),
  startPage: integer('start_page').notNull(),
  endPage: integer('end_page').notNull(),
})

export type Surah = typeof surahs.$inferSelect
export type NewSurah = typeof surahs.$inferInsert
