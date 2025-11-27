import { createPost, createNotification, getPlayersByTournament } from "@/lib/supabase/db"
import { sendPushNotification } from "@/lib/notifications/push-sender"

export interface Achievement {
  type:
    | "hole-in-one"
    | "eagle"
    | "birdie"
    | "par-streak"
    | "birdie-streak"
    | "closest-to-pin"
    | "longest-drive"
    | "straightest-drive"
  holeNumber: number
  streakCount?: number
}

export async function detectAchievements(
  holes: Array<{ holeNumber: number; strokes: number; par: number }>,
  previousHoles: Array<{ holeNumber: number; strokes: number; par: number }>,
): Promise<Achievement[]> {
  const achievements: Achievement[] = []
  const latestHole = holes[holes.length - 1]

  if (!latestHole) return achievements

  const scoreDiff = latestHole.strokes - latestHole.par

  console.log("[v0] Detecting achievements for hole:", {
    holeNumber: latestHole.holeNumber,
    strokes: latestHole.strokes,
    par: latestHole.par,
    scoreDiff,
  })

  // Hole-in-one (ace)
  if (latestHole.strokes === 1) {
    console.log("[v0] HOLE-IN-ONE detected!")
    achievements.push({
      type: "hole-in-one",
      holeNumber: latestHole.holeNumber,
    })
  }
  // Eagle (-2 or better, but not hole-in-one)
  else if (scoreDiff <= -2) {
    console.log("[v0] EAGLE detected!")
    achievements.push({
      type: "eagle",
      holeNumber: latestHole.holeNumber,
    })
  }
  // Birdie (-1)
  else if (scoreDiff === -1) {
    console.log("[v0] BIRDIE detected!")
    achievements.push({
      type: "birdie",
      holeNumber: latestHole.holeNumber,
    })
  }

  // Check for par streaks (3+ pars in a row)
  if (scoreDiff === 0) {
    const recentHoles = [...previousHoles, latestHole].slice(-5) // Check last 5 holes
    let parStreak = 0
    for (let i = recentHoles.length - 1; i >= 0; i--) {
      if (recentHoles[i].strokes - recentHoles[i].par === 0) {
        parStreak++
      } else {
        break
      }
    }
    if (parStreak >= 3) {
      console.log("[v0] PAR STREAK detected:", parStreak)
      achievements.push({
        type: "par-streak",
        holeNumber: latestHole.holeNumber,
        streakCount: parStreak,
      })
    }
  }

  // Check for birdie streaks (2+ birdies in a row)
  if (scoreDiff === -1) {
    const recentHoles = [...previousHoles, latestHole].slice(-5)
    let birdieStreak = 0
    for (let i = recentHoles.length - 1; i >= 0; i--) {
      if (recentHoles[i].strokes - recentHoles[i].par === -1) {
        birdieStreak++
      } else {
        break
      }
    }
    if (birdieStreak >= 2) {
      console.log("[v0] BIRDIE STREAK detected:", birdieStreak)
      achievements.push({
        type: "birdie-streak",
        holeNumber: latestHole.holeNumber,
        streakCount: birdieStreak,
      })
    }
  }

  console.log("[v0] Total achievements detected:", achievements.length)
  return achievements
}

