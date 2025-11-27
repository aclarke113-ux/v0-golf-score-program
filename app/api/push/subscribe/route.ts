import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { subscription, userId, tournamentId } = await request.json()

    const supabase = await createClient()

    // Store subscription in database
    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      tournament_id: tournamentId,
      subscription: subscription,
      endpoint: subscription.endpoint,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("[v0] Error storing push subscription:", error)
      return NextResponse.json({ error: "Failed to store subscription" }, { status: 500 })
    }

    console.log("[v0] Push subscription stored successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in push subscribe:", error)
    return NextResponse.json({ error: "Failed to process subscription" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { subscription } = await request.json()

    const supabase = await createClient()

    // Remove subscription from database
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint)

    if (error) {
      console.error("[v0] Error deleting push subscription:", error)
      return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 })
    }

    console.log("[v0] Push subscription deleted successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in push unsubscribe:", error)
    return NextResponse.json({ error: "Failed to process unsubscription" }, { status: 500 })
  }
}
