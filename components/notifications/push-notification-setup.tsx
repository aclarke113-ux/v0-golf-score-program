"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"
import { pushManager } from "@/lib/notifications/push-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function PushNotificationSetup({ userId, tournamentId }: { userId: string; tournamentId: string }) {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkNotificationStatus()
  }, [])

  const checkNotificationStatus = async () => {
    if (!("Notification" in window)) {
      return
    }

    setPermission(Notification.permission)

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          const subscription = await registration.pushManager.getSubscription()
          setIsSubscribed(!!subscription)
        }
      }
    } catch (error) {
      // Silently fail - service worker might not be available in preview environment
      console.log("[v0] Could not check subscription status:", error)
    }
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    try {
      // Initialize service worker
      const initialized = await pushManager.initialize()
      if (!initialized) {
        alert("Push notifications are not supported in your browser")
        return
      }

      // Request permission
      const perm = await pushManager.requestPermission()
      setPermission(perm)

      if (perm !== "granted") {
        alert("Please allow notifications to receive updates")
        return
      }

      // Subscribe to push
      const subscription = await pushManager.subscribe()
      if (!subscription) {
        alert("Failed to subscribe to notifications")
        return
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId,
          tournamentId,
        }),
      })

      if (response.ok) {
        setIsSubscribed(true)
        alert("Push notifications enabled! You'll receive updates for chat messages and achievements.")
      } else {
        alert("Failed to save notification settings")
      }
    } catch (error) {
      console.error("[v0] Error enabling notifications:", error)
      alert("Failed to enable notifications")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)
    try {
      const subscription = await pushManager.getSubscription()
      if (subscription) {
        // Remove from server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        })

        // Unsubscribe locally
        await pushManager.unsubscribe()
        setIsSubscribed(false)
        alert("Push notifications disabled")
      }
    } catch (error) {
      console.error("[v0] Error disabling notifications:", error)
      alert("Failed to disable notifications")
    } finally {
      setIsLoading(false)
    }
  }

  if (!("Notification" in window)) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get lock screen and banner notifications for new messages and tee times. Everything is set up automatically -
          just click enable!
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permission === "denied" ? (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        ) : isSubscribed ? (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Push notifications enabled</p>
            <p className="text-xs text-muted-foreground">
              You'll receive notifications on your lock screen for new chat messages and upcoming tee times.
            </p>
            <Button variant="outline" size="sm" onClick={handleDisableNotifications} disabled={isLoading}>
              <BellOff className="h-4 w-4 mr-2" />
              Disable Notifications
            </Button>
          </div>
        ) : (
          <Button onClick={handleEnableNotifications} disabled={isLoading}>
            <Bell className="h-4 w-4 mr-2" />
            Enable Push Notifications
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
