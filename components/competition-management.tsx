"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Target, TrendingUp, Trophy, Calendar, Navigation } from "lucide-react"
import type { Competition, CompetitionEntry, Player, Course, Tournament } from "@/app/page"
import {
  getCompetitionsByTournament,
  createCompetition,
  deleteCompetition,
  getCoursesByTournament,
} from "@/lib/supabase/db"

type CompetitionManagementProps = {
  competitions: Competition[]
  setCompetitions: (competitions: Competition[]) => void
  competitionEntries: CompetitionEntry[]
  players: Player[]
  courses: Course[]
  currentTournament: Tournament | null
}

export function CompetitionManagement({
  competitions,
  setCompetitions,
  competitionEntries,
  players,
  courses,
  currentTournament,
}: CompetitionManagementProps) {
  const [localCompetitions, setLocalCompetitions] = useState<Competition[]>([])
  const [localCourses, setLocalCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentTournament?.id) return

    const loadData = async () => {
      try {
        const [competitionsData, coursesData] = await Promise.all([
          getCompetitionsByTournament(currentTournament.id),
          getCoursesByTournament(currentTournament.id),
        ])

        console.log("[v0] Loaded competitions:", competitionsData.length)
        console.log("[v0] Loaded courses for competition:", coursesData.length)

        setLocalCompetitions(competitionsData as Competition[])
        setCompetitions(competitionsData as Competition[])
        setLocalCourses(coursesData as Course[])
      } catch (error) {
        console.error("[v0] Error loading competition data:", error)
      }
    }

    loadData()
  }, [currentTournament?.id])

  const tournamentCourses = localCourses

  const course = tournamentCourses.find((c) => c.id === selectedCourse)
  const numberOfDays = currentTournament?.numberOfDays || 2
  const hasPlayAroundDay = currentTournament?.hasPlayAroundDay || false

  const toggleCompetition = async (
    holeNumber: number,
    type: "closest-to-pin" | "longest-drive" | "straightest-drive",
    day: number,
  ) => {
    if (!selectedCourse) {
      alert("Please select a course first")
      return
    }

    if (!currentTournament?.id) return

    setLoading(true)
    try {
      const existing = localCompetitions.find(
        (c) => c.holeNumber === holeNumber && c.type === type && c.day === day && c.courseId === selectedCourse,
      )

      if (existing) {
        // Competition exists, delete it (toggle off)
        await deleteCompetition(existing.id!)
      } else {
        console.log("[v0] About to create competition with params:", {
          type,
          holeNumber,
          day,
          courseId: selectedCourse,
          tournamentId: currentTournament.id,
        })

        // Competition doesn't exist, create it (toggle on)
        await createCompetition({
          type,
          holeNumber, // Ensure holeNumber is explicitly passed
          day,
          courseId: selectedCourse,
          tournamentId: currentTournament.id,
        })
      }

      // Reload competitions from database
      const updatedCompetitions = await getCompetitionsByTournament(currentTournament.id)
      setLocalCompetitions(updatedCompetitions as Competition[])
      setCompetitions(updatedCompetitions as Competition[])
    } catch (error) {
      console.error("[v0] Error toggling competition:", error)
      alert("Failed to update competition. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const isCompetitionEnabled = (
    holeNumber: number,
    type: "closest-to-pin" | "longest-drive" | "straightest-drive",
    day: number,
  ) => {
    return localCompetitions.some(
      (c) => c.holeNumber === holeNumber && c.type === type && c.day === day && c.courseId === selectedCourse,
    )
  }

  const getCompetitionLeader = (
    holeNumber: number,
    type: "closest-to-pin" | "longest-drive" | "straightest-drive",
    day: number,
  ) => {
    const comp = localCompetitions.find((c) => c.holeNumber === holeNumber && c.type === type && c.day === day)
    if (!comp) return null

    const entries = competitionEntries.filter((e) => e.competitionId === comp.id)
    if (entries.length === 0) return null

    const bestEntry = entries.reduce((best, current) => {
      if (type === "closest-to-pin" || type === "straightest-drive") {
        return current.distance < best.distance ? current : best
      } else {
        return current.distance > best.distance ? current : best
      }
    })

    const player = players.find((p) => p.id === bestEntry.playerId)
    return {
      player: player?.name || "Unknown",
      distance: bestEntry.distance,
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Competition Management
          </CardTitle>
          <CardDescription>Configure Closest to Pin and Longest Drive competitions for each hole</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="course-select">Select Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger id="course-select">
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {tournamentCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="day-select" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Select Day
              </Label>
              <Select value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(Number.parseInt(v))}>
                <SelectTrigger id="day-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hasPlayAroundDay && <SelectItem value="0">Play Around Day</SelectItem>}
                  {Array.from({ length: numberOfDays }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {course && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {course.holes.map((hole) => {
                  const ctpLeader = getCompetitionLeader(hole.holeNumber, "closest-to-pin", selectedDay)
                  const ldLeader = getCompetitionLeader(hole.holeNumber, "longest-drive", selectedDay)
                  const sdLeader = getCompetitionLeader(hole.holeNumber, "straightest-drive", selectedDay)

                  return (
                    <Card key={hole.holeNumber}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                          Hole {hole.holeNumber} - Par {hole.par}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-blue-900">Closest to Pin</p>
                              {ctpLeader && (
                                <p className="text-sm text-blue-700">
                                  Leader: {ctpLeader.player} - {ctpLeader.distance}m
                                </p>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={isCompetitionEnabled(hole.holeNumber, "closest-to-pin", selectedDay)}
                            onCheckedChange={() => toggleCompetition(hole.holeNumber, "closest-to-pin", selectedDay)}
                            disabled={loading}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-medium text-emerald-900">Longest Drive</p>
                              {ldLeader && (
                                <p className="text-sm text-emerald-700">
                                  Leader: {ldLeader.player} - {ldLeader.distance}m
                                </p>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={isCompetitionEnabled(hole.holeNumber, "longest-drive", selectedDay)}
                            onCheckedChange={() => toggleCompetition(hole.holeNumber, "longest-drive", selectedDay)}
                            disabled={loading}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Navigation className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="font-medium text-purple-900">Straightest Drive</p>
                              {sdLeader && (
                                <p className="text-sm text-purple-700">
                                  Leader: {sdLeader.player} - {sdLeader.distance}m from center
                                </p>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={isCompetitionEnabled(hole.holeNumber, "straightest-drive", selectedDay)}
                            onCheckedChange={() => toggleCompetition(hole.holeNumber, "straightest-drive", selectedDay)}
                            disabled={loading}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
