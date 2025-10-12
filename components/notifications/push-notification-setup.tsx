"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"
import { pushManager } from "@/lib/notifications/push-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function PushNotificationSetup() {
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

    const subscription = await pushManager.getSubscription()
    setIsSubscribed(!!subscription)
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    try {
      const initialized = await pushManager.initialize()
      if (!initialized) {
        alert("Push notifications are not supported in your browser")
        return
      }

      const perm = await pushManager.requestPermission()
      setPermission(perm)

      if (perm !== "granted") {
        alert("Please allow notifications to receive updates")
        return
      }

      const subscription = await pushManager.subscribe()
      if (!subscription) {
        alert("Failed to subscribe to notifications")
        return
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (response.ok) {
        setIsSubscribed(true)
        alert(
          "Push notifications enabled! You'll receive updates for feed posts, achievements, tee times, and chat messages.",
        )
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
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        })

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
          Get notifications for feed posts, achievements, tee times, and chat messages. Everything is set up
          automatically - just click enable!
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
              You'll receive notifications for feed posts, achievements, tee times, and chat messages.
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
