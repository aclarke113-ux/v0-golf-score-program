"use client"

import { useEffect, useState } from "react"
import { X, MessageCircle, Gavel, Trophy, ImageIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type BannerNotification = {
  id: string
  type: "chat" | "bid" | "score" | "post"
  title: string
  message: string
  timestamp: number
}

type NotificationBannerProps = {
  notifications: BannerNotification[]
  onDismiss: (id: string) => void
}

export function NotificationBanner({ notifications, onDismiss }: NotificationBannerProps) {
  const [visible, setVisible] = useState<string[]>([])

  useEffect(() => {
    notifications.forEach((notification) => {
      if (!visible.includes(notification.id)) {
        setVisible((prev) => [...prev, notification.id])

        setTimeout(() => {
          setVisible((prev) => prev.filter((id) => id !== notification.id))
          onDismiss(notification.id)
        }, 10000)
      }
    })
  }, [notifications, visible, onDismiss])

  const getIcon = (type: BannerNotification["type"]) => {
    switch (type) {
      case "chat":
        return <MessageCircle className="w-5 h-5" />
      case "bid":
        return <Gavel className="w-5 h-5" />
      case "score":
        return <Trophy className="w-5 h-5" />
      case "post":
        return <ImageIcon className="w-5 h-5" />
    }
  }

  const getColor = (type: BannerNotification["type"]) => {
    switch (type) {
      case "chat":
        return "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100"
      case "bid":
        return "border-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-100"
      case "score":
        return "border-green-500 bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100"
      case "post":
        return "border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-900 dark:text-purple-100"
    }
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 space-y-2">
      {notifications
        .filter((n) => visible.includes(n.id))
        .map((notification) => (
          <Card
            key={notification.id}
            className={`border-2 shadow-lg animate-in slide-in-from-top-5 ${getColor(notification.type)}`}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{notification.title}</p>
                <p className="text-sm opacity-90 truncate">{notification.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-6 w-6 p-0"
                onClick={() => {
                  setVisible((prev) => prev.filter((id) => id !== notification.id))
                  onDismiss(notification.id)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
    </div>
  )
}
