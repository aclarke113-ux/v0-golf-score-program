"use client"

import { useState } from "react"
import { updateRound } from "@/lib/supabase/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Unlock } from "lucide-react"

interface Round {
  id: string
  player_id: string
  total_score?: number
  submitted?: boolean
  completed?: boolean
  player?: { name: string }
  course?: { name: string }
  group?: { name: string; day: number }
  scores?: any[]
}

interface RoundsOverviewProps {
  rounds: Round[]
  onDataChange?: () => void
}

export function RoundsOverview({ rounds, onDataChange }: RoundsOverviewProps) {
  const [unlocking, setUnlocking] = useState<string | null>(null)

  const handleUnlock = async (roundId: string, playerName: string) => {
    if (!confirm(`Unlock round for ${playerName}? They will be able to edit their scores.`)) {
      return
    }

    setUnlocking(roundId)
    try {
      await updateRound(roundId, { submitted: false })
      alert(`Round unlocked for ${playerName}. They can now edit their scores.`)
      if (onDataChange) {
        onDataChange()
      }
    } catch (error) {
      console.error("[v0] Error unlocking round:", error)
      alert(`Failed to unlock round: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setUnlocking(null)
    }
  }

  const submittedRounds = rounds.filter((r) => r.submitted === true)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submitted Rounds</CardTitle>
        <CardDescription>View and unlock submitted rounds for editing</CardDescription>
      </CardHeader>
      <CardContent>
        {submittedRounds.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No rounds submitted yet</p>
        ) : (
          <div className="space-y-2">
            {submittedRounds.map((round) => {
              const totalScore =
                round.total_score ||
                (round.scores ? round.scores.reduce((sum: number, s: any) => sum + (s.strokes || 0), 0) : 0)
              const playerName = round.player?.name || "Unknown Player"
              const courseName = round.course?.name || "Unknown Course"
              const groupName = round.group?.name || "Unknown Group"
              const day = round.group?.day || 1

              return (
                <div key={round.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                  <div>
                    <p className="font-medium">{playerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {courseName} - {groupName} (Day {day})
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{totalScore}</p>
                      <p className="text-xs text-muted-foreground">strokes</p>
                    </div>
                    {round.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-600" />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlock(round.id, playerName)}
                      disabled={unlocking === round.id}
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      {unlocking === round.id ? "Unlocking..." : "Unlock"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
