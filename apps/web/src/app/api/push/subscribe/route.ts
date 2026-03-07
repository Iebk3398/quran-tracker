/**
 * @file Route API — Souscription aux Push Notifications
 * @description Enregistre la subscription Web Push d'un utilisateur
 */
import { type NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/push/subscribe
 * Enregistre une subscription Web Push pour l'utilisateur connecté
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const subscription = await request.json() as PushSubscriptionJSON

    if (!subscription.endpoint) {
      return NextResponse.json(
        { error: 'Subscription invalide' },
        { status: 400 }
      )
    }

    // TODO: Sauvegarder la subscription en base de données
    // liée à l'utilisateur authentifié (via Better Auth session)
    // await db.insert(pushSubscriptions).values({
    //   userId: session.user.id,
    //   endpoint: subscription.endpoint,
    //   p256dh: subscription.keys?.p256dh,
    //   auth: subscription.keys?.auth,
    // })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
