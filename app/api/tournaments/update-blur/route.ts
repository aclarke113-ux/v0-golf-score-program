import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { tournamentId, blurTop5 } = await request.json()

    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Update the tournament's blur_top_5 setting
    const { error } = await supabase.from("tournaments").update({ blur_top_5: blurTop5 }).eq("id", tournamentId)

    if (error) {
      console.error("[v0] Error updating blur_top_5:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Successfully updated blur_top_5 to:", blurTop5, "for tournament:", tournamentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in update-blur route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
