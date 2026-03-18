/**
 * @file Interface Sheikh — Validation des sourates & demandes d'adhésion
 */
import type { Metadata } from 'next'
import ValidateClient from './validate-client'

export const metadata: Metadata = { title: 'Interface Sheikh — Quran Tracker' }

export default function ValidatePage() {
  return <ValidateClient />
}
