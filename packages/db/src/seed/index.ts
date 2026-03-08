/**
 * @file Script de seed — Quran Tracker
 * @description Insère les données initiales (114 sourates, badges)
 * Usage: npm run db:seed
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env.local from monorepo root
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

import { db } from '../index.ts'
import { surahs, badges } from '../schema/index.ts'
import { SURAHS_DATA } from './surahs-data.ts'

/** Badges initiaux du système de gamification */
const INITIAL_BADGES = [
  { id: 'juz-amma',        name: 'Juz Amma',          nameAr: 'جزء عم',       description: 'A mémorisé le 30ème Juz',             iconUrl: '/badges/juz-amma.svg',       condition: JSON.stringify({ surahsFrom: 78, surahsTo: 114, allMemorized: true }), xpReward: 500 },
  { id: 'fatiha',          name: 'La Fatiha',          nameAr: 'الفاتحة',      description: 'A mémorisé la sourate Al-Fatiha',     iconUrl: '/badges/fatiha.svg',         condition: JSON.stringify({ surahId: 1, status: 'memorized' }),                  xpReward: 50 },
  { id: 'streak-7',        name: '7 jours de suite',   nameAr: '٧ أيام متتالية', description: '7 jours consécutifs de révision',   iconUrl: '/badges/streak-7.svg',       condition: JSON.stringify({ streakDays: 7 }),                                    xpReward: 100 },
  { id: 'streak-30',       name: 'Un mois de suite',   nameAr: '٣٠ يوماً',     description: '30 jours consécutifs de révision',    iconUrl: '/badges/streak-30.svg',      condition: JSON.stringify({ streakDays: 30 }),                                   xpReward: 300 },
  { id: 'first-surah',     name: 'Premier pas',        nameAr: 'الخطوة الأولى', description: 'A mémorisé sa première sourate',    iconUrl: '/badges/first-surah.svg',    condition: JSON.stringify({ surahsMemorized: 1 }),                               xpReward: 100 },
  { id: 'ten-surahs',      name: 'Dix Sourates',       nameAr: 'عشر سور',      description: 'A mémorisé 10 sourates',              iconUrl: '/badges/ten-surahs.svg',     condition: JSON.stringify({ surahsMemorized: 10 }),                              xpReward: 250 },
  { id: 'half-quran',      name: 'Mi-chemin',          nameAr: 'نصف الطريق',   description: 'A mémorisé 57 sourates (moitié)',     iconUrl: '/badges/half-quran.svg',     condition: JSON.stringify({ surahsMemorized: 57 }),                              xpReward: 2000 },
  { id: 'hafiz',           name: 'Hafiz',              nameAr: 'حافظ',         description: 'A mémorisé les 114 sourates !',       iconUrl: '/badges/hafiz.svg',          condition: JSON.stringify({ surahsMemorized: 114, allMemorized: true }),         xpReward: 10000 },
]

async function seed() {
  console.log('🕌 Début du seed — Quran Tracker')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Seed sourates
  console.log('📖 Insertion des 114 sourates...')
  await db
    .insert(surahs)
    .values(SURAHS_DATA)
    .onConflictDoNothing()
  console.log(`   ✅ ${SURAHS_DATA.length} sourates insérées`)

  // Seed badges
  console.log('🏆 Insertion des badges...')
  await db
    .insert(badges)
    .values(INITIAL_BADGES)
    .onConflictDoNothing()
  console.log(`   ✅ ${INITIAL_BADGES.length} badges insérés`)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Seed terminé avec succès !')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Erreur seed:', err)
  process.exit(1)
})
