"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Users, Trash2, Calendar, Clock, AlertCircle } from "lucide-react"
import {
  createGroup,
  deleteGroup as deleteGroupFn,
  getGroupsByTournament,
  getCoursesByTournament,
  getTournamentById,
} from "@/lib/supabase/db"
import type { Player, Course, Group, Round } from "@/app/page"

type GroupManagementProps = {
  players: Player[]
  courses: Course[]
  groups: Group[]
  setGroups: (groups: Group[]) => void
  rounds: Round[]
  currentTournamentId: string | null
}

export function GroupManagement({
  players,
  courses,
  groups,
  setGroups,
  rounds,
  currentTournamentId,
}: GroupManagementProps) {
  const [localGroups, setLocalGroups] = useState<Group[]>([])
  const [localCourses, setLocalCourses] = useState<Course[]>([])
  const [newGroupName, setNewGroupName] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [groupDate, setGroupDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [teeTime, setTeeTime] = useState("")
  const [playerError, setPlayerError] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [numberOfDays, setNumberOfDays] = useState<number>(2)

  useEffect(() => {
    console.log("[v0] GroupManagement component mounted", {
      playersCount: players.length,
      coursesCount: courses.length,
      currentTournamentId,
    })
  }, [])

  useEffect(() => {
    console.log("[v0] Group form state:", {
      newGroupName,
      selectedCourseId,
      selectedPlayerIds,
      buttonDisabled: !newGroupName.trim() || !selectedCourseId || selectedPlayerIds.length === 0 || loading,
    })
  }, [newGroupName, selectedCourseId, selectedPlayerIds, loading])

  useEffect(() => {
    if (!currentTournamentId) return

    const loadCourses = async () => {
      try {
        const data = await getCoursesByTournament(currentTournamentId)
        setLocalCourses(data as Course[])
      } catch (error) {
        console.error("[v0] Error loading courses:", error)
      }
    }

    loadCourses()
  }, [currentTournamentId])

  useEffect(() => {
    if (!currentTournamentId) return

    const loadGroups = async () => {
      try {
        const data = await getGroupsByTournament(currentTournamentId)
        setLocalGroups(data as Group[])
        setGroups(data as Group[])
      } catch (error) {
        console.error("[v0] Error loading groups:", error)
      }
    }

    loadGroups()
  }, [currentTournamentId])

  useEffect(() => {
    if (!currentTournamentId) return

    const loadTournament = async () => {
      try {
        const tournament = await getTournamentById(currentTournamentId)
        if (tournament) {
          setNumberOfDays(tournament.numberOfDays || 2)
        }
      } catch (error) {
        console.error("[v0] Error loading tournament:", error)
      }
    }

    loadTournament()
  }, [currentTournamentId])

  const tournamentGroups = currentTournamentId ? localGroups.filter((g) => g.tournamentId === currentTournamentId) : []
  const tournamentPlayers = currentTournamentId ? players.filter((p) => p.tournamentId === currentTournamentId) : []
  const tournamentCourses = currentTournamentId
    ? localCourses.filter((c) => c.tournamentId === currentTournamentId)
    : []

  const isPlayerInGroupForDay = (playerId: string, day: number): boolean => {
    return tournamentGroups.some((group) => group.day === day && group.playerIds.includes(playerId))
  }

  const getPlayerGroupForDay = (playerId: string, day: number): string | null => {
    const group = tournamentGroups.find((g) => g.day === day && g.playerIds.includes(playerId))
    return group ? group.name : null
  }

  const togglePlayer = (playerId: string) => {
    if (!selectedPlayerIds.includes(playerId)) {
      if (isPlayerInGroupForDay(playerId, selectedDay)) {
        const groupName = getPlayerGroupForDay(playerId, selectedDay)
        const playerName = tournamentPlayers.find((p) => p.id === playerId)?.name || "This player"
        setPlayerError(`${playerName} is already in "${groupName}" for Day ${selectedDay}`)
        setTimeout(() => setPlayerError(""), 5000)
        return
      }
    }

    setPlayerError("")

    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== playerId))
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, playerId])
    }
  }

  const convertTimeToTimestamp = (timeStr: string, dateStr: string): string | undefined => {
    if (!timeStr || !timeStr.trim()) return undefined

    try {
      // Remove spaces and convert to lowercase
      const cleanTime = timeStr.trim().toLowerCase().replace(/\s+/g, "")

      // Parse time with AM/PM
      let hours = 0
      let minutes = 0

      if (cleanTime.includes("am") || cleanTime.includes("pm")) {
        const isPM = cleanTime.includes("pm")
        const timeOnly = cleanTime.replace(/am|pm/g, "")
        const [hoursStr, minutesStr = "0"] = timeOnly.split(":")

        hours = Number.parseInt(hoursStr, 10)
        minutes = Number.parseInt(minutesStr, 10)

        // Convert to 24-hour format
        if (isPM && hours !== 12) {
          hours += 12
        } else if (!isPM && hours === 12) {
          hours = 0
        }
      } else {
        // Parse 24-hour format
        const [hoursStr, minutesStr = "0"] = cleanTime.split(":")
        hours = Number.parseInt(hoursStr, 10)
        minutes = Number.parseInt(minutesStr, 10)
      }

      // Validate hours and minutes
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error("[v0] Invalid time format:", timeStr)
        return undefined
      }

      // Create ISO timestamp by combining date and time
      const timestamp = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
      return timestamp
    } catch (error) {
      console.error("[v0] Error parsing time:", error)
      return undefined
    }
  }

  const handleCreateGroup = async () => {
    console.log("[v0] handleCreateGroup called")

    if (!newGroupName.trim() || !selectedCourseId || selectedPlayerIds.length === 0 || !currentTournamentId) {
      console.log("[v0] Group creation blocked:", {
        hasName: !!newGroupName.trim(),
        hasCourse: !!selectedCourseId,
        hasPlayers: selectedPlayerIds.length > 0,
        hasTournament: !!currentTournamentId,
      })
      return
    }

    console.log("[v0] Creating group:", {
      name: newGroupName,
      courseId: selectedCourseId,
      date: groupDate,
      playerIds: selectedPlayerIds,
      day: selectedDay,
      teeTime: teeTime || undefined,
    })

    setLoading(true)
    try {
      const teeTimeTimestamp = teeTime ? convertTimeToTimestamp(teeTime, groupDate) : undefined

      await createGroup({
        name: newGroupName.trim(),
        courseId: selectedCourseId,
        date: groupDate,
        playerIds: selectedPlayerIds,
        day: selectedDay,
        teeTime: teeTimeTimestamp,
        tournamentId: currentTournamentId,
      })

      console.log("[v0] Group created successfully")

      const updatedGroups = await getGroupsByTournament(currentTournamentId)
      console.log("[v0] Loaded groups:", updatedGroups.length)
      setLocalGroups(updatedGroups as Group[])
      setGroups(updatedGroups as Group[])

      setNewGroupName("")
      setSelectedCourseId("")
      setSelectedPlayerIds([])
      setGroupDate(new Date().toISOString().split("T")[0])
      setSelectedDay(1)
      setTeeTime("")
      setPlayerError("")
    } catch (error) {
      console.error("[v0] Error creating group:", error)
      alert("Failed to create group. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return

    setLoading(true)
    try {
      await deleteGroupFn(id)

      const updatedGroups = await getGroupsByTournament(currentTournamentId!)
      setLocalGroups(updatedGroups as Group[])
      setGroups(updatedGroups as Group[])
    } catch (error) {
      console.error("[v0] Error deleting group:", error)
      alert("Failed to delete group. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getCourseName = (courseId: string) => {
    return localCourses.find((c) => c.id === courseId)?.name || "Unknown Course"
  }

  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name || "Unknown"
  }

  const getGroupProgress = (group: Group) => {
    const groupRounds = rounds.filter((r) => r.groupId === group.id)
    const completedRounds = groupRounds.filter((r) => r.completed).length
    return `${completedRounds}/${group.playerIds.length}`
  }

  const formatTeeTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return "No time set"

    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return "Invalid time"

      // Format as "h:mm AM/PM"
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch (error) {
      console.error("[v0] Error formatting tee time:", error)
      return "Invalid time"
    }
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "No date set"

    try {
      // Parse the date string (YYYY-MM-DD format from database)
      const [year, month, day] = dateStr.split("-").map(Number)
      const date = new Date(year, month - 1, day)

      if (isNaN(date.getTime())) return "Invalid date"

      // Format as "Mon, Jan 1, 2025"
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("[v0] Error formatting date:", error)
      return "Invalid date"
    }
  }

  const createDay2Groups = async () => {
    const day1Groups = tournamentGroups.filter((g) => g.day === 1)
    const day1Rounds = rounds.filter((r) => {
      const group = tournamentGroups.find((g) => g.id === r.groupId)
      return group?.day === 1
    })

    const playerPoints = new Map<string, number>()
    day1Rounds.forEach((round) => {
      const current = playerPoints.get(round.playerId) || 0
      playerPoints.set(round.playerId, current + round.totalPoints)
    })

    const sortedPlayers = Array.from(playerPoints.entries())
      .sort((a, b) => a[1] - b[1])
      .map((entry) => entry[0])

    const groupSize = 4
    const numGroups = Math.ceil(sortedPlayers.length / groupSize)
    const newGroups: Group[] = []

    setLoading(true)
    try {
      for (let i = 0; i < numGroups; i++) {
        const startIdx = i * groupSize
        const endIdx = Math.min(startIdx + groupSize, sortedPlayers.length)
        const groupPlayerIds = sortedPlayers.slice(startIdx, endIdx)

        const courseId = day1Groups[0]?.courseId || tournamentCourses[0]?.id || ""

        await createGroup({
          name: `Day 2 - Group ${String.fromCharCode(65 + i)}`,
          courseId,
          date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          playerIds: groupPlayerIds,
          day: 2,
          tournamentId: currentTournamentId!,
        })
      }

      const updatedGroups = await getGroupsByTournament(currentTournamentId!)
      setLocalGroups(updatedGroups as Group[])
      setGroups(updatedGroups as Group[])

      alert(`Created ${numGroups} groups for Day 2 based on Day 1 standings!`)
    } catch (error) {
      console.error("[v0] Error creating Day 2 groups:", error)
      alert("Failed to create Day 2 groups. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Group</CardTitle>
          <CardDescription>Assign players to a group for a round on a specific course</CardDescription>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="group-name">Group Name</Label>
                  <input
                    id="group-name"
                    type="text"
                    placeholder="e.g., Morning Group A"
                    value={newGroupName}
                    onFocus={() => console.log("[v0] Group name input focused")}
                    onBlur={() => console.log("[v0] Group name input blurred, value:", newGroupName)}
                    onChange={(e) => {
                      console.log("[v0] Group name changed:", e.target.value)
                      setNewGroupName(e.target.value)
                    }}
                    disabled={loading}
                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <Label htmlFor="group-date">Date</Label>
                  <Input
                    id="group-date"
                    type="date"
                    value={groupDate}
                    onChange={(e) => setGroupDate(e.target.value)}
                    disabled={loading}
                    className="h-12 text-lg"
                  />
                </div>

                <div>
                  <Label htmlFor="day-select">Competition Day</Label>
                  <Select
                    value={selectedDay.toString()}
                    onValueChange={(v) => setSelectedDay(Number(v))}
                    disabled={loading}
                  >
                    <SelectTrigger id="day-select" className="h-12 text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: numberOfDays }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Day {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="tee-time">Tee Time (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="tee-time"
                    type="time"
                    value={teeTime}
                    onChange={(e) => setTeeTime(e.target.value)}
                    disabled={loading}
                    className="h-12 text-lg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="course-select">Course</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={loading}>
                  <SelectTrigger id="course-select" className="h-12 text-lg">
                    <SelectValue placeholder="Select course" />
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

              {playerError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{playerError}</p>
                </div>
              )}

              <div>
                <Label>Select Players ({selectedPlayerIds.length} selected)</Label>
                <div className="mt-2 max-h-64 overflow-y-auto border rounded-lg p-4 space-y-3">
                  {tournamentPlayers.map((player) => {
                    const alreadyInGroup = isPlayerInGroupForDay(player.id, selectedDay)
                    const groupName = getPlayerGroupForDay(player.id, selectedDay)

                    return (
                      <div key={player.id} className="flex items-center space-x-3 min-h-[44px]">
                        <Checkbox
                          id={`player-${player.id}`}
                          checked={selectedPlayerIds.includes(player.id)}
                          onCheckedChange={() => togglePlayer(player.id)}
                          disabled={(alreadyInGroup && !selectedPlayerIds.includes(player.id)) || loading}
                          className="w-6 h-6"
                        />
                        <label
                          htmlFor={`player-${player.id}`}
                          className={`text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 ${
                            alreadyInGroup && !selectedPlayerIds.includes(player.id) ? "text-muted-foreground" : ""
                          }`}
                        >
                          {player.name} (Handicap: {player.handicap})
                          {alreadyInGroup && !selectedPlayerIds.includes(player.id) && (
                            <span className="text-xs text-orange-600 ml-2">Already in {groupName}</span>
                          )}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Button
                onClick={() => {
                  console.log("[v0] Create Group button clicked")
                  handleCreateGroup()
                }}
                className="w-full h-12 text-lg"
                disabled={!newGroupName.trim() || !selectedCourseId || selectedPlayerIds.length === 0 || loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? "Creating..." : "Create Group"}
              </Button>

              {tournamentGroups.some((g) => g.day === 1) && !tournamentGroups.some((g) => g.day === 2) && (
                <Button
                  onClick={createDay2Groups}
                  className="w-full bg-transparent"
                  variant="outline"
                  disabled={loading}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {loading ? "Creating..." : "Auto-Create Day 2 Groups (Based on Day 1 Standings)"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Groups ({tournamentGroups.length})</CardTitle>
          <CardDescription>Manage playing groups and track progress</CardDescription>
        </CardHeader>
        <CardContent>
          {tournamentGroups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No groups created yet</p>
          ) : (
            <div className="space-y-4">
              {tournamentGroups
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((group) => (
                  <div key={group.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">
                            {group.name} <span className="text-xs text-muted-foreground">(Day {group.day})</span>
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(group.date)}
                          </p>
                          {group.teeTime && (
                            <p className="text-sm text-emerald-600 font-semibold flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3" />
                              Tee Time: {formatTeeTime(group.teeTime)}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">{getCourseName(group.courseId)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <p className="text-xs text-muted-foreground">Completed</p>
                          <p className="text-sm font-semibold">{getGroupProgress(group)}</p>
                        </div>
                        <Button
                          onClick={() => handleDeleteGroup(group.id)}
                          size="sm"
                          variant="destructive"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.playerIds.map((playerId) => (
                        <div key={playerId} className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                          <p className="text-sm text-emerald-900">{getPlayerName(playerId)}</p>
                        </div>
                      ))}
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
