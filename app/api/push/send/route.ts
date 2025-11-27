import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { tournamentId, title, message, userId, excludeUserId } = await request.json()

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log("[v0] Push notifications not configured (missing VAPID keys)")
      return NextResponse.json({ success: true, sent: 0, message: "Push notifications not configured" })
    }

    const webpush = (await import("web-push")).default

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      "mailto:support@aussiegolf.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )

    const supabase = await createClient()

    let query = supabase.from("push_subscriptions").select("*")

    // Optionally filter to specific user or exclude a user
    if (userId) {
      query = query.eq("user_id", userId)
    } else if (excludeUserId) {
      query = query.neq("user_id", excludeUserId)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error("[v0] Error fetching push subscriptions:", error)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[v0] No push subscriptions found")
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Send push notifications
    const payload = JSON.stringify({
      title,
      message,
      body: message,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      url: "/",
    })

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        console.log("[v0] Push notification sent to:", sub.user_id)
        return { success: true }
      } catch (error: any) {
        console.error("[v0] Error sending push notification:", error)
        // If subscription is invalid, remove it
        if (error.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id)
        }
        return { success: false }
      }
    })

    await Promise.all(sendPromises)

    return NextResponse.json({ success: true, sent: subscriptions.length })
  } catch (error) {
    console.error("[v0] Error in push send:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}
