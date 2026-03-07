'use client'
/**
 * @file Hook Push Notifications
 * @description Gestion des notifications push Web (Service Worker + VAPID)
 */
import { useState, useEffect, useCallback } from 'react'

interface PushNotificationState {
  isSupported: boolean
  isSubscribed: boolean
  permission: NotificationPermission
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

/**
 * Hook pour gérer les notifications push PWA
 * Utilise l'API Web Push avec VAPID
 */
export function usePushNotifications(): PushNotificationState {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch {
      setIsSubscribed(false)
    }
  }

  const subscribe = useCallback(async () => {
    if (!isSupported) return

    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)

      if (permission !== 'granted') return

      const registration = await navigator.serviceWorker.ready

      const vapidKey = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY']
      if (!vapidKey) {
        console.warn('VAPID public key not configured')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // Envoyer la subscription au serveur
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      setIsSubscribed(true)
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Notifier le serveur
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      setIsSubscribed(false)
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
    }
  }, [isSupported])

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  }
}

/**
 * Convertit une clé VAPID base64url en Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
