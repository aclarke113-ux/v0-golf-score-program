import { createPost, createNotification } from "./supabase/db"

export type Achievement = {
  id: string
  title: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "eagle",
    title: "Eagle Eye",
    description: "Scored an eagle (2 under par)",
    icon: "🦅",
  },
  {
    id: "birdie",
    title: "Birdie Hunter",
    description: "Scored a birdie (1 under par)",
    icon: "🐦",
  },
  {
    id: "par",
    title: "Par Master",
    description: "Scored par on a hole",
    icon: "⭐",
  },
  {
    id: "hole-in-one",
    title: "Hole in One!",
    description: "Scored a hole in one",
    icon: "🎯",
  },
  {
    id: "albatross",
    title: "Albatross",
    description: "Scored an albatross (3 under par)",
    icon: "🦢",
  },
]

export function checkAchievements(strokes: number, par: number, holeNumber: number): Achievement[] {
  const achievements: Achievement[] = []
  const scoreToPar = strokes - par

  // Hole in one (only on par 3+)
  if (strokes === 1 && par >= 3) {
    achievements.push(ACHIEVEMENTS.find((a) => a.id === "hole-in-one")!)
  }

  // Albatross (3 under par)
  if (scoreToPar === -3) {
    achievements.push(ACHIEVEMENTS.find((a) => a.id === "albatross")!)
  }

  // Eagle (2 under par)
  if (scoreToPar === -2) {
    achievements.push(ACHIEVEMENTS.find((a) => a.id === "eagle")!)
  }

  // Birdie (1 under par)
  if (scoreToPar === -1) {
    achievements.push(ACHIEVEMENTS.find((a) => a.id === "birdie")!)
  }

  // Par
  if (scoreToPar === 0) {
    achievements.push(ACHIEVEMENTS.find((a) => a.id === "par")!)
  }

  return achievements.filter(Boolean)
}

export async function postAchievement(
  achievement: Achievement,
  playerName: string,
  holeNumber: number,
  tournamentId: string,
  playerId: string,
) {
  try {
    const caption = `${playerName} just earned "${achievement.title}" on hole ${holeNumber}! ${achievement.icon} ${achievement.description}`

    await createPost({
      tournamentId,
      userId: null as any, // System post, no user ID
      userName: "Aussie Golf",
      caption,
      mediaUrl: null as any,
      mediaType: null as any,
    })

    // Create notification for the player
    await createNotification({
      playerId,
      tournamentId,
      type: "achievement",
      title: achievement.title,
      message: `You earned "${achievement.title}" on hole ${holeNumber}!`,
    })
  } catch (error) {
    console.error("[v0] Error posting achievement:", error)
  }
}
