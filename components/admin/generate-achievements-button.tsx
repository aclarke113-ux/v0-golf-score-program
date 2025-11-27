"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { detectAchievements, postAchievement } from "@/lib/achievements"
import type { Round, Player, Course, Tournament } from "@/lib/types"
import { Sparkles } from "lucide-react"

interface GenerateAchievementsButtonProps {
  tournament: Tournament
  rounds: Round[]
  players: Player[]
  courses: Course[]
}

export function GenerateAchievementsButton({ tournament, rounds, players, courses }: GenerateAchievementsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCount, setGeneratedCount] = useState(0)

  const handleGenerateAchievements = async () => {
    console.log("[v0] Starting achievement generation for", rounds.length, "rounds")
    setIsGenerating(true)
    setGeneratedCount(0)

    try {
      let count = 0

      // Process each round
      for (const round of rounds) {
        const player = players.find((p) => p.id === round.playerId)
        if (!player) {
          console.log("[v0] Player not found for round:", round.id)
          continue
        }

        // Skip rounds without holes data
        if (!round.holes || round.holes.length === 0) {
          console.log("[v0] Round has no holes data:", round.id)
          continue
        }

        console.log("[v0] Processing round for player:", player.name, "with", round.holes.length, "holes")

        // Find the course for this round
        const course = courses.find((c) => c.id === round.courseId) || courses[0]
        if (!course) {
          console.log("[v0] Course not found for round:", round.id)
          continue
        }

        for (let i = 0; i < round.holes.length; i++) {
          const hole = round.holes[i]
          const courseHole = course.holes.find((h) => h.holeNumber === hole.holeNumber)

          if (!courseHole) continue

          // Prepare current hole data
          const currentHoleData = {
            holeNumber: hole.holeNumber,
            strokes: hole.strokes,
            par: courseHole.par,
          }

          // Prepare previous holes data
          const previousHolesData = round.holes.slice(0, i).map((h) => {
            const ch = course.holes.find((courseHole) => courseHole.holeNumber === h.holeNumber)
            return {
              holeNumber: h.holeNumber,
              strokes: h.strokes,
              par: ch?.par || 4,
            }
          })

          // Detect achievements for this hole
          const achievements = await detectAchievements([currentHoleData], previousHolesData)

          // Post each achievement
          for (const achievement of achievements) {
            console.log("[v0] Found achievement:", achievement.type, "for", player.name, "on hole", hole.holeNumber)
            await postAchievement(achievement, player.name, tournament.id)
            count++
            setGeneratedCount(count)
          }
        }
      }

      console.log("[v0] Achievement generation complete. Total:", count)
      alert(`Successfully generated ${count} achievement posts!`)
    } catch (error) {
      console.error("[v0] Error generating achievements:", error)
      alert("Failed to generate achievements. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleGenerateAchievements}
      disabled={isGenerating}
      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
      size="lg"
    >
      <Sparkles className="h-5 w-5" />
      {isGenerating ? `Generating... (${generatedCount})` : "Generate Achievement Posts from Today's Scores"}
    </Button>
  )
}
