"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save } from "lucide-react"
import type { Player, Course, Score } from "@/app/page"

type ScoreEntryProps = {
  players: Player[]
  courses: Course[]
  scores: Score[]
  setScores: (scores: Score[]) => void
  currentTournamentId: string | null // Added to filter courses by tournament
}

export function ScoreEntry({ players, courses, scores, setScores, currentTournamentId }: ScoreEntryProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [grossScore, setGrossScore] = useState<string>("")

  const addScore = () => {
    if (!selectedPlayerId || !selectedCourseId || !grossScore) return

    const player = players.find((p) => p.id === selectedPlayerId)
    if (!player) return

    const gross = Number.parseInt(grossScore)
    const net = gross - player.handicap

    const newScore: Score = {
      id: Date.now().toString(),
      playerId: selectedPlayerId,
      courseId: selectedCourseId,
      grossScore: gross,
      netScore: net,
      date: new Date().toISOString(),
    }

    setScores([...scores, newScore])
    setGrossScore("")
  }

  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name || "Unknown"
  }

  const getCourseName = (courseId: string) => {
    return courses.find((c) => c.id === courseId)?.name || "Unknown"
  }

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId)

  const tournamentCourses = currentTournamentId ? courses.filter((c) => c.tournamentId === currentTournamentId) : []
  const tournamentPlayers = currentTournamentId ? players.filter((p) => p.tournamentId === currentTournamentId) : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enter Score</CardTitle>
          <CardDescription>
            Select a player and course, then enter the gross score. Net score will be calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tournamentPlayers.length === 0 || tournamentCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {tournamentPlayers.length === 0 && "Please add players first."}
                {tournamentPlayers.length > 0 && tournamentCourses.length === 0 && "Please add courses first."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="player-select">Player</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger id="player-select">
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournamentPlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} (Handicap: {player.handicap})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="course-select">Course</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger id="course-select">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournamentCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name} (Par {course.par})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="gross-score">Gross Score</Label>
                <Input
                  id="gross-score"
                  type="number"
                  placeholder="Enter gross score"
                  value={grossScore}
                  onChange={(e) => setGrossScore(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addScore()}
                />
              </div>

              {selectedPlayer && grossScore && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm font-medium text-emerald-900">Score Preview</p>
                  <div className="mt-2 space-y-1 text-sm text-emerald-800">
                    <p>
                      Gross Score: <span className="font-semibold">{grossScore}</span>
                    </p>
                    <p>
                      Handicap: <span className="font-semibold">{selectedPlayer.handicap}</span>
                    </p>
                    <p>
                      Net Score:{" "}
                      <span className="font-semibold">{Number.parseInt(grossScore) - selectedPlayer.handicap}</span>
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={addScore}
                className="w-full"
                disabled={!selectedPlayerId || !selectedCourseId || !grossScore}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Score
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scores ({scores.length})</CardTitle>
          <CardDescription>All recorded scores</CardDescription>
        </CardHeader>
        <CardContent>
          {scores.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No scores recorded yet</p>
          ) : (
            <div className="space-y-2">
              {scores
                .slice()
                .reverse()
                .map((score) => (
                  <div key={score.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div>
                      <p className="font-medium">{getPlayerName(score.playerId)}</p>
                      <p className="text-sm text-muted-foreground">
                        {getCourseName(score.courseId)} • {new Date(score.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Gross: {score.grossScore}</p>
                      <p className="font-semibold text-emerald-600">Net: {score.netScore}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
