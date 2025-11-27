"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Medal, Award } from "lucide-react"
import type { Player, Course, Group, Round, Tournament } from "@/app/page"
import { subscribeToRounds, unsubscribe } from "@/lib/supabase/realtime"
import { PlayerProfileModal } from "@/components/player-profile-modal"

type AdminLeaderboardProps = {
  players: Player[]
  courses: Course[]
  groups: Group[]
  rounds: Round[]
  tournamentId?: string
  tournament?: Tournament | null
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
  totalNetScore: number
  averageNetScore: number
}

function getHandicapStrokesForHole(strokeIndex: number, handicap: number, totalHoles: number): number {
  if (handicap <= 0) return 0
  const fullStrokes = Math.floor(handicap / totalHoles)
  const remainingStrokes = handicap % totalHoles
  return fullStrokes + (strokeIndex <= remainingStrokes ? 1 : 0)
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
  const [selectedDay, setSelectedDay] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"totalPoints" | "avgPoints" | "bestRound">("totalPoints")
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  useEffect(() => {
    if (!tournamentId) return

    const roundsChannel = subscribeToRounds(tournamentId, () => {
      setRefreshKey((prev) => prev + 1)
    })

    return () => {
      unsubscribe(roundsChannel)
    }
  }, [tournamentId])

  const filteredRounds = useMemo(() => {
    const completedRounds = rounds.filter((r) => {
      const group = groups.find((g) => g.id === r.groupId)
      return group && r.completed
    })

    let dayFilteredRounds = completedRounds
    if (selectedDay !== "all") {
      if (selectedDay === "practice") {
        const practiceGroups = groups.filter((g) => g.day === 0).map((g) => g.id)
        dayFilteredRounds = completedRounds.filter((r) => practiceGroups.includes(r.groupId))
      } else {
        const dayNumber = Number.parseInt(selectedDay)
        const dayGroups = groups.filter((g) => g.day === dayNumber).map((g) => g.id)
        dayFilteredRounds = completedRounds.filter((r) => dayGroups.includes(r.groupId))
      }
    }

    if (selectedGroupId === "all") return dayFilteredRounds
    return dayFilteredRounds.filter((r) => r.groupId === selectedGroupId)
  }, [rounds, groups, selectedGroupId, selectedDay, refreshKey])

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
          totalNetScore: 0,
          averageNetScore: 0,
        }
      }

      const totalPoints = playerRounds.reduce((sum, r) => sum + r.totalPoints, 0)
      const totalGross = playerRounds.reduce((sum, r) => sum + r.totalGross, 0)
      const bestRound = Math.max(...playerRounds.map((r) => r.totalPoints))

      const totalNetScore = playerRounds.reduce((sum, round) => {
        const course = courses.find((c) => {
          const group = groups.find((g) => g.id === round.groupId)
          return group && c.id === group.courseId
        })

        if (!course || !round.holes) return sum

        const roundNetScore = round.holes.reduce((holeSum, hole) => {
          const courseHole = course.holes.find((h) => h.number === hole.holeNumber)
          if (!courseHole || !hole.strokes) return holeSum

          const strokeIndex = courseHole.strokeIndex || 18
          const handicapUsed = round.handicapUsed || player.handicap
          const handicapStrokes = getHandicapStrokesForHole(strokeIndex, handicapUsed, course.holes.length)
          const netScore = hole.strokes - handicapStrokes

          return holeSum + netScore
        }, 0)

        return sum + roundNetScore
      }, 0)

      return {
        playerId: player.id,
        playerName: player.name,
        handicap: player.handicap,
        totalRounds: playerRounds.length,
        totalPoints,
        averagePoints: totalPoints / playerRounds.length,
        bestRound,
        totalGross,
        averageGross: totalGross / playerRounds.length,
        totalNetScore,
        averageNetScore: totalNetScore / playerRounds.length,
      }
    })

    const playersWithRounds = playerStats.filter((p) => p.totalRounds > 0)

    return playersWithRounds.sort((a, b) => {
      if (sortBy === "totalPoints") return b.totalPoints - a.totalPoints
      if (sortBy === "avgPoints") return b.averagePoints - a.averagePoints
      if (sortBy === "bestRound") return b.bestRound - a.bestRound
      return 0
    })
  }, [players, filteredRounds, sortBy, courses, groups])

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

  const { availableDays, hasPlayAroundDay } = useMemo(() => {
    const days = new Set(groups.map((g) => g.day))
    const daysArray = Array.from(days).sort((a, b) => a - b)

    console.log("[v0] Admin Leaderboard - Available days from groups:", daysArray)
    console.log("[v0] Admin Leaderboard - tournament.hasPlayAroundDay:", tournament?.hasPlayAroundDay)

    return {
      availableDays: daysArray.filter((d) => d > 0),
      hasPlayAroundDay: tournament?.hasPlayAroundDay || false,
    }
  }, [groups, tournament?.hasPlayAroundDay])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>View player rankings based on Stableford points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Day</label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {hasPlayAroundDay && <SelectItem value="practice">Practice Match</SelectItem>}
                  {availableDays.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  onClick={() => {
                    const fullPlayer = players.find((p) => p.id === player.playerId)
                    if (fullPlayer) setSelectedPlayer(fullPlayer)
                  }}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer ${
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
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-muted-foreground">Points</span>
                      <span className="text-base font-bold text-emerald-600">{player.totalPoints}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-muted-foreground">Net</span>
                      <span className="text-base font-bold text-foreground">{player.totalNetScore}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs text-muted-foreground">Strokes</span>
                      <span className="text-base font-bold text-foreground">{player.totalGross}</span>
                    </div>
                  </div>
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
                  if (!player) return null

                  return (
                    <div key={round.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
                        <div>
                          <p className="font-medium">{player.name}</p>
                          <p className="text-xs text-muted-foreground">Gross: {round.totalGross}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">{round.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          rounds={rounds}
          groups={groups}
          courses={courses}
          tournament={tournament}
          onClose={() => setSelectedPlayer(null)}
          isAdmin={true}
        />
      )}
    </div>
  )
}
