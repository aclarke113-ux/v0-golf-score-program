import { createClient } from "@supabase/supabase-js"
import { detectAchievements } from "../lib/achievements"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateAchievementPosts() {
  console.log("[v0] Starting achievement post generation...")

  // Get the current tournament (The Paxton)
  const { data: tournament } = await supabase.from("tournaments").select("*").eq("code", "E7XT2E").single()

  if (!tournament) {
    console.log("[v0] Tournament not found")
    return
  }

  console.log(`[v0] Found tournament: ${tournament.name}`)

  // Get all players in the tournament
  const { data: players } = await supabase.from("players").select("*").eq("tournament_id", tournament.id)

  if (!players) {
    console.log("[v0] No players found")
    return
  }

  console.log(`[v0] Found ${players.length} players`)

  // Get the course for the tournament
  const { data: course } = await supabase.from("courses").select("*").eq("tournament_id", tournament.id).single()

  if (!course) {
    console.log("[v0] Course not found")
    return
  }

  console.log(`[v0] Found course: ${course.name}`)

  // Get all rounds from the tournament
  const { data: rounds } = await supabase
    .from("rounds")
    .select("*, players!inner(*)")
    .eq("players.tournament_id", tournament.id)

  if (!rounds || rounds.length === 0) {
    console.log("[v0] No rounds found")
    return
  }

  console.log(`[v0] Found ${rounds.length} rounds to analyze`)

  let totalAchievements = 0

  // Analyze each round for achievements
  for (const round of rounds) {
    const player = round.players
    if (!player || !round.scores) continue

    console.log(`[v0] Analyzing round for ${player.name}...`)

    // Convert scores to the format expected by detectAchievements
    const holeScores: { [holeNumber: number]: string } = {}
    const holes = round.scores as any[]

    holes.forEach((hole: any) => {
      if (hole.holeNumber && hole.strokes) {
        holeScores[hole.holeNumber] = hole.strokes.toString()
      }
    })

    // Detect achievements for this round
    const achievements = detectAchievements(holeScores, course.holes, player.handicap || 0)

    console.log(`[v0] Found ${achievements.length} achievements for ${player.name}`)

    // Create posts for each achievement
    for (const achievement of achievements) {
      // Check if a post already exists for this achievement
      const { data: existingPosts } = await supabase
        .from("posts")
        .select("*")
        .eq("tournament_id", tournament.id)
        .eq("player_id", player.id)
        .ilike("content", `%${achievement.title}%`)

      if (existingPosts && existingPosts.length > 0) {
        console.log(`[v0] Post already exists for ${achievement.title}, skipping...`)
        continue
      }

      // Create the post
      const { error: postError } = await supabase.from("posts").insert({
        tournament_id: tournament.id,
        player_id: player.id,
        player_name: "Aussie Golf",
        content: achievement.message,
        liked_by: [],
        timestamp: new Date().toISOString(),
      })

      if (postError) {
        console.error(`[v0] Error creating post:`, postError)
        continue
      }

      console.log(`[v0] Created post: ${achievement.title}`)
      totalAchievements++

      // Create notifications for all players
      for (const notifyPlayer of players) {
        if (notifyPlayer.id === player.id) continue // Don't notify the achiever

        await supabase.from("notifications").insert({
          tournament_id: tournament.id,
          player_id: notifyPlayer.id,
          type: "achievement",
          title: achievement.title,
          message: achievement.message,
          read: false,
          timestamp: new Date().toISOString(),
        })
      }

      console.log(`[v0] Created notifications for ${players.length - 1} players`)
    }
  }

  console.log(`[v0] ✅ Complete! Generated ${totalAchievements} achievement posts`)
}

generateAchievementPosts()
