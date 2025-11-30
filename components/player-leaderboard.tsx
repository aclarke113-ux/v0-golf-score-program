"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Medal, Award, Eye, EyeOff } from "lucide-react"
import { PlayerProfileModal } from "@/components/player-profile-modal" // Fixed import to use named export instead of default
import { subscribeToRounds, unsubscribe } from "@/lib/supabase/realtime"
import type { Player, Course, Group, Round, Tournament } from "@/types" // Declare the variables before using them

function getHandicapStrokesForHole(strokeIndex: number, handicap: number, totalHoles = 18): number {
  if (strokeIndex === 0 || !strokeIndex) return 0
  const fullStrokes = Math.floor(handicap / totalHoles)
  const remainingStrokes = handicap % totalHoles
  return fullStrokes + (strokeIndex <= remainingStrokes ? 1 : 0)
}

type PlayerLeaderboardProps = {
  players?: Player[]
  courses?: Course[]
  groups?: Group[]
  rounds?: Round[]
  tournament?: Tournament | null
  isAdmin?: boolean
}

type PlayerStats = {
  playerId: string
  playerName: string
  handicap: number
  holesPlayed: number
  totalStrokes: number
  totalPoints: number
  totalNetScore: number // Added total net score for Net Score format
  isComplete: boolean
}

