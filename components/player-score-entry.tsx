"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Check, Lock, Target, TrendingUp, Navigation } from "lucide-react"
import { Users } from "lucide-react"
import type {
  Player,
  Course,
  Round,
  HoleScore,
  User,
  Competition,
  CompetitionEntry,
  Group,
  Notification,
} from "@/lib/types"
import {
  createRound,
  updateRound,
  getRoundsByGroup, // Changed from getRoundsByPlayer to getRoundsByGroup
  createCompetitionEntry,
  updateCompetitionEntry,
  getEntriesByCompetition,
  createNotification,
} from "@/lib/supabase/db"
import { detectAchievements, postAchievement, checkAndPostCompetitionAchievement } from "@/lib/achievements"
import { PlayCircle } from "lucide-react"

type PlayerScoreEntryProps = {
  currentUser: User
  players: Player[]
  courses: Course[]
  groups: Group[]
  rounds: Round[]
  setRounds: (rounds: Round[]) => void
  competitions: Competition[]
  competitionEntries: CompetitionEntry[]
  setCompetitionEntries: (entries: CompetitionEntry[]) => void
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  onDataChange?: () => Promise<void> // Added onDataChange callback
}

// Calculate Stableford points based on strokes vs par with handicap
function calculateStablefordPoints(strokes: number, par: number, handicapStrokes: number): number {
  const netStrokes = strokes - handicapStrokes
  const diff = netStrokes - par

  if (diff <= -2) return 4 // Eagle or better
  if (diff === -1) return 3 // Birdie
  if (diff === 0) return 2 // Par
  if (diff === 1) return 1 // Bogey
  return 0 // Double bogey or worse
}

// For a 32 handicap: gets 1 stroke on all 18 holes + additional stroke on holes with stroke index 1-14
function getHandicapStrokesForHole(strokeIndex: number, totalHandicap: number, totalHoles: number): number {
  const baseStrokes = Math.floor(totalHandicap / totalHoles)
  const extraStrokes = totalHandicap % totalHoles
  const additionalStroke = strokeIndex <= extraStrokes ? 1 : 0
  return baseStrokes + additionalStroke
}

function calculateNetScore(strokes: number, handicapStrokes: number): number {
  return Math.max(0, strokes - handicapStrokes)
}

