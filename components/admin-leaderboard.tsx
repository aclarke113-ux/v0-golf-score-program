"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Medal, Award } from "lucide-react"
import { AdminScoreEditor } from "@/components/admin/admin-score-editor"
import { PlayerRoundsEditor } from "@/components/admin/player-rounds-editor"
import type { Player, Course, Group, Round } from "@/app/page"
import { subscribeToRounds, unsubscribe } from "@/lib/supabase/realtime"

type AdminLeaderboardProps = {
  players: Player[]
  courses: Course[]
  groups: Group[]
  rounds: Round[]
  tournamentId?: string // Added tournamentId prop for subscriptions
  tournament?: { scoringType?: "strokes" | "handicap" | "net" } | null // Added tournament prop to access scoring type
}

function getHandicapStrokesForHole(handicap: number, strokeIndex: number): number {
  if (strokeIndex === 0 || !strokeIndex) return 0
  const strokesPerHole = Math.floor(handicap / 18)
  const extraStrokes = handicap % 18
  return strokesPerHole + (strokeIndex <= extraStrokes ? 1 : 0)
}

export function AdminLeaderboard({
  players,
  courses,
  groups,
  rounds,
  tournamentId,
  tournament,
}: AdminLeaderboardProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"totalPoints" | "avgPoints" | "bestRound" | "totalNet">("totalPoints")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!tournamentId) return

    console.log("[v0] Admin leaderboard: Setting up real-time subscription")

    const roundsChannel = subscribeToRounds(tournamentId, () => {
      console.log("[v0] Admin leaderboard: Rounds updated")
      setRefreshKey((prev) => prev + 1)
    })

    return () => {
      unsubscribe(roundsChannel)
    }
  }, [tournamentId])

  const filteredRounds = useMemo(() => {
    if (selectedGroupId === "all") return rounds.filter((r) => r.completed)
    return rounds.filter((r) => r.groupId === selectedGroupId && r.completed)
  }, [rounds, selectedGroupId, refreshKey]) // Added refreshKey dependency

  const leaderboard = useMemo(() => {
    const playerStats: PlayerStats[] = players.map((player) => {
      const playerRounds = filteredRounds.filter((r) => r.playerId === player.id)

      if (playerRounds.length === 0) {
        return {
          playerId: player.id,
          playerName: player.name,
          handicap: player.handicap,
          totalRounds: 0,
          totalPoints: 0,
          averagePoints: 0,
          bestRound: 0,
          totalGross: 0,
          averageGross: 0,
          totalNet: 0,
          averageNet: 0,
        }
      }

      const roundsByDay = new Map<number, Round>()
      playerRounds.forEach((round) => {
        const group = groups.find((g) => g.id === round.groupId)
        if (!group) return

        const day = group.day
        const existing = roundsByDay.get(day)

        // Keep the most recent round for each day (or the completed one)
        if (
          !existing ||
          round.completed ||
          (round.updatedAt && existing.updatedAt && round.updatedAt > existing.updatedAt)
        ) {
          roundsByDay.set(day, round)
        }
      })

      const selectedRounds = Array.from(roundsByDay.values())

      const totalPoints = selectedRounds.reduce((sum, r) => sum + r.totalPoints, 0)
      const totalGross = selectedRounds.reduce((sum, r) => sum + r.totalGross, 0)
      const bestRound = Math.max(...selectedRounds.map((r) => r.totalPoints))

      let totalNet = 0
      selectedRounds.forEach((round) => {
        if (!round.holes) return

        const group = groups.find((g) => g.id === round.groupId)
        const course = courses.find((c) => c.id === group?.courseId)

        const roundHandicap = round.handicapUsed ?? player.handicap

        round.holes.forEach((hole) => {
          if (hole.strokes > 0 && course?.holes) {
            const courseHole = course.holes.find((h) => h.holeNumber === hole.holeNumber)
            // Use strokeIndex from course hole, fallback to hole number if missing
            const strokeIndex = courseHole?.strokeIndex || hole.holeNumber
            const handicapStrokes = getHandicapStrokesForHole(roundHandicap, strokeIndex)
            const netScore = hole.strokes - handicapStrokes
            totalNet += netScore
          }
        })
      })

      return {
        playerId: player.id,
        playerName: player.name,
        handicap: player.handicap,
        totalRounds: selectedRounds.length,
        totalPoints,
        averagePoints: totalPoints / selectedRounds.length,
        bestRound,
        totalGross,
        averageGross: totalGross / selectedRounds.length,
        totalNet,
        averageNet: totalNet / selectedRounds.length,
      }
    })

    const playersWithRounds = playerStats.filter((p) => p.totalRounds > 0)

    return playersWithRounds.sort((a, b) => {
      if (sortBy === "totalPoints") return b.totalPoints - a.totalPoints
      if (sortBy === "avgPoints") return b.averagePoints - a.averagePoints
      if (sortBy === "bestRound") return b.bestRound - a.bestRound
      if (sortBy === "totalNet") return a.totalNet - b.totalNet // Lower net score is better
      return 0
    })
  }, [players, filteredRounds, sortBy, groups, courses])

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />
    return null
  }

  const getGroupName = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return "Unknown"
    const course = courses.find((c) => c.id === group.courseId)
    return `${group.name} - ${course?.name || "Unknown"}`
  }

  const scoringType = tournament?.scoringType || "handicap"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            View player rankings based on{" "}
            {scoringType === "strokes" ? "Stroke Play" : scoringType === "net" ? "Net Score" : "Stableford points"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Group</label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {getGroupName(group.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sort by</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalPoints">Total Points</SelectItem>
                  <SelectItem value="avgPoints">Average Points</SelectItem>
                  <SelectItem value="bestRound">Best Round</SelectItem>
                  <SelectItem value="totalNet">Total Net</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No completed rounds yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((player, index) => (
                <div
                  key={player.playerId}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    index < 3 ? "bg-emerald-50 border-emerald-200" : "bg-card hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-center w-8">
                    {getPositionIcon(index) || (
                      <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold">{player.playerName}</p>
                    <p className="text-sm text-muted-foreground">
                      Handicap: {player.handicap} • {player.totalRounds} round{player.totalRounds !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    {scoringType === "net" ? (
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="text-xl font-bold text-emerald-600">{player.totalNet}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Strokes</p>
                          <p className="font-semibold">{player.totalGross}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Net</p>
                          <p className="font-semibold">{player.averageNet.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Points</p>
                          <p className="font-semibold">{player.totalPoints}</p>
                        </div>
                      </div>
                    ) : scoringType === "strokes" ? (
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Gross</p>
                          <p className="text-xl font-bold text-emerald-600">{player.totalGross}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="font-semibold">{player.totalNet}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Gross</p>
                          <p className="font-semibold">{player.averageGross.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Points</p>
                          <p className="font-semibold">{player.totalPoints}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Points</p>
                          <p className="text-xl font-bold text-emerald-600">{player.totalPoints}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="font-semibold">{player.totalNet}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Points</p>
                          <p className="font-semibold">{player.averagePoints.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Best Round</p>
                          <p className="font-semibold">{player.bestRound}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <PlayerRoundsEditor
                    player={players.find((p) => p.id === player.playerId)!}
                    rounds={rounds}
                    courses={courses}
                    groups={groups}
                    onUpdate={() => setRefreshKey((prev) => prev + 1)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGroupId !== "all" && filteredRounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Group Scores - {getGroupName(selectedGroupId)}</CardTitle>
            <CardDescription>Detailed scores for this group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredRounds
                .slice()
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .map((round, index) => {
                  const player = players.find((p) => p.id === round.playerId)
                  const group = groups.find((g) => g.id === round.groupId)
                  const course = courses.find((c) => c.id === group?.courseId)
                  if (!player || !group || !course) return null

                  return (
                    <div key={round.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
                        <div>
                          <p className="font-medium">{player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Gross: {round.totalGross} • Handicap: {round.handicapUsed || player.handicap}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600">{round.totalPoints}</p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                        <AdminScoreEditor
                          round={round}
                          player={player}
                          course={course}
                          group={group}
                          onUpdate={() => setRefreshKey((prev) => prev + 1)}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

type PlayerStats = {
  playerId: string
  playerName: string
  handicap: number
  totalRounds: number
  totalPoints: number
  averagePoints: number
  bestRound: number
  totalGross: number
  averageGross: number
  totalNet: number
  averageNet: number
}
