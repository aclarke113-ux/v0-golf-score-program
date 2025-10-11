"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Notification } from "@/lib/types"

type NotificationsProps = {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onClearAll: () => void
}

export function Notifications({ notifications, onMarkAsRead, onClearAll }: NotificationsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !n.read).length

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  // Show browser notification for new notifications
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      const latestUnread = notifications.filter((n) => !n.read).slice(-1)[0]
      if (latestUnread) {
        new Notification(latestUnread.title, {
          body: latestUnread.message,
          icon: "/icon-192.jpg",
        })
      }
    }
  }, [notifications])

  return (
    <div className="relative">
      <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto z-50 shadow-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={onClearAll}>
                  Clear All
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="divide-y">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${!notification.read ? "bg-blue-50" : ""}`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
