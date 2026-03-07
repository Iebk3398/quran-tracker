/**
 * @file Utilitaires communs
 * @description Fonctions helpers partagées dans l'app Next.js
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Fusionne des classes Tailwind en évitant les conflits
 * Combine clsx + tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Formate un nombre avec séparateurs de milliers
 */
export function formatNumber(n: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale).format(n)
}

/**
 * Retourne les initiales d'un nom complet
 * @example getInitials('Mohamed Ali') → 'MA'
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Calcule le pourcentage de progression (0-100)
 */
export function calcProgress(done: number, total: number): number {
  if (total === 0) return 0
  return Math.round((done / total) * 100)
}

/**
 * Obtient la couleur de statut de mémorisation
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    not_started: 'bg-stone-200 dark:bg-stone-700',
    in_progress: 'bg-amber-400 dark:bg-amber-500',
    memorized: 'bg-emerald-500 dark:bg-emerald-400',
    consolidated: 'bg-blue-500 dark:bg-blue-400',
  }
  return colors[status] ?? colors['not_started'] ?? 'bg-stone-200'
}

/**
 * Tronque un texte avec ellipse
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}…`
}

/**
 * Génère un code d'invitation aléatoire (6 caractères)
 */
export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * Convertit un niveau XP en numéro de niveau (1-99)
 */
export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

/**
 * XP nécessaire pour le niveau suivant
 */
export function xpForNextLevel(currentXp: number): number {
  const currentLevel = xpToLevel(currentXp)
  return Math.pow(currentLevel, 2) * 100
}