export function PlayerLeaderboard({
  players = [],
  courses = [],
  groups = [],
  rounds = [],
  tournament = null,
  isAdmin = false,
}: PlayerLeaderboardProps) {
  const [selectedDay, setSelectedDay] = useState<string>("overall")
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

  const shouldBlurTop5 = !isAdmin && (tournament?.blurTop5 || false)

  console.log("[v0] Player Leaderboard blur settings:", {
    isAdmin,
    tournamentBlurTop5: tournament?.blurTop5,
    shouldBlurTop5,
  })

  const filteredRounds = useMemo(() => {
    try {
      if (selectedDay === "overall") {
        const competitionGroups = safeGroups.filter((g) => g?.day && g.day > 0).map((g) => g.id)
        return safeRounds.filter((r) => r?.groupId && competitionGroups.includes(r.groupId))
      }
      if (selectedDay === "practice") {
        const practiceGroups = safeGroups.filter((g) => g?.day === 0).map((g) => g.id)
        return safeRounds.filter((r) => r?.groupId && practiceGroups.includes(r.groupId))
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

        const roundsByDay = new Map<number, Round[]>()

        playerRounds.forEach((round) => {
          if (!round?.groupId) return
          const group = safeGroups.find((g) => g.id === round.groupId)
          if (!group) return

          const day = group.day
          if (!roundsByDay.has(day)) {
            roundsByDay.set(day, [])
          }
          roundsByDay.get(day)!.push(round)
        })

        const selectedRounds: Round[] = []
        roundsByDay.forEach((dayRounds) => {
          const completedRounds = dayRounds.filter((r) => r.completed || r.submitted)
          const roundToUse =
            completedRounds.length > 0
              ? completedRounds.sort(
                  (a, b) =>
                    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
                )[0]
              : dayRounds.sort(
                  (a, b) =>
                    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
                )[0]

          if (roundToUse) {
            selectedRounds.push(roundToUse)
          }
        })

        console.log(`[v0] Points calculation for ${player.name}:`, {
          totalPlayerRounds: playerRounds.length,
          daysWithRounds: Array.from(roundsByDay.keys()),
          selectedRoundsCount: selectedRounds.length,
          selectedRoundIds: selectedRounds.map((r) => r.id),
        })

        let totalStrokes = 0
        let totalPoints = 0
        let totalNetScore = 0
        let totalHolesPlayed = 0
        let hasCompletedRound = false

        selectedRounds.forEach((round, roundIndex) => {
          if (!round?.holes) return

          const group = safeGroups.find((g) => g.id === round.groupId)
          const course = group ? safeCourses.find((c) => c.id === group.courseId) : null
          const handicapUsed = round.handicapUsed || player.handicap

          const scoredHoles = round.holes.filter((h) => h.strokes > 0)

          const roundPoints = scoredHoles.reduce((sum, hole) => sum + hole.points, 0)
          console.log(
            `[v0]   Round ${roundIndex + 1} (Day ${group?.day}, ${round.completed ? "Complete" : "In Progress"}):`,
            {
              roundId: round.id,
              holesInRound: round.holes.length,
              scoredHoles: scoredHoles.length,
              pointsFromRound: roundPoints,
              holesDetails: scoredHoles.map((h) => ({
                hole: h.holeNumber,
                strokes: h.strokes,
                points: h.points,
              })),
            },
          )

          totalHolesPlayed += scoredHoles.length
          totalStrokes += scoredHoles.reduce((sum, hole) => sum + hole.strokes, 0)
          totalPoints += roundPoints

          scoredHoles.forEach((hole) => {
            if (hole.netScore !== undefined && hole.netScore !== null) {
              // Use stored net score if available
              totalNetScore += hole.netScore
            } else if (course?.holes) {
              // Calculate net score from strokes and handicap
              const courseHole = course.holes.find((h) => h.number === hole.holeNumber)
              const strokeIndex = courseHole?.strokeIndex || 0
              const handicapStrokes = getHandicapStrokesForHole(strokeIndex, handicapUsed, course.holes.length)
              const netScore = hole.strokes - handicapStrokes
              totalNetScore += netScore
            }
          })

          if (round.completed || round.submitted || scoredHoles.length > 0) {
            hasCompletedRound = true
          }
        })

        console.log(`[v0]   TOTAL for ${player.name}:`, {
          totalPoints,
          totalHolesPlayed,
          totalStrokes,
        })

        return {
          playerId: player.id,
          playerName: player.name,
          handicap: player.handicap,
          holesPlayed: totalHolesPlayed,
          totalStrokes,
          totalPoints,
          totalNetScore,
          isComplete: hasCompletedRound,
        }
      })

      const playersWithScores = playerStats.filter((p) => p.holesPlayed > 0)
      const playersWithoutScores = playerStats.filter((p) => p.holesPlayed === 0)

      const sortedWithScores = playersWithScores.sort((a, b) => {
        if (scoringType === "strokes") {
          // Lower strokes is better
          if (a.totalStrokes !== b.totalStrokes) return a.totalStrokes - b.totalStrokes
        } else if (scoringType === "net-score") {
          // Lower net score is better
          if (a.totalNetScore !== b.totalNetScore) return a.totalNetScore - b.totalNetScore
        } else {
          // Stableford: higher points is better
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
        }
        return b.holesPlayed - a.holesPlayed
      })

      return [...sortedWithScores, ...playersWithoutScores]
    } catch (error) {
      console.error("[v0] Error in leaderboard calculation:", error)
      return []
    }
  }, [safePlayers, filteredRounds, scoringType, refreshKey])

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
                {scoringType === "strokes"
                  ? "Stroke Play"
                  : scoringType === "net-score"
                    ? "Net Score"
                    : "Stableford Points"}
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
                {hasPlayAroundDay && <SelectItem value="practice">Practice Match</SelectItem>}
                <SelectItem value="overall">Overall Tournament</SelectItem>
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
                <strong>Competition Sealed!</strong> The top 3 positions are now hidden until the admin reveals the
                winners.
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {leaderboard.map((playerStats, index) => {
              const isTop3 = index < 3
              const shouldBlur = isTop3 && shouldBlurTop5
              const fullPlayer = safePlayers.find((p) => p.id === playerStats.playerId)

              return (
                <div
                  key={playerStats.playerId}
                  onClick={() => !shouldBlur && fullPlayer && setSelectedPlayer(fullPlayer)}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    shouldBlur ? "cursor-not-allowed" : "cursor-pointer hover:bg-accent/50"
                  } ${
                    index < 3 && !shouldBlur && playerStats.holesPlayed > 0
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-card"
                  } ${shouldBlur ? "relative" : ""} ${playerStats.holesPlayed === 0 ? "opacity-60" : ""}`}
                >
                  {shouldBlur && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                      <div className="text-center">
                        <Eye className="w-8 h-8 text-gray-600 dark:text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Top {index + 1}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Hidden until reveal</p>
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
                      Handicap: {fullPlayer?.handicap || 0} •{" "}
                      {playerStats.holesPlayed === 0
                        ? "No scores yet"
                        : playerStats.isComplete
                          ? "Round Complete"
                          : `Through ${playerStats.holesPlayed} hole${playerStats.holesPlayed !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-muted-foreground">Points</span>
                      <span
                        className={`text-base font-bold ${scoringType === "handicap" ? "text-emerald-600" : "text-foreground"}`}
                      >
                        {playerStats.totalPoints}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-muted-foreground">Net</span>
                      <span
                        className={`text-base font-bold ${scoringType === "net-score" ? "text-emerald-600" : "text-foreground"}`}
                      >
                        {playerStats.totalNetScore || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-muted-foreground">Strokes</span>
                      <span
                        className={`text-base font-bold ${scoringType === "strokes" ? "text-emerald-600" : "text-foreground"}`}
                      >
                        {playerStats.totalStrokes || "-"}
                      </span>
                    </div>
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
          isAdmin={isAdmin}
        />
      )}
    </>
  )
}
