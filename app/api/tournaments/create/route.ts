import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const generateId = () => crypto.randomUUID()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, password, adminPassword, code, scoringType, numberOfDays, hasPlayAroundDay, hasCalcutta, hasPick3 } =
      body

    console.log("[v0] Creating tournament...")
    console.log(
      "[v0] Environment check - SUPABASE_URL:",
      process.env.NEXT_PUBLIC_SUPABASE_URL ? "Available" : "Missing",
    )
    console.log(
      "[v0] Environment check - SERVICE_ROLE_KEY:",
      process.env.SUPABASE_SERVICE_ROLE_KEY ? "Available" : "Missing",
    )

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        id: generateId(),
        name,
        password,
        admin_password: adminPassword,
        code,
        scoring_type: scoringType || "stableford",
        number_of_days: numberOfDays || 2,
        has_play_around_day: hasPlayAroundDay || false,
        has_calcutta: hasCalcutta || false,
        has_pick3: hasPick3 || false,
        allow_spectator_chat: true,
        allow_spectator_feed: true,
        allow_spectator_betting: true,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating tournament:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Tournament created successfully:", data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in tournament creation API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
