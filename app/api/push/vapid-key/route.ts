import { NextResponse } from "next/server"

export async function GET() {
  // VAPID public key - this would normally be stored securely
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

  if (!publicKey) {
    return NextResponse.json({ error: "VAPID key not configured" }, { status: 500 })
  }

  return NextResponse.json({ publicKey })
}
