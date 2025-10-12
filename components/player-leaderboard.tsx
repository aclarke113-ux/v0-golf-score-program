"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Medal, Award, Eye, EyeOff } from "lucide-react"
import { PlayerProfileModal } from "@/components/player-profile-modal" // Fixed import to use named export instead of default
import { subscribeToRounds, unsubscribe } from "@/lib/supabase/realtime"
import type { Player, Course, Group, Round, Tournament } from "@/types" // Declare the variables before using them

type PlayerLeaderboardProps = {
  players?: Player[]
  courses?: Course[]
  groups?: Group[]
  rounds?: Round[]
  tournament?: Tournament | null
}

type PlayerStats = {
  playerId: string
  playerName: string
  handicap: number
  holesPlayed: number
  totalStrokes: number
  totalPoints: number
  totalNetScore: number
  isComplete: boolean
}

function getHandicapStrokesForHole(handicap: number, strokeIndex: number): number {
  if (strokeIndex === 0 || !strokeIndex) return 0
  const strokesPerHole = Math.floor(handicap / 18)
  const extraStrokes = handicap % 18
  return strokesPerHole + (strokeIndex <= extraStrokes ? 1 : 0)
}

export function PlayerLeaderboard({
  players = [],
  courses = [],
  groups = [],
  rounds = [],
  tournament = null,
}: PlayerLeaderboardProps) {
  const [selectedDay, setSelectedDay] = useState<string>("all")
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  useEffect(() => {
    if (!tournament?.id) return

    console.log("[v0] Setting up real-time subscription for rounds")

    // Subscribe to rounds changes for real-time updates
    const roundsChannel = subscribeToRounds(tournament.id, () => {
      console.log("[v0] Rounds updated, refreshing leaderboard")
      setRefreshKey((prev) => prev + 1)
    })

    return () => {
      console.log("[v0] Cleaning up real-time subscription")
      unsubscribe(roundsChannel)
    }
  }, [tournament?.id])

  const safeGroups = Array.isArray(groups) ? groups : []
  const safeRounds = Array.isArray(rounds) ? rounds : []
  const safePlayers = Array.isArray(players) ? players : []
  const safeCourses = Array.isArray(courses) ? courses : []

  const scoringType = tournament?.scoringType || "handicap"
  const numberOfDays = tournament?.numberOfDays || 2
  const hasPlayAroundDay = tournament?.hasPlayAroundDay || false

  const shouldBlurTop5 = useMemo(() => {
    try {
      const day2Groups = safeGroups.filter((g) => g?.day === 2)
      if (day2Groups.length === 0) return false

      for (const group of day2Groups) {
        const groupRounds = safeRounds.filter((r) => r?.groupId === group.id && r?.submitted)
        if (groupRounds.length > 0) {
          const allComplete = groupRounds.every((round) => {
            const scores = round?.scores || []
            return scores.length === 18 && scores.every((s) => s > 0)
          })
          if (allComplete) return true
        }
      }
      return false
    } catch (error) {
      console.error("[v0] Error in shouldBlurTop5:", error)
      return false
    }
  }, [safeGroups, safeRounds])

  const filteredRounds = useMemo(() => {
    try {
      if (selectedDay === "all") {
        // Return all rounds including warm-up day
        return safeRounds
      }
      const dayNumber = Number.parseInt(selectedDay)
      const dayGroups = safeGroups.filter((g) => g?.day === dayNumber).map((g) => g.id)
      return safeRounds.filter((r) => r?.groupId && dayGroups.includes(r.groupId))
    } catch (error) {
      console.error("[v0] Error in filteredRounds:", error)
      return []
    }
  }, [safeRounds, safeGroups, selectedDay])

  const leaderboard = useMemo(() => {
    try {
      const playerStats: PlayerStats[] = safePlayers.map((player) => {
        if (!player) {
          return {
            playerId: "",
            playerName: "Unknown",
            handicap: 0,
            holesPlayed: 0,
            totalStrokes: 0,
            totalPoints: 0,
            totalNetScore: 0,
            isComplete: false,
          }
        }

        const playerRounds = filteredRounds.filter((r) => r?.playerId === player.id)

        if (playerRounds.length === 0) {
          return {
            playerId: player.id,
            playerName: player.name,
            handicap: player.handicap,
            holesPlayed: 0,
            totalStrokes: 0,
            totalPoints: 0,
            totalNetScore: 0,
            isComplete: false,
          }
        }

        const roundsByDay = new Map<number, Round>()
        playerRounds.forEach((round) => {
          const group = safeGroups.find((g) => g.id === round.groupId)
          if (!group) return

          const day = group.day
          const existing = roundsByDay.get(day)

          // Keep the most recent round for each day (or the submitted one)
          if (
            !existing ||
            round.submitted ||
            (round.updatedAt && existing.updatedAt && round.updatedAt > existing.updatedAt)
          ) {
            roundsByDay.set(day, round)
          }
        })

        const selectedRounds = Array.from(roundsByDay.values())

        let totalStrokes = 0
        let totalPoints = 0
        let totalHolesPlayed = 0
        let totalNetScore = 0

        selectedRounds.forEach((round) => {
          if (!round?.holes) return

          const group = safeGroups.find((g) => g.id === round.groupId)
          const course = safeCourses.find((c) => c.id === group?.courseId)

          const scoredHoles = round.holes.filter((h) => h.strokes > 0)
          totalHolesPlayed += scoredHoles.length
          totalStrokes += scoredHoles.reduce((sum, hole) => sum + hole.strokes, 0)
          totalPoints += scoredHoles.reduce((sum, hole) => sum + hole.points, 0)

          const roundHandicap = round.handicapUsed ?? player.handicap

          scoredHoles.forEach((hole) => {
            if (course?.holes) {
              const courseHole = course.holes.find((h) => h.holeNumber === hole.holeNumber)
              const strokeIndex = courseHole?.strokeIndex || hole.holeNumber
              const handicapStrokes = getHandicapStrokesForHole(roundHandicap, strokeIndex)
              const netScore = hole.strokes - handicapStrokes
              totalNetScore += netScore
            } else {
              totalNetScore += hole.strokes
            }
          })
        })

        const isComplete = selectedRounds.some(
          (r) => r?.submitted && r?.holes?.length > 0 && r.holes.every((h) => h.strokes > 0),
        )

        return {
          playerId: player.id,
          playerName: player.name,
          handicap: player.handicap,
          holesPlayed: totalHolesPlayed,
          totalStrokes,
          totalPoints,
          totalNetScore,
          isComplete,
        }
      })

      const playersWithScores = playerStats.filter((p) => p.holesPlayed > 0)
      const playersWithoutScores = playerStats.filter((p) => p.holesPlayed === 0)

      const sortedWithScores = playersWithScores.sort((a, b) => {
        if (scoringType === "net") {
          // Sort by net score (lower is better)
          if (a.totalNetScore !== b.totalNetScore) return a.totalNetScore - b.totalNetScore
        } else if (scoringType === "strokes") {
          if (a.totalStrokes !== b.totalStrokes) return a.totalStrokes - b.totalStrokes
        } else {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
        }
        return b.holesPlayed - a.holesPlayed
      })

      return [...sortedWithScores, ...playersWithoutScores]
    } catch (error) {
      console.error("[v0] Error in leaderboard calculation:", error)
      return []
    }
  }, [safePlayers, filteredRounds, scoringType, refreshKey, safeGroups, safeCourses])

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />
    return null
  }

  if (safePlayers.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-none">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Live Leaderboard
          </CardTitle>
          <CardDescription>Current standings updated in real-time</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <p className="text-muted-foreground text-center py-8">Loading leaderboard...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-none">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Live Leaderboard
              </CardTitle>
              <CardDescription>
                Auto-refreshing -{" "}
                {scoringType === "strokes" ? "Stroke Play" : scoringType === "net" ? "Net Score" : "Stableford Points"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-none mb-4">
            <label className="text-sm font-medium mb-2 block">View</label>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Overall (All Days)</SelectItem>
                {hasPlayAroundDay && <SelectItem value="0">Play Around Day</SelectItem>}
                {Array.from({ length: numberOfDays }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Day {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {shouldBlurTop5 && (
            <div className="flex-none mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <EyeOff className="w-5 h-5 text-amber-600" />
              <p className="text-sm text-amber-800">
                <strong>Competition Sealed!</strong> The top 5 positions are now hidden until the admin reveals the
                winners.
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {leaderboard.map((playerStats, index) => {
              const isTop5 = index < 5
              const shouldBlur = isTop5 && shouldBlurTop5
              const fullPlayer = safePlayers.find((p) => p.id === playerStats.playerId)

              return (
                <div
                  key={playerStats.playerId}
                  onClick={() => fullPlayer && setSelectedPlayer(fullPlayer)}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer ${
                    index < 3 && !shouldBlur && playerStats.holesPlayed > 0
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-card"
                  } ${shouldBlur ? "relative" : ""} hover:bg-accent/50 ${
                    playerStats.holesPlayed === 0 ? "opacity-60" : ""
                  }`}
                >
                  {shouldBlur && (
                    <div className="absolute inset-0 backdrop-blur-md bg-white/30 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center">
                        <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">Top {index + 1}</p>
                        <p className="text-xs text-muted-foreground">Hidden until reveal</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center w-8">
                    {playerStats.holesPlayed > 0 && getPositionIcon(index) ? (
                      getPositionIcon(index)
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{playerStats.playerName}</p>
                      {fullPlayer?.championshipWins && fullPlayer.championshipWins.length > 0 && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {fullPlayer.championshipWins.length}x
                        </span>
                      )}
                      {fullPlayer?.isCurrentChampion && (
                        <Trophy className="w-4 h-4 text-yellow-500" title="Current Champion" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Handicap: {playerStats.handicap} •{" "}
                      {playerStats.holesPlayed === 0
                        ? "No scores yet"
                        : playerStats.isComplete
                          ? "Round Complete"
                          : `Through ${playerStats.holesPlayed} hole${playerStats.holesPlayed !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    {scoringType === "net" ? (
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="text-xl font-bold text-emerald-600">{playerStats.totalNetScore || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Strokes</p>
                          <p className="font-semibold">{playerStats.totalStrokes || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Points</p>
                          <p className="font-semibold">{playerStats.totalPoints}</p>
                        </div>
                      </div>
                    ) : scoringType === "handicap" ? (
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Points</p>
                          <p className="text-xl font-bold text-emerald-600">{playerStats.totalPoints}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="font-semibold">{playerStats.totalNetScore || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Strokes</p>
                          <p className="font-semibold">{playerStats.totalStrokes || "-"}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Strokes</p>
                          <p className="text-xl font-bold text-emerald-600">{playerStats.totalStrokes || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="font-semibold">{playerStats.totalNetScore || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Points</p>
                          <p className="font-semibold">{playerStats.totalPoints}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          rounds={rounds}
          groups={groups}
          courses={courses}
          tournament={tournament}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  )
}
