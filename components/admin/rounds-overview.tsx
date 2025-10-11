"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock } from "lucide-react"

interface Round {
  id: string
  total_score: number
  is_complete: boolean
  player: { name: string }
  course: { name: string }
  group: { name: string; day: number }
}

export function RoundsOverview({ competitionId }: { competitionId: string }) {
  const supabase = getSupabaseBrowserClient()
  const [rounds, setRounds] = useState<Round[]>([])

  useEffect(() => {
    loadRounds()
  }, [competitionId])

  const loadRounds = async () => {
    const { data } = await supabase
      .from("rounds")
      .select(
        `
        *,
        player:players(name),
        course:courses(name),
        group:groups(name, day)
      `,
      )
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: false })

    if (data) setRounds(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rounds Overview</CardTitle>
        <CardDescription>View all submitted rounds</CardDescription>
      </CardHeader>
      <CardContent>
        {rounds.length === 0 ? (
          <p className="py-8 text-center text-gray-600">No rounds submitted yet</p>
        ) : (
          <div className="space-y-2">
            {rounds.map((round) => (
              <div key={round.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
                <div>
                  <p className="font-medium">{round.player.name}</p>
                  <p className="text-sm text-gray-600">
                    {round.course.name} - {round.group.name} (Day {round.group.day})
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{round.total_score}</p>
                    <p className="text-xs text-gray-600">strokes</p>
                  </div>
                  {round.is_complete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
