import { redirect } from 'next/navigation'

/**
 * @file Page racine
 * @description Redirige vers la page de connexion
 */
export default function RootPage() {
  redirect('/login')
}
