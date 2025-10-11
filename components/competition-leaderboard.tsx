"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, TrendingUp, Trophy } from "lucide-react"
import type { Competition, CompetitionEntry, Player, Course } from "@/app/page"

type CompetitionLeaderboardProps = {
  competitions: Competition[]
  competitionEntries: CompetitionEntry[]
  players: Player[]
  courses: Course[]
}

export function CompetitionLeaderboard({
  competitions,
  competitionEntries,
  players,
  courses,
}: CompetitionLeaderboardProps) {
  const [selectedDay, setSelectedDay] = useState<number>(1)

  const availableDays = useMemo(() => {
    const days = new Set(competitions.map((c) => c.day))
    return Array.from(days).sort((a, b) => a - b)
  }, [competitions])

  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(selectedDay)) {
      setSelectedDay(availableDays[0])
    }
  }, [availableDays])

  const closestToPinCompetitions = useMemo(() => {
    return competitions.filter((c) => c.type === "closest-to-pin" && c.enabled && c.day === selectedDay)
  }, [competitions, selectedDay])

  const longestDriveCompetitions = useMemo(() => {
    return competitions.filter((c) => c.type === "longest-drive" && c.enabled && c.day === selectedDay)
  }, [competitions, selectedDay])

  const getLeaderboard = (competitionId: string, type: "closest-to-pin" | "longest-drive") => {
    const entries = competitionEntries.filter((e) => e.competitionId === competitionId)

    const sorted = [...entries].sort((a, b) => {
      if (type === "closest-to-pin") {
        return a.distance - b.distance // Smaller is better
      } else {
        return b.distance - a.distance // Larger is better
      }
    })

    return sorted.map((entry, index) => {
      const player = players.find((p) => p.id === entry.playerId)
      return {
        position: index + 1,
        playerName: player?.name || "Unknown",
        distance: entry.distance,
      }
    })
  }

  return (
    <div className="h-full overflow-y-auto space-y-4 pb-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Competition Leaderboards
          </CardTitle>
          <CardDescription>Live standings for Closest to Pin and Longest Drive</CardDescription>
        </CardHeader>
        {availableDays.length > 1 && (
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {availableDays.map((day) => (
                <Button
                  key={day}
                  variant={selectedDay === day ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDay(day)}
                >
                  Day {day}
                </Button>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {closestToPinCompetitions.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Target className="w-5 h-5" />
              Closest to Pin - Day {selectedDay}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {closestToPinCompetitions.map((comp) => {
              const leaderboard = getLeaderboard(comp.id, "closest-to-pin")
              return (
                <div key={comp.id} className="bg-white rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3">Hole {comp.holeNumber}</h3>
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-blue-600 text-center py-4">No entries yet</p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry) => (
                        <div
                          key={`${comp.id}-${entry.position}`}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            entry.position === 1
                              ? "bg-yellow-100 border-2 border-yellow-400"
                              : entry.position === 2
                                ? "bg-gray-100 border-2 border-gray-400"
                                : entry.position === 3
                                  ? "bg-orange-100 border-2 border-orange-400"
                                  : "bg-blue-50 border border-blue-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                entry.position === 1
                                  ? "bg-yellow-400 text-yellow-900"
                                  : entry.position === 2
                                    ? "bg-gray-400 text-gray-900"
                                    : entry.position === 3
                                      ? "bg-orange-400 text-orange-900"
                                      : "bg-blue-200 text-blue-900"
                              }`}
                            >
                              {entry.position}
                            </div>
                            <span className="font-medium text-blue-900">{entry.playerName}</span>
                          </div>
                          <span className="font-bold text-blue-700">{entry.distance}m</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {longestDriveCompetitions.length > 0 && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <TrendingUp className="w-5 h-5" />
              Longest Drive - Day {selectedDay}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {longestDriveCompetitions.map((comp) => {
              const leaderboard = getLeaderboard(comp.id, "longest-drive")
              return (
                <div key={comp.id} className="bg-white rounded-lg p-4 border border-emerald-200">
                  <h3 className="font-semibold text-emerald-900 mb-3">Hole {comp.holeNumber}</h3>
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-emerald-600 text-center py-4">No entries yet</p>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((entry) => (
                        <div
                          key={`${comp.id}-${entry.position}`}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            entry.position === 1
                              ? "bg-yellow-100 border-2 border-yellow-400"
                              : entry.position === 2
                                ? "bg-gray-100 border-2 border-gray-400"
                                : entry.position === 3
                                  ? "bg-orange-100 border-2 border-orange-400"
                                  : "bg-emerald-50 border border-emerald-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                entry.position === 1
                                  ? "bg-yellow-400 text-yellow-900"
                                  : entry.position === 2
                                    ? "bg-gray-400 text-gray-900"
                                    : entry.position === 3
                                      ? "bg-orange-400 text-orange-900"
                                      : "bg-emerald-200 text-emerald-900"
                              }`}
                            >
                              {entry.position}
                            </div>
                            <span className="font-medium text-emerald-900">{entry.playerName}</span>
                          </div>
                          <span className="font-bold text-emerald-700">{entry.distance}m</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {closestToPinCompetitions.length === 0 && longestDriveCompetitions.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No competitions are currently active for Day {selectedDay}. Check back later!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
