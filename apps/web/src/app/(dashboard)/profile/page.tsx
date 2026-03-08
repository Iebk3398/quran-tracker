/**
 * @file Page Profil Individuel
 * @description Progression, heatmap, sourates — données live depuis l'API
 */
import type { Metadata } from 'next'
import { ProfileClient } from './profile-client'

export const metadata: Metadata = { title: 'Mon Profil' }

export default function ProfilePage() {
  return <ProfileClient />
}
