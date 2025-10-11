"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Check, Trophy } from "lucide-react"

interface Player {
  id: string
  name: string
  handicap: number
}

interface Course {
  id: string
  name: string
  par: number
  tournamentId: string // Added tournamentId to Course interface
  holes: Array<{ holeNumber: number; par: number; strokeIndex: number }>
}

interface Group {
  id: string
  name: string
  day: number
  group_players: Array<{ player: Player }>
}

interface Round {
  player_id: string
  course_id: string
  group_id: string
  day: number
  scores: number[]
  is_complete: boolean
}

type ScoreEntryTabProps = {
  players: Player[]
  courses: Course[]
  groups: Group[]
  rounds: Round[]
  setRounds: (rounds: Round[]) => void
  currentTournamentId: string | null // Added to filter courses by tournament
}

export function ScoreEntryTab({
  players,
  courses,
  groups,
  rounds,
  setRounds,
  currentTournamentId,
}: ScoreEntryTabProps) {
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [currentHole, setCurrentHole] = useState(1)
  const [scores, setScores] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  const tournamentCourses = currentTournamentId ? courses.filter((c) => c.tournamentId === currentTournamentId) : []

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)
  const selectedCourse = tournamentCourses.find((c) => c.id === selectedCourseId)
  const currentHoleData = selectedCourse?.holes[currentHole - 1]

  const updateScore = (holeIndex: number, value: string) => {
    const newScores = [...scores]
    newScores[holeIndex] = Number.parseInt(value) || 0
    setScores(newScores)
  }

  const saveRound = async (isComplete: boolean) => {
    if (!selectedPlayerId || !selectedCourseId || !selectedGroupId) return

    setLoading(true)

    const response = await fetch(`/api/competitions/${selectedGroup?.day}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: selectedPlayerId,
        course_id: selectedCourseId,
        group_id: selectedGroupId,
        day: selectedGroup?.day || 1,
        scores,
        is_complete: isComplete,
      }),
    })

    if (response.ok) {
      alert(isComplete ? "Round submitted!" : "Progress saved!")
    }

    setLoading(false)
  }

  if (groups.length === 0 || tournamentCourses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">No groups or courses set up yet. Please contact the admin.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Group and Player</CardTitle>
          <CardDescription>Choose who you're scoring for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Group</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} - Day {group.day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedGroup && (
            <div className="space-y-2">
              <Label>Player</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a player" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGroup.group_players.map(({ player }) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} (Handicap: {player.handicap})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
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
        </CardContent>
      </Card>

      {selectedCourse && selectedPlayerId && currentHoleData && (
        <Card>
          <CardHeader>
            <CardTitle>
              Hole {currentHole} of {selectedCourse.holes.length}
            </CardTitle>
            <CardDescription>Par {currentHoleData.par}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Label>Strokes</Label>
              <Input
                type="number"
                min="0"
                max="15"
                value={scores[currentHole - 1] || ""}
                onChange={(e) => updateScore(currentHole - 1, e.target.value)}
                className="mx-auto mt-2 h-24 w-32 text-center text-4xl font-bold"
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={() => setCurrentHole((prev) => Math.max(1, prev - 1))}
                disabled={currentHole === 1}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">Hole</p>
                <p className="text-2xl font-bold">
                  {currentHole}/{selectedCourse.holes.length}
                </p>
              </div>

              {currentHole < selectedCourse.holes.length ? (
                <Button onClick={() => setCurrentHole((prev) => prev + 1)} className="flex-1">
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => saveRound(true)} disabled={loading} className="flex-1 bg-green-600">
                  <Check className="mr-2 h-4 w-4" />
                  Submit
                </Button>
              )}
            </div>

            <Button
              onClick={() => saveRound(false)}
              disabled={loading}
              variant="outline"
              className="w-full bg-transparent"
            >
              Save Progress
            </Button>

            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span>Total Strokes:</span>
                <span className="font-bold">{scores.reduce((sum, s) => sum + (s || 0), 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
