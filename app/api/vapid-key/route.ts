import { NextResponse } from "next/server"

export async function GET() {
  // Return the public VAPID key for push notification subscriptions
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  if (!vapidPublicKey) {
    return NextResponse.json({ error: "VAPID key not configured" }, { status: 500 })
  }

  return NextResponse.json({ publicKey: vapidPublicKey })
}
