"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Medal, Award } from "lucide-react"
import type { Player, Course, Group, Round } from "@/app/page"
import { subscribeToRounds, unsubscribe } from "@/lib/supabase/realtime"

type AdminLeaderboardProps = {
  players: Player[]
  courses: Course[]
  groups: Group[]
  rounds: Round[]
  tournamentId?: string // Added tournamentId prop for subscriptions
}

export function AdminLeaderboard({ players, courses, groups, rounds, tournamentId }: AdminLeaderboardProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"totalPoints" | "avgPoints" | "bestRound">("totalPoints")
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
        }
      }

      const totalPoints = playerRounds.reduce((sum, r) => sum + r.totalPoints, 0)
      const totalGross = playerRounds.reduce((sum, r) => sum + r.totalGross, 0)
      const bestRound = Math.max(...playerRounds.map((r) => r.totalPoints))

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
      }
    })

    // Filter out players with no rounds
    const playersWithRounds = playerStats.filter((p) => p.totalRounds > 0)

    // Sort based on selected criteria
    return playersWithRounds.sort((a, b) => {
      if (sortBy === "totalPoints") return b.totalPoints - a.totalPoints
      if (sortBy === "avgPoints") return b.averagePoints - a.averagePoints
      if (sortBy === "bestRound") return b.bestRound - a.bestRound
      return 0
    })
  }, [players, filteredRounds, sortBy])

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>View player rankings based on Stableford points</CardDescription>
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
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Points</p>
                        <p className="text-xl font-bold text-emerald-600">{player.totalPoints}</p>
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
}
