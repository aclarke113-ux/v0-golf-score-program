// Service Worker for Push Notifications
self.addEventListener("install", (event) => {
  console.log("[v0] Service Worker installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[v0] Service Worker activating...")
  event.waitUntil(self.clients.claim())
})

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[v0] Push notification received:", event)

  if (!event.data) {
    console.log("[v0] No data in push event")
    return
  }

  const data = event.data.json()
  console.log("[v0] Push data:", data)

  const options = {
    body: data.message || data.body,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "golf-notification",
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || "/",
      competitionId: data.competitionId,
    },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[v0] Notification clicked:", event)
  event.notification.close()

  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    }),
  )
})
