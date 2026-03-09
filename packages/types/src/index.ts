/**
 * @file Types TypeScript partagés — Quran Tracker
 * @description Tous les types utilisés par apps/web et apps/api
 */

// ─── Rôles utilisateurs ────────────────────────────────────
export type UserRole = 'super_admin' | 'sheikh' | 'student' | 'parent'

// ─── Statuts de mémorisation ───────────────────────────────
export type MemorizationStatus =
  | 'not_started'
  | 'in_progress'
  | 'memorized'

// ─── Types de révélation ───────────────────────────────────
export type RevelationType = 'meccan' | 'medinan'

// ─── Types de feed ─────────────────────────────────────────
export type FeedEventType =
  | 'surah_memorized'
  | 'surah_validated'
  | 'badge_earned'
  | 'milestone_reached'
  | 'streak_record'
  | 'group_joined'
  | 'announcement'

// ─── Types de notification ─────────────────────────────────
export type NotificationType =
  | 'revision_reminder'
  | 'validation_done'
  | 'badge_earned'
  | 'group_announcement'
  | 'new_member'

// ─── Utilisateur ───────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string | null
  createdAt: Date
}

// ─── Groupe ────────────────────────────────────────────────
export interface Group {
  id: string
  name: string
  description: string | null
  sheikhId: string
  inviteCode: string
  createdAt: Date
}

export interface GroupMember {
  userId: string
  groupId: string
  joinedAt: Date
  role: 'sheikh' | 'student' | 'parent'
}

// ─── Sourate ───────────────────────────────────────────────
export interface Surah {
  id: number
  number: number
  nameAr: string
  nameFr: string
  nameEn: string
  versesCount: number
  juzNumber: number
  hizbNumber: number
  revelationType: RevelationType
  startPage: number
  endPage: number
}

// ─── Progression de mémorisation ──────────────────────────
export interface MemorizationProgress {
  id: string
  userId: string
  surahId: number
  status: MemorizationStatus
  verseFrom: number | null
  verseTo: number | null
  lastRevisedAt: Date | null
  validatedBySheikhAt: Date | null
  sheikhNotes: string | null
  retentionScore: number
  nextReviewAt: Date | null
}

// ─── Session de révision ──────────────────────────────────
export interface RevisionSession {
  id: string
  userId: string
  surahId: number
  duration: number       // en minutes
  quality: number        // 0-5 (SM-2)
  createdAt: Date
}

// ─── Badge ────────────────────────────────────────────────
export interface Badge {
  id: string
  name: string
  nameAr: string
  description: string
  iconUrl: string
  condition: string      // JSON condition
  xpReward: number
}

export interface UserBadge {
  userId: string
  badgeId: string
  earnedAt: Date
}

// ─── Feed & Notifications ─────────────────────────────────
export interface FeedItem {
  id: string
  groupId: string
  userId: string
  type: FeedEventType
  content: Record<string, unknown>
  reactions: Record<string, string[]>   // { "mashallah": [userId, ...] }
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  payload: Record<string, unknown>
  readAt: Date | null
  createdAt: Date
}

// ─── Dashboard & Leaderboard ──────────────────────────────
export interface LeaderboardEntry {
  userId: string
  name: string
  avatar: string | null
  surahsMemorized: number
  versesMemorized: number
  currentStreak: number
  totalXp: number
  rank: number
}

export interface GroupStats {
  totalMembers: number
  activeMembers: number       // actifs sur 7 jours
  totalSurahsMemorized: number
  groupProgressPercent: number   // % vers le Khatm collectif
  averageStreak: number
}

// ─── API Response helpers ─────────────────────────────────
export interface ApiResponse<T> {
  data: T
  success: true
}

export interface ApiError {
  error: string
  message: string
  success: false
  statusCode: number
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// ─── Pagination ───────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
