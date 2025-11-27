"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function NotificationSetupBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the banner
    const isDismissed = localStorage.getItem("notification-banner-dismissed")
    if (isDismissed) {
      setDismissed(true)
      return
    }

    // Check if notifications are supported and not granted
    if ("Notification" in window && Notification.permission === "default") {
      setShow(true)
    }
  }, [])

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setShow(false)
        localStorage.setItem("notification-banner-dismissed", "true")
      }
    } catch (error) {
      console.error("[v0] Error requesting notification permission:", error)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem("notification-banner-dismissed", "true")
    setDismissed(true)
  }

  if (!show || dismissed) return null

  return (
    <Card className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4 shadow-lg border-2 border-blue-500">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Enable Notifications</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Get notified when players complete rounds, send messages, or achieve special scores like eagles and
              birdies!
            </p>
            <div className="flex gap-2">
              <Button onClick={handleEnable} size="sm" className="bg-blue-600 hover:bg-blue-700">
                Enable
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="outline">
                Maybe Later
              </Button>
            </div>
          </div>
          <Button onClick={handleDismiss} size="icon" variant="ghost" className="flex-shrink-0 h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
