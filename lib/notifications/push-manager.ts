// Push Notification Manager
export class PushNotificationManager {
  private static instance: PushNotificationManager
  private registration: ServiceWorkerRegistration | null = null
  private initializationAttempted = false
  private initializationSuccessful = false

  private constructor() {}

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager()
    }
    return PushNotificationManager.instance
  }

  async initialize(): Promise<boolean> {
    if (this.initializationAttempted) {
      return this.initializationSuccessful
    }

    this.initializationAttempted = true

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[v0] Push notifications not supported")
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register("/service-worker.js")
      console.log("[v0] Service Worker registered:", this.registration)
      this.initializationSuccessful = true
      return true
    } catch (error) {
      console.log("[v0] Service Worker registration failed (this is normal in preview environments):", error)
      this.initializationSuccessful = false
      return false
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      console.log("[v0] Notifications not supported")
      return "denied"
    }

    const permission = await Notification.requestPermission()
    console.log("[v0] Notification permission:", permission)
    return permission
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!this.initializationSuccessful) {
      const initialized = await this.initialize()
      if (!initialized) {
        console.log("[v0] Cannot subscribe: Service Worker not available")
        return null
      }
    }

    if (!this.registration) {
      return null
    }

    try {
      const response = await fetch("/api/push/vapid-key")
      const { publicKey } = await response.json()

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey),
      })

      console.log("[v0] Push subscription created:", subscription)
      return subscription
    } catch (error) {
      console.error("[v0] Failed to subscribe to push:", error)
      return null
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        console.log("[v0] Unsubscribed from push notifications")
        return true
      }
      return false
    } catch (error) {
      console.error("[v0] Failed to unsubscribe:", error)
      return false
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.initializationSuccessful) {
      const initialized = await this.initialize()
      if (!initialized) {
        return null
      }
    }

    if (!this.registration) {
      return null
    }

    try {
      return await this.registration.pushManager.getSubscription()
    } catch (error) {
      console.log("[v0] Failed to get subscription:", error)
      return null
    }
  }

  // Helper to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Show local notification (fallback)
  async showLocalNotification(title: string, options: NotificationOptions): Promise<void> {
    if (!("Notification" in window)) {
      return
    }

    if (Notification.permission === "granted") {
      new Notification(title, options)
    }
  }
}

export const pushManager = PushNotificationManager.getInstance()
