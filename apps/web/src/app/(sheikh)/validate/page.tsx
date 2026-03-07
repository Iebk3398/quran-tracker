/**
 * @file Interface Sheikh — Validation des sourates
 */
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Validation Sheikh' }

export default function ValidatePage() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Validation — Interface Sheikh</h1>
        <p className="text-muted-foreground">Valider les sourates mémorisées par vos élèves</p>
      </div>

      {/* Liste des demandes de validation */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold mb-4">✅ En attente de validation</h2>
        <p className="text-muted-foreground text-sm text-center py-8">
          Aucune demande de validation en attente
        </p>
      </div>

      {/* Historique des validations */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold mb-4">📋 Historique des validations</h2>
        <p className="text-muted-foreground text-sm text-center py-8">
          Aucune validation effectuée
        </p>
      </div>
    </div>
  )
}