export async function postAchievement(
  achievement: Achievement,
  playerName: string,
  tournamentId: string,
): Promise<void> {
  let content = ""
  let title = ""

  switch (achievement.type) {
    case "hole-in-one":
      content = `🎉 Incredible! ${playerName} just scored a HOLE-IN-ONE on hole ${achievement.holeNumber}! What an amazing shot! 🏌️‍♂️⛳`
      title = "Hole-in-One!"
      break
    case "eagle":
      content = `🦅 Wow! ${playerName} just scored an EAGLE on hole ${achievement.holeNumber}! Outstanding play! 🏌️‍♂️`
      title = "Eagle!"
      break
    case "birdie":
      content = `🐦 Nice! ${playerName} just scored a BIRDIE on hole ${achievement.holeNumber}! Great shot! 🏌️‍♂️`
      title = "Birdie!"
      break
    case "par-streak":
      content = `🔥 ${playerName} is ON FIRE! ${achievement.streakCount} pars in a row! Keep it going! 🏌️‍♂️🔥`
      title = "On Fire!"
      break
    case "birdie-streak":
      content = `🔥🐦 ${playerName} is UNSTOPPABLE! ${achievement.streakCount} birdies in a row! Incredible! 🏌️‍♂️🔥`
      title = "Birdie Streak!"
      break
  }

  console.log("[v0] Posting achievement:", {
    type: achievement.type,
    playerName,
    tournamentId,
    content,
  })

  try {
    console.log("[v0] Creating achievement post in database...")
    const post = await createPost({
      userId: null,
      userName: "Aussie Slice",
      caption: content,
      mediaUrl: "",
      mediaType: "text",
      tournamentId,
    })

    console.log("[v0] Achievement post created successfully with ID:", post?.id)

    const players = await getPlayersByTournament(tournamentId)
    console.log("[v0] Notifying", players.length, "players")

    for (const player of players) {
      await createNotification({
        tournamentId,
        playerId: player.id,
        type: achievement.type === "par-streak" || achievement.type === "birdie-streak" ? "post" : achievement.type,
        title,
        message: content,
        read: false,
      })
    }

    await sendPushNotification({
      tournamentId,
      title,
      message: content,
    })

    console.log("[v0] Notifications sent successfully")
  } catch (error) {
    console.error("[v0] Error posting achievement:", error)
    console.error("[v0] Achievement posting error details:", {
      type: achievement.type,
      playerName,
      tournamentId,
      errorMessage: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function checkAndPostCompetitionAchievement(
  competitionType: "closest-to-pin" | "longest-drive" | "straightest-drive",
  playerName: string,
  tournamentId: string,
  holeNumber: number,
): Promise<void> {
  let content = ""
  let title = ""

  switch (competitionType) {
    case "closest-to-pin":
      content = `🎯 Amazing! ${playerName} claimed the Closest to Pin on hole ${holeNumber}! What precision! 🏌️‍♂️`
      title = "Closest to Pin!"
      break
    case "longest-drive":
      content = `💪 Wow! ${playerName} claimed the Longest Drive on hole ${holeNumber}! What power! 🏌️‍♂️`
      title = "Longest Drive!"
      break
    case "straightest-drive":
      content = `🎯 Perfect! ${playerName} claimed the Straightest Drive on hole ${holeNumber}! What accuracy! 🏌️‍♂️`
      title = "Straightest Drive!"
      break
  }

  console.log("[v0] Posting competition achievement:", {
    type: competitionType,
    playerName,
    tournamentId,
    holeNumber,
    content,
  })

  try {
    console.log("[v0] Creating competition achievement post in database...")
    const post = await createPost({
      userId: null,
      userName: "Aussie Slice",
      caption: content,
      mediaUrl: "",
      mediaType: "text",
      tournamentId,
    })

    console.log("[v0] Competition achievement post created successfully with ID:", post?.id)

    const players = await getPlayersByTournament(tournamentId)
    console.log("[v0] Notifying", players.length, "players")

    for (const player of players) {
      await createNotification({
        tournamentId,
        playerId: player.id,
        type: "post",
        title,
        message: content,
        read: false,
      })
    }

    await sendPushNotification({
      tournamentId,
      title,
      message: content,
    })

    console.log("[v0] Competition notifications sent successfully")
  } catch (error) {
    console.error("[v0] Error posting competition achievement:", error)
    console.error("[v0] Competition achievement posting error details:", {
      type: competitionType,
      playerName,
      tournamentId,
      holeNumber,
      errorMessage: error instanceof Error ? error.message : String(error),
    })
  }
}