export function PlayerScoreEntry({
  currentUser,
  players,
  courses,
  groups,
  rounds,
  setRounds,
  competitions,
  competitionEntries,
  setCompetitionEntries,
  notifications,
  setNotifications,
  onDataChange, // Added onDataChange callback
}: PlayerScoreEntryProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [currentHole, setCurrentHole] = useState(1)
  const [holeScores, setHoleScores] = useState<{ [holeNumber: number]: string }>({})
  const [competitionDistances, setCompetitionDistances] = useState<{
    [key: string]: string
  }>({})
  const [showStartingTeePrompt, setShowStartingTeePrompt] = useState(false)
  const [savedSession, setSavedSession] = useState<{
    groupId: string
    playerId: string
    groupName: string
    playerName: string
    hole: number
  } | null>(null)

  const isNavigatingRef = useRef(false)
  const isSavingRef = useRef(false)
  const lastSavedScoresRef = useRef<string>("")

  // Get groups that the current user is part of
  const myGroups = useMemo(() => {
    return groups.filter((g) => g.playerIds.includes(currentUser.id))
  }, [groups, currentUser.id])

  // Get the selected group
  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId)
  }, [groups, selectedGroupId])

  // Get players in the selected group
  const groupPlayers = useMemo(() => {
    if (!selectedGroup) return []
    return players.filter((p) => selectedGroup.playerIds.includes(p.id))
  }, [selectedGroup, players])

  // Get the course for the selected group
  const course = useMemo(() => {
    if (!selectedGroup) return null
    const foundCourse = courses.find((c) => c.id === selectedGroup.courseId)
    console.log("[v0] Course lookup:", {
      selectedGroupCourseId: selectedGroup.courseId,
      foundCourse: foundCourse
        ? {
            id: foundCourse.id,
            name: foundCourse.name,
            hasHoles: !!foundCourse.holes,
            holesLength: foundCourse.holes?.length || 0,
            firstHole: foundCourse.holes?.[0],
          }
        : null,
    })
    return foundCourse
  }, [selectedGroup, courses])

  // Get existing round for selected player
  const existingRound = useMemo(() => {
    if (!selectedGroupId || !selectedPlayerId) return null
    return rounds.find((r) => r.groupId === selectedGroupId && r.playerId === selectedPlayerId)
  }, [rounds, selectedGroupId, selectedPlayerId])

  useEffect(() => {
    if (!currentUser.tournamentId || !selectedGroupId) return

    const loadData = async () => {
      try {
        const groupRounds = await getRoundsByGroup(selectedGroupId)
        setRounds(groupRounds as Round[])
      } catch (error) {
        console.error("[v0] Error loading score data:", error)
      }
    }

    loadData()
  }, [currentUser.tournamentId, selectedGroupId]) // Load rounds whenever group changes

  useEffect(() => {
    if (!selectedGroupId || !selectedPlayerId) {
      setHoleScores({})
      setCurrentHole(1)
      lastSavedScoresRef.current = ""
      return
    }

    const existingPlayerRound = rounds.find((r) => r.groupId === selectedGroupId && r.playerId === selectedPlayerId)

    if (existingPlayerRound && existingPlayerRound.holes && existingPlayerRound.holes.length > 0) {
      const scores: { [holeNumber: number]: string } = {}
      existingPlayerRound.holes.forEach((hole) => {
        scores[hole.holeNumber] = hole.strokes.toString()
      })

      const scoresKey = JSON.stringify(scores)
      if (scoresKey !== lastSavedScoresRef.current && !isNavigatingRef.current) {
        setHoleScores(scores)
        lastSavedScoresRef.current = scoresKey

        const storageKey = `currentHole_${selectedGroupId}_${selectedPlayerId}`
        const savedHole = localStorage.getItem(storageKey)

        if (savedHole && Number.parseInt(savedHole) > 0) {
          // Restore the saved hole
          const holeNumber = Number.parseInt(savedHole)
          console.log("[v0] Restoring current hole from localStorage:", holeNumber)
          setCurrentHole(holeNumber)
        } else if (course) {
          // Find first unscored hole if no saved hole
          const firstUnscoredHole = course.holes.find(
            (hole) => !scores[hole.holeNumber] || scores[hole.holeNumber] === "0",
          )

          if (firstUnscoredHole) {
            console.log("[v0] Navigating to first unscored hole:", firstUnscoredHole.holeNumber)
            setCurrentHole(firstUnscoredHole.holeNumber)
          } else if (existingPlayerRound.submitted) {
            // If round is submitted, stay on hole 1 to view scores
            setCurrentHole(1)
          } else {
            // All holes have scores but not submitted, go to last hole
            setCurrentHole(course.holes.length)
          }
        }
      }
    } else if (!isNavigatingRef.current) {
      setHoleScores({})
      const storageKey = `currentHole_${selectedGroupId}_${selectedPlayerId}`
      const savedHole = localStorage.getItem(storageKey)

      if (savedHole && Number.parseInt(savedHole) > 0) {
        const holeNumber = Number.parseInt(savedHole)
        console.log("[v0] Restoring current hole from localStorage (no scores):", holeNumber)
        setCurrentHole(holeNumber)
      } else {
        setCurrentHole(1)
      }
      lastSavedScoresRef.current = ""
    }
  }, [selectedGroupId, selectedPlayerId, rounds, course]) // Added course to dependencies

  useEffect(() => {
    if (selectedGroup && selectedPlayerId && !existingRound) {
      if (selectedGroup.startingHole === undefined) {
        setShowStartingTeePrompt(true)
      }
    }
  }, [selectedGroup, selectedPlayerId, existingRound])

  const isLocked = existingRound?.submitted || false

  useEffect(() => {
    if (existingRound) {
      console.log("[v0] Existing round:", {
        id: existingRound.id,
        submitted: existingRound.submitted,
        completed: existingRound.completed,
        isLocked,
      })
    }
  }, [existingRound, isLocked])

  useEffect(() => {
    if (selectedGroupId && onDataChange) {
      onDataChange()
    }
  }, [selectedGroupId])

  const saveProgress = async () => {
    if (!selectedGroupId || !selectedPlayerId || !course || !currentUser.tournamentId || isSavingRef.current) {
      return
    }

    const player = players.find((p) => p.id === selectedPlayerId)
    if (!player) {
      return
    }

    const hasScores = Object.values(holeScores).some((score) => score && Number.parseInt(score) > 0)
    if (!hasScores) {
      return
    }

    isSavingRef.current = true

    try {
      const handicapToUse = existingRound?.handicapUsed || player.handicap

      const holes: HoleScore[] = course.holes.map((hole) => {
        const strokes = Number.parseInt(holeScores[hole.holeNumber] || "0") || 0
        const handicapStrokes = getHandicapStrokesForHole(
          hole.strokeIndex || hole.holeNumber,
          handicapToUse,
          course.holes.length,
        )
        const points = calculateStablefordPoints(strokes, hole.par, handicapStrokes)
        const netScore = strokes > 0 ? calculateNetScore(strokes, handicapStrokes) : 0

        if (strokes > 0 && hole.holeNumber === currentHole) {
          const netStrokes = strokes - handicapStrokes

          // Prepare hole data for achievement detection
          const holesWithPar = course.holes.slice(0, hole.holeNumber).map((h) => ({
            holeNumber: h.holeNumber,
            strokes: Number.parseInt(holeScores[h.holeNumber] || "0") || 0,
            par: h.par,
          }))

          const currentHoleWithPar = {
            holeNumber: hole.holeNumber,
            strokes: strokes, // Use gross strokes, not netStrokes
            par: hole.par,
          }

          const previousHolesWithPar = holesWithPar.slice(0, -1)

          console.log(
            "[v0] Checking for achievements on hole",
            hole.holeNumber,
            "with",
            strokes,
            "strokes vs par",
            hole.par,
          )

          console.log("[v0] Calling detectAchievements with:", {
            currentHole: currentHoleWithPar,
            previousHoles: previousHolesWithPar,
          })

          // Detect and post achievements
          detectAchievements([currentHoleWithPar], previousHolesWithPar)
            .then((achievements) => {
              console.log("[v0] Achievements detected:", achievements)
              if (achievements.length > 0) {
                achievements.forEach((achievement) => {
                  console.log("[v0] Posting achievement:", achievement)
                  postAchievement(achievement, player.name, currentUser.tournamentId!)
                    .then(() => {
                      console.log("[v0] Achievement posted successfully")
                    })
                    .catch((error) => {
                      console.error("[v0] Error posting achievement:", error)
                    })
                })
              } else {
                console.log("[v0] No achievements detected for this hole")
              }
            })
            .catch((error) => {
              console.error("[v0] Error detecting achievements:", error)
            })
        }

        return {
          holeNumber: hole.holeNumber,
          strokes,
          points,
          netScore,
          penalty: 0,
        }
      })

      const totalGross = holes.reduce((sum, h) => sum + h.strokes, 0)
      const totalPoints = holes.reduce((sum, h) => sum + h.points, 0)
      const allHolesEntered = holes.every((h) => h.strokes > 0)

      const roundData = {
        groupId: selectedGroupId,
        playerId: selectedPlayerId,
        tournamentId: currentUser.tournamentId,
        day: selectedGroup?.day || 1,
        holes,
        totalGross,
        totalPoints,
        completed: allHolesEntered,
        submitted: false, // This should always be false when saving progress
        handicapUsed: handicapToUse, // Store the handicap used for this round
      }

      console.log("[v0] Saving round with data:", {
        hasExistingRound: !!existingRound?.id,
        existingRoundId: existingRound?.id,
        submitted: roundData.submitted,
        completed: roundData.completed,
      })

      let savedRound: Round
      if (existingRound?.id) {
        savedRound = await updateRound(existingRound.id, roundData)
      } else {
        savedRound = await createRound(roundData)
      }

      console.log("[v0] Saved round returned:", {
        id: savedRound.id,
        submitted: savedRound.submitted,
        completed: savedRound.completed,
      })

      const updatedRounds = existingRound
        ? rounds.map((r) => (r.id === existingRound.id ? savedRound : r))
        : [...rounds, savedRound]

      setRounds(updatedRounds)
      lastSavedScoresRef.current = JSON.stringify(holeScores)
    } catch (error) {
      console.error("[v0] Error saving round:", error)
    } finally {
      isSavingRef.current = false
    }
  }

  const updateHoleScore = (holeNumber: number, value: string) => {
    if (isLocked) return
    setHoleScores({ ...holeScores, [holeNumber]: value })
  }

  const submitRound = async () => {
    if (!selectedGroupId || !selectedPlayerId || !course || !currentUser.tournamentId) return

    const player = players.find((p) => p.id === selectedPlayerId)
    if (!player) return

    const handicapToUse = existingRound?.handicapUsed || player.handicap

    const holes: HoleScore[] = course.holes.map((hole) => {
      const strokes = Number.parseInt(holeScores[hole.holeNumber] || "0") || 0
      const handicapStrokes = getHandicapStrokesForHole(
        hole.strokeIndex || hole.holeNumber,
        handicapToUse, // Use round-specific handicap
        course.holes.length,
      )
      const points = calculateStablefordPoints(strokes, hole.par, handicapStrokes)
      const netScore = strokes > 0 ? calculateNetScore(strokes, handicapStrokes) : 0

      return {
        holeNumber: hole.holeNumber,
        strokes,
        points,
        netScore, // Include net score in hole data
        penalty: 0,
      }
    })

    const allHolesEntered = holes.every((h) => h.strokes > 0)

    if (!allHolesEntered) {
      const missingHoles = holes
        .filter((h) => h.strokes === 0)
        .map((h) => h.holeNumber)
        .join(", ")
      alert(
        `Please enter scores for all ${course.holes.length} holes before submitting!\n\nMissing holes: ${missingHoles}`,
      )
      return
    }

    const totalGross = holes.reduce((sum, h) => sum + h.strokes, 0)
    const totalPoints = holes.reduce((sum, h) => sum + h.points, 0)

    const roundData = {
      groupId: selectedGroupId,
      playerId: selectedPlayerId,
      tournamentId: currentUser.tournamentId,
      day: selectedGroup?.day || 1,
      holes,
      totalGross,
      totalPoints,
      completed: true,
      submitted: true,
      handicapUsed: handicapToUse, // Store the handicap used for this round
    }

    try {
      let savedRound: Round
      if (existingRound?.id) {
        savedRound = await updateRound(existingRound.id, roundData)
      } else {
        savedRound = await createRound(roundData)
      }

      const updatedRounds = existingRound
        ? rounds.map((r) => (r.id === existingRound.id ? savedRound : r))
        : [...rounds, savedRound]

      setRounds(updatedRounds)

      await createNotification(
        "score",
        "Round Submitted!",
        `${player.name} completed their round with ${totalPoints} points (${totalGross} strokes)`,
      )

      alert(`Score submitted and locked!\n\nTotal Strokes: ${totalGross}\nTotal Points: ${totalPoints}`)
    } catch (error) {
      console.error("[v0] Error submitting round:", error)
      alert("Failed to submit round. Please try again.")
    }
  }

  const getPlayerRoundStatus = (playerId: string) => {
    if (!selectedGroupId) return null
    const round = rounds.find((r) => r.groupId === selectedGroupId && r.playerId === playerId)
    if (!round) return "Not started"
    if (round.submitted) return `Submitted (${round.totalPoints} pts)`
    if (round.completed) return `Ready to submit (${round.totalPoints} pts)`
    return "In progress"
  }

  const goToNextHole = async () => {
    if (isLocked || !course || currentHole >= course.holes.length) {
      return
    }

    isNavigatingRef.current = true

    try {
      await saveProgress()
    } catch (error) {
      console.error("Error saving progress:", error)
    }

    setCurrentHole((prev) => prev + 1)

    setTimeout(() => {
      isNavigatingRef.current = false
    }, 100)
  }

  const goToPreviousHole = async () => {
    if (isLocked || currentHole <= 1) {
      return
    }

    isNavigatingRef.current = true

    try {
      await saveProgress()
    } catch (error) {
      console.error("Error saving progress:", error)
    }

    setCurrentHole((prev) => prev - 1)

    setTimeout(() => {
      isNavigatingRef.current = false
    }, 100)
  }

  const currentHoleData = course?.holes.find((h) => h.holeNumber === currentHole)
  const player = players.find((p) => p.id === selectedPlayerId)

  const activeCompetitions = useMemo(() => {
    const filtered = competitions.filter(
      (c) => c.holeNumber === currentHole && c.enabled && c.day === selectedGroup?.day,
    )

    console.log("[v0] Competition filtering:", {
      currentHole,
      selectedGroupDay: selectedGroup?.day,
      allCompetitions: competitions.map((c) => ({
        id: c.id,
        type: c.type,
        hole: c.holeNumber,
        day: c.day,
        enabled: c.enabled,
        courseId: c.courseId,
      })),
      filteredCompetitions: filtered.map((c) => ({
        id: c.id,
        type: c.type,
        hole: c.holeNumber,
        day: c.day,
      })),
      filterCriteria: {
        currentHole,
        groupDay: selectedGroup?.day,
        hasGroup: !!selectedGroup,
      },
    })

    return filtered
  }, [competitions, currentHole, selectedGroup]) // Updated dependency to selectedGroup

  const getCompetitionLeader = (
    competitionId: string,
    type: "closest-to-pin" | "longest-drive" | "straightest-drive",
  ) => {
    const entries = competitionEntries.filter((e) => e.competitionId === competitionId)
    if (entries.length === 0) return null

    const bestEntry = entries.reduce((best, current) => {
      if (type === "closest-to-pin" || type === "straightest-drive") {
        return current.distance < best.distance ? current : best
      } else {
        return current.distance > best.distance ? current : best
      }
    })

    const player = players.find((p) => p.id === bestEntry.playerId)
    return { player: player?.name || "Unknown", distance: bestEntry.distance }
  }

  const submitCompetitionEntry = async (
    competitionId: string,
    type: "closest-to-pin" | "longest-drive" | "straightest-drive",
    holeNumber: number,
  ) => {
    if (!currentUser.tournamentId) return

    const existingEntry = competitionEntries.find(
      (e) => e.competitionId === competitionId && e.playerId === selectedPlayerId,
    )

    try {
      console.log("[v0] Submitting competition entry:", {
        competitionId,
        type,
        holeNumber,
        playerId: selectedPlayerId,
        existingEntry: existingEntry?.id,
      })

      const entryData = {
        competitionId,
        playerId: selectedPlayerId,
        groupId: selectedGroupId,
        tournamentId: currentUser.tournamentId,
        distance: 0,
        timestamp: new Date().toISOString(),
      }

      if (existingEntry) {
        await updateCompetitionEntry(existingEntry.id!, 0)
      } else {
        await createCompetitionEntry(entryData)
      }

      const updatedEntriesForCompetition = await getEntriesByCompetition(competitionId)
      console.log("[v0] Updated competition entries for this competition:", {
        competitionId,
        type,
        entryCount: updatedEntriesForCompetition.length,
        entries: updatedEntriesForCompetition.map((e) => ({
          id: e.id,
          playerId: e.playerId,
          competitionId: e.competitionId,
          distance: e.distance,
        })),
      })

      // Merge the updated entries for this competition with entries from other competitions
      setCompetitionEntries((prevEntries) => {
        // Remove old entries for this competition
        const otherEntries = prevEntries.filter((e) => e.competitionId !== competitionId)
        // Add the updated entries for this competition
        return [...otherEntries, ...(updatedEntriesForCompetition as CompetitionEntry[])]
      })

      if (player?.name) {
        console.log("[v0] Posting competition achievement for:", {
          type,
          playerName: player.name,
          holeNumber,
        })
        await checkAndPostCompetitionAchievement(type, player.name, currentUser.tournamentId, holeNumber)
      }

      alert(
        `${type === "closest-to-pin" ? "Closest to Pin" : type === "longest-drive" ? "Longest Drive" : "Straightest Drive"} entry submitted!`,
      )
    } catch (error) {
      console.error("[v0] Error submitting competition entry:", error)
      alert("Failed to submit competition entry")
    }
  }

  const setStartingTee = (hole: number) => {
    if (!selectedGroup) return

    const updatedGroups = groups.map((g) => (g.id === selectedGroup.id ? { ...g, startingHole: hole } : g))
    // This would need to be passed up to parent to update groups
    setShowStartingTeePrompt(false)
    setCurrentHole(hole)
  }

  const addNotification = async (type: Notification["type"], title: string, message: string) => {
    if (!currentUser.tournamentId) return

    try {
      await createNotification({
        tournamentId: currentUser.tournamentId,
        playerId: selectedPlayerId,
        type,
        title,
        message,
        read: false,
      })

      // Also trigger data refresh if callback provided
      if (onDataChange) {
        await onDataChange()
      }
    } catch (error) {
      console.error("[v0] Error creating notification:", error)
    }
  }

  useEffect(() => {
    if (selectedGroupId && selectedPlayerId && currentHole > 0) {
      const storageKey = `currentHole_${selectedGroupId}_${selectedPlayerId}`
      localStorage.setItem(storageKey, currentHole.toString())
      console.log("[v0] Saved current hole to localStorage:", { hole: currentHole, key: storageKey })
    }
  }, [currentHole, selectedGroupId, selectedPlayerId])

  useEffect(() => {
    const savedSessionKey = `scoringSession_${currentUser.tournamentId}_${currentUser.id}`
    const savedData = localStorage.getItem(savedSessionKey)

    if (savedData) {
      try {
        const session = JSON.parse(savedData)
        // Verify the group and player still exist
        const groupExists = groups.find((g) => g.id === session.groupId)
        const playerExists = players.find((p) => p.id === session.playerId)

        if (groupExists && playerExists && !selectedGroupId && !selectedPlayerId) {
          setSavedSession(session)
        } else if (!groupExists || !playerExists) {
          // Clean up invalid session
          localStorage.removeItem(savedSessionKey)
        }
      } catch (e) {
        console.error("[v0] Error loading saved session:", e)
        localStorage.removeItem(savedSessionKey)
      }
    }
  }, [currentUser.tournamentId, currentUser.id, groups, players, selectedGroupId, selectedPlayerId])

  useEffect(() => {
    if (selectedGroupId && selectedPlayerId) {
      const group = groups.find((g) => g.id === selectedGroupId)
      const player = players.find((p) => p.id === selectedPlayerId)

      if (group && player) {
        const courseName = courses.find((c) => c.id === group.courseId)?.name || "Unknown"
        const session = {
          groupId: selectedGroupId,
          playerId: selectedPlayerId,
          groupName: `${group.name} - ${courseName} - Day ${group.day}`,
          playerName: player.name,
          hole: currentHole,
        }

        const savedSessionKey = `scoringSession_${currentUser.tournamentId}_${currentUser.id}`
        localStorage.setItem(savedSessionKey, JSON.stringify(session))
      }
    }
  }, [
    selectedGroupId,
    selectedPlayerId,
    currentHole,
    groups,
    players,
    courses,
    currentUser.tournamentId,
    currentUser.id,
  ])

  useEffect(() => {
    if (selectedGroupId && selectedPlayerId && currentHole > 0) {
      const savedSessionKey = `scoringSession_${currentUser.tournamentId}_${currentUser.id}`
      const savedData = localStorage.getItem(savedSessionKey)

      if (savedData) {
        try {
          const session = JSON.parse(savedData)
          session.hole = currentHole
          localStorage.setItem(savedSessionKey, JSON.stringify(session))
        } catch (e) {
          console.error("[v0] Error updating session hole:", e)
        }
      }
    }
  }, [currentHole, selectedGroupId, selectedPlayerId, currentUser.tournamentId, currentUser.id])

  useEffect(() => {
    console.log("[v0] PlayerScoreEntry state:", {
      hasGroup: !!selectedGroup,
      groupId: selectedGroupId,
      hasPlayerId: !!selectedPlayerId,
      playerId: selectedPlayerId,
      hasCourse: !!course,
      courseId: course?.id,
      courseHolesCount: course?.holes?.length || 0,
      currentHole,
      hasPlayer: !!player,
      hasCurrentHoleData: !!currentHoleData,
      currentHoleDataDetails: currentHoleData
        ? {
            holeNumber: currentHoleData.holeNumber,
            par: currentHoleData.par,
            strokeIndex: currentHoleData.strokeIndex,
          }
        : null,
      canShowScorecard: !!selectedGroup && !!course && !!selectedPlayerId && !!player && !!currentHoleData,
    })
  }, [selectedGroup, selectedGroupId, course, selectedPlayerId, player, currentHoleData, currentHole])

  const handleResumeGame = () => {
    if (savedSession) {
      setSelectedGroupId(savedSession.groupId)
      setSelectedPlayerId(savedSession.playerId)
      setSavedSession(null) // Clear after resuming
    }
  }

  if (showStartingTeePrompt) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Starting Tee</CardTitle>
            <CardDescription>Which tee are you starting from?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setStartingTee(1)} className="w-full h-20 text-xl" variant="outline">
              Tee 1
            </Button>
            <Button onClick={() => setStartingTee(10)} className="w-full h-20 text-xl" variant="outline">
              Tee 10
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">
      {savedSession && !selectedPlayerId && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Resume Your Game</h3>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">{savedSession.playerName}</span>
                </div>
                <div>{savedSession.groupName}</div>
                <div>Currently on hole {savedSession.hole}</div>
              </div>
            </div>
            <Button onClick={handleResumeGame} className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              Resume
            </Button>
          </div>
        </div>
      )}

      {/* Group and Player Selection */}
      <Card>
        <CardHeader>
          <CardTitle>My Groups</CardTitle>
          <CardDescription>Select a group to enter scores</CardDescription>
        </CardHeader>
        <CardContent>
          {myGroups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              You are not assigned to any groups yet. Please contact the admin.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="group-select">Select Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger id="group-select">
                    <SelectValue placeholder="Choose a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {myGroups.map((group) => {
                      const courseName = courses.find((c) => c.id === group.courseId)?.name || "Unknown"
                      return (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} - {courseName} ({new Date(group.date).toLocaleDateString()}) - Day {group.day}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedGroup && (
                <div>
                  <Label htmlFor="player-select">Select Player to Score</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger id="player-select">
                      <SelectValue placeholder="Choose a player" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupPlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} (Handicap: {player.handicap}) - {getPlayerRoundStatus(player.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedGroup && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <p className="font-medium text-emerald-900">Players in this group:</p>
                  </div>
                  <div className="space-y-1">
                    {groupPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between text-sm">
                        <span className="text-emerald-800">
                          {player.name} (Handicap: {player.handicap})
                        </span>
                        <span className="text-emerald-600 font-medium">{getPlayerRoundStatus(player.id)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scorecard */}
      {selectedGroup && course && selectedPlayerId && player && currentHoleData && (
        <Card className="fixed inset-0 md:relative md:inset-auto flex flex-col h-screen md:h-auto z-50 overflow-hidden">
          <CardHeader className="flex-shrink-0 border-b">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedGroupId("")
                  setSelectedPlayerId("")
                }}
                className="mr-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <CardTitle>
                  Hole {currentHole} of {course.holes.length}
                </CardTitle>
                <CardDescription>
                  {player.name} - Par {currentHoleData.par} - SI{" "}
                  {currentHoleData.strokeIndex || currentHoleData.holeNumber}
                </CardDescription>
              </div>
              {isLocked && (
                <div className="flex items-center gap-2 text-amber-600">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">Locked</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-4 space-y-4 overflow-hidden">
            {activeCompetitions.length > 0 && (
              <div className="space-y-3">
                {activeCompetitions.map((comp) => {
                  const leader = getCompetitionLeader(comp.id, comp.type)
                  const key = `${comp.id}-${selectedPlayerId}`
                  const myEntry = competitionEntries.find(
                    (e) => e.competitionId === comp.id && e.playerId === selectedPlayerId,
                  )

                  return (
                    <div key={comp.id} className="mb-4">
                      <div className="flex items-center gap-2">
                        {comp.type === "closest-to-pin" ? (
                          <Target className="w-5 h-5 text-blue-600" />
                        ) : comp.type === "longest-drive" ? (
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Navigation className="w-5 h-5 text-purple-600" />
                        )}
                        <h3 className="font-semibold">
                          {comp.type === "closest-to-pin"
                            ? "Closest to Pin"
                            : comp.type === "longest-drive"
                              ? "Longest Drive"
                              : "Straightest Drive"}
                        </h3>
                      </div>

                      {leader && (
                        <div className="p-2 rounded bg-blue-100">
                          <p className="text-sm font-medium text-blue-900">Current Winner: {leader.player}</p>
                        </div>
                      )}

                      {myEntry && (
                        <div className="p-2 rounded bg-green-100">
                          <p className="text-sm font-medium text-green-900">You've claimed this!</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => submitCompetitionEntry(comp.id, comp.type, currentHole)}
                          disabled={isLocked}
                          variant="default"
                          className="bg-blue-600 hover:bg-blue-700 w-full"
                        >
                          {myEntry ? "Update Claim" : "I Won This!"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => updateHoleScore(currentHole, (currentHoleData.par - 1).toString())}
                  disabled={isLocked}
                  variant="outline"
                  className="h-14 text-xs font-semibold bg-blue-50"
                >
                  <div>
                    <div className="text-xs text-blue-600">BIRDIE</div>
                    <div className="text-lg">{currentHoleData.par - 1}</div>
                  </div>
                </Button>
                <Button
                  onClick={() => updateHoleScore(currentHole, currentHoleData.par.toString())}
                  disabled={isLocked}
                  variant="outline"
                  className="h-14 text-xs font-semibold bg-emerald-50"
                >
                  <div>
                    <div className="text-xs text-emerald-600">PAR</div>
                    <div className="text-lg">{currentHoleData.par}</div>
                  </div>
                </Button>
                <Button
                  onClick={() => updateHoleScore(currentHole, (currentHoleData.par + 1).toString())}
                  disabled={isLocked}
                  variant="outline"
                  className="h-14 text-xs font-semibold bg-amber-50"
                >
                  <div>
                    <div className="text-xs text-amber-600">BOGEY</div>
                    <div className="text-lg">{currentHoleData.par + 1}</div>
                  </div>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    const current = Number.parseInt(holeScores[currentHole] || "0")
                    if (current > 0) {
                      updateHoleScore(currentHole, (current - 1).toString())
                      saveProgress()
                    }
                  }}
                  disabled={isLocked}
                  className="h-20 w-16 text-2xl"
                >
                  -
                </Button>
                <div className="flex-1">
                  <Label className="text-xs">Strokes</Label>
                  <Input
                    type="number"
                    min="0"
                    max="15"
                    value={holeScores[currentHole] || ""}
                    onChange={(e) => updateHoleScore(currentHole, e.target.value)}
                    onBlur={saveProgress}
                    className="text-4xl font-bold text-center h-20"
                    placeholder="0"
                    disabled={isLocked}
                  />
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    const current = Number.parseInt(holeScores[currentHole] || "0")
                    updateHoleScore(currentHole, (current + 1).toString())
                    saveProgress()
                  }}
                  disabled={isLocked}
                  className="h-20 w-16 text-2xl"
                >
                  +
                </Button>
              </div>

              {(() => {
                const strokes = Number.parseInt(holeScores[currentHole] || "0") || 0
                const handicapToUse = existingRound?.handicapUsed || player.handicap
                const handicapStrokes = getHandicapStrokesForHole(
                  currentHoleData.strokeIndex || currentHoleData.holeNumber,
                  handicapToUse, // Use round-specific handicap
                  course.holes.length,
                )
                const points =
                  strokes > 0 ? calculateStablefordPoints(strokes, currentHoleData.par, handicapStrokes) : 0
                const netScore = strokes > 0 ? calculateNetScore(strokes, handicapStrokes) : 0

                return (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    {handicapStrokes > 0 && (
                      <span className="text-sm text-blue-600 font-medium">
                        +{handicapStrokes} stroke{handicapStrokes > 1 ? "s" : ""}
                      </span>
                    )}
                    {strokes > 0 && (
                      <span className="text-xl font-bold text-emerald-600">
                        {points} points / {netScore} net
                      </span>
                    )}
                  </div>
                )
              })()}
            </div>
          </CardContent>

          <div className="flex-shrink-0 border-t p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={goToPreviousHole}
                disabled={currentHole === 1 || isLocked}
                size="lg"
                variant="outline"
                className="flex-1 bg-transparent"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Prev
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">Hole</p>
                <p className="text-xl font-bold">
                  {currentHole}/{course.holes.length}
                </p>
              </div>

              {currentHole < course.holes.length ? (
                <Button onClick={goToNextHole} disabled={isLocked} size="lg" className="flex-1">
                  Next
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button onClick={submitRound} disabled={isLocked} size="lg" className="flex-1 bg-emerald-600">
                  <Check className="w-5 h-5 mr-2" />
                  Submit
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-900">Strokes</p>
                <p className="text-lg font-bold text-blue-700">
                  {course.holes.reduce((sum, hole) => {
                    const strokes = Number.parseInt(holeScores[hole.holeNumber] || "0") || 0
                    return sum + strokes
                  }, 0)}
                </p>
              </div>
              <div className="p-2 bg-emerald-50 rounded">
                <p className="text-xs text-emerald-900">Points</p>
                <p className="text-lg font-bold text-emerald-700">
                  {course.holes.reduce((sum, hole) => {
                    const strokes = Number.parseInt(holeScores[hole.holeNumber] || "0") || 0
                    if (strokes === 0) return sum
                    const handicapToUse = existingRound?.handicapUsed || player.handicap
                    const handicapStrokes = getHandicapStrokesForHole(
                      hole.strokeIndex || hole.holeNumber,
                      handicapToUse, // Use round-specific handicap
                      course.holes.length,
                    )
                    return sum + calculateStablefordPoints(strokes, hole.par, handicapStrokes)
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
