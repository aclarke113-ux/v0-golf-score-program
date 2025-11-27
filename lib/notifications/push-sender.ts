export async function sendPushNotification(params: {
  tournamentId: string
  title: string
  message: string
  userId?: string
  excludeUserId?: string
}) {
  try {
    const response = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return true
  } catch (error) {
    return false
  }
}
