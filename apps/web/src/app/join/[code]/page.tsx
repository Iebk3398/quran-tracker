/**
 * @file Page d'invitation groupe — /join/[code]
 * @description
 *   Page publique accessible sans authentification.
 *   Affiche l'aperçu du groupe et permet d'envoyer une demande d'adhésion.
 */
import type { Metadata } from 'next'
import JoinClient from './join-client'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  return {
    title: `Rejoindre un groupe — Quran Tracker`,
    description: `Vous avez été invité à rejoindre un groupe sur Quran Tracker.`,
  }
}

/**
 * Wrapper serveur — passe le code à JoinClient.
 */
export default async function JoinPage({ params }: Props) {
  const { code } = await params
  return <JoinClient code={code.toUpperCase()} />
}
