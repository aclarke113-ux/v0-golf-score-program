"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Medal, Award } from "lucide-react"
import type { Player, Course, Score } from "@/app/page"

type LeaderboardProps = {
  players: Player[]
  courses: Course[]
  scores: Score[]
  currentTournamentId: string | null // Added to filter courses by tournament
}

type PlayerStats = {
  playerId: string
  playerName: string
  handicap: number
  totalRounds: number
  bestNetScore: number | null
  averageNetScore: number | null
  bestGrossScore: number | null
  averageGrossScore: number | null
}

export function Leaderboard({ players, courses, scores, currentTournamentId }: LeaderboardProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"bestNet" | "avgNet" | "bestGross" | "avgGross">("bestNet")

  const tournamentCourses = currentTournamentId ? courses.filter((c) => c.tournamentId === currentTournamentId) : []

  const filteredScores = useMemo(() => {
    if (selectedCourseId === "all") return scores
    return scores.filter((s) => s.courseId === selectedCourseId)
  }, [scores, selectedCourseId])

  const leaderboard = useMemo(() => {
    const playerStats: PlayerStats[] = players.map((player) => {
      const playerScores = filteredScores.filter((s) => s.playerId === player.id)

      if (playerScores.length === 0) {
        return {
          playerId: player.id,
          playerName: player.name,
          handicap: player.handicap,
          totalRounds: 0,
          bestNetScore: null,
          averageNetScore: null,
          bestGrossScore: null,
          averageGrossScore: null,
        }
      }

      const netScores = playerScores.map((s) => s.netScore)
      const grossScores = playerScores.map((s) => s.grossScore)

      return {
        playerId: player.id,
        playerName: player.name,
        handicap: player.handicap,
        totalRounds: playerScores.length,
        bestNetScore: Math.min(...netScores),
        averageNetScore: netScores.reduce((a, b) => a + b, 0) / netScores.length,
        bestGrossScore: Math.min(...grossScores),
        averageGrossScore: grossScores.reduce((a, b) => a + b, 0) / grossScores.length,
      }
    })

    // Sort based on selected criteria
    return playerStats.sort((a, b) => {
      if (sortBy === "bestNet") {
        if (a.bestNetScore === null) return 1
        if (b.bestNetScore === null) return -1
        return a.bestNetScore - b.bestNetScore
      }
      if (sortBy === "avgNet") {
        if (a.averageNetScore === null) return 1
        if (b.averageNetScore === null) return -1
        return a.averageNetScore - b.averageNetScore
      }
      if (sortBy === "bestGross") {
        if (a.bestGrossScore === null) return 1
        if (b.bestGrossScore === null) return -1
        return a.bestGrossScore - b.bestGrossScore
      }
      if (sortBy === "avgGross") {
        if (a.averageGrossScore === null) return 1
        if (b.averageGrossScore === null) return -1
        return a.averageGrossScore - b.averageGrossScore
      }
      return 0
    })
  }, [players, filteredScores, sortBy])

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />
    return null
  }

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.name || "Unknown"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>View player rankings and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Course</label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {tournamentCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
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
                  <SelectItem value="bestNet">Best Net Score</SelectItem>
                  <SelectItem value="avgNet">Average Net Score</SelectItem>
                  <SelectItem value="bestGross">Best Gross Score</SelectItem>
                  <SelectItem value="avgGross">Average Gross Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scores.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No scores recorded yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((player, index) => {
                if (player.totalRounds === 0) return null

                return (
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
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Best Net</p>
                          <p className="font-semibold text-emerald-600">
                            {player.bestNetScore !== null ? player.bestNetScore : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Net</p>
                          <p className="font-medium">
                            {player.averageNetScore !== null ? player.averageNetScore.toFixed(1) : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Best Gross</p>
                          <p className="font-medium">{player.bestGrossScore !== null ? player.bestGrossScore : "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCourseId !== "all" && filteredScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Scores - {getCourseName(selectedCourseId)}</CardTitle>
            <CardDescription>All scores for this course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredScores
                .slice()
                .sort((a, b) => a.netScore - b.netScore)
                .map((score, index) => {
                  const player = players.find((p) => p.id === score.playerId)
                  if (!player) return null

                  return (
                    <div key={score.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
                        <div>
                          <p className="font-medium">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(score.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Gross: {score.grossScore}</p>
                        <p className="font-semibold text-emerald-600">Net: {score.netScore}</p>
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
