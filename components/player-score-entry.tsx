"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Minus, Plus, Trophy } from "lucide-react" // Added Menu, Minus, Plus, Trophy
import { Users } from "lucide-react"
import type {
  Player,
  Course,
  Round,
  HoleScore,
  Competition,
  CompetitionEntry,
  Group,
  Notification,
  Tournament,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog" // Added Dialog components
import { PlayerLeaderboard } from "@/components/player-leaderboard" // Added PlayerLeaderboard component

type PlayerScoreEntryProps = {
  currentUser: { id: string; name: string; tournamentId: string; handicap: number } // Added handicap to currentUser
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
  onDataChange?: () => Promise<void>
  tournament: Tournament // Added tournament prop
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
  tournament, // Destructure tournament prop
}: PlayerScoreEntryProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [showReferenceScore] = useState(true) // Set showReferenceScore to true by default
  const [referenceScores, setReferenceScores] = useState<{ [hole: number]: number }>({})
  const [currentHole, setCurrentHole] = useState(1)
  const [holeScores, setHoleScores] = useState<{ [holeNumber: number]: string }>({})
  const [pickedUpHoles, setPickedUpHoles] = useState<{ [holeNumber: number]: boolean }>({})
  const [referencePickedUpHoles, setReferencePickedUpHoles] = useState<{ [holeNumber: number]: boolean }>({})
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

  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const [showDiscrepancyDialog, setShowDiscrepancyDialog] = useState(false)
  const [scoreDiscrepancies, setScoreDiscrepancies] = useState<
    Array<{ hole: number; official: number; reference: number }>
  >([])

  const [roundTimer, setRoundTimer] = useState("00:00:00")

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const hours = Math.floor(elapsed / 3600000)
      const minutes = Math.floor((elapsed % 3600000) / 60000)
      const seconds = Math.floor((elapsed % 60000) / 1000)
      setRoundTimer(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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
      totalCoursesAvailable: courses.length,
      allCourseIds: courses.map((c) => ({ id: c.id, name: c.name, hasHoles: !!c.holes })),
    })
    return foundCourse
  }, [selectedGroup, courses])

  // Get the currently selected player for reference scores
  const currentPlayer = useMemo(() => {
    return players.find((p) => p.id === selectedPlayerId) || null
  }, [players, selectedPlayerId])

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

  const handleExitScorecard = async () => {
    try {
      await saveProgress()
      setSelectedPlayerId("")
      setCurrentHole(1)
    } catch (error) {
      console.error("Error saving progress on exit:", error)
      setSelectedPlayerId("")
      setCurrentHole(1)
    }
  }

  const referenceTotal = useMemo(() => {
    let totalStrokes = 0
    let totalPoints = 0

    Object.entries(referenceScores).forEach(([holeNum, strokes]) => {
      const holeData = course?.holes?.find((h) => h.holeNumber === Number(holeNum))
      if (holeData && strokes > 0) {
        totalStrokes += strokes
        const handicapStrokes = getHandicapStrokesForHole(
          holeData.strokeIndex || holeData.holeNumber,
          currentPlayer?.handicap || 0,
          course?.holes?.length || 18,
        )
        totalPoints += calculateStablefordPoints(strokes, holeData.par, handicapStrokes)
      }
    })

    return { strokes: totalStrokes, points: totalPoints }
  }, [referenceScores, course?.holes, currentPlayer?.handicap, course?.holes?.length])

  const saveProgress = async () => {
    console.log("[v0] saveProgress called:", {
      selectedGroupId,
      selectedPlayerId,
      hasScores: Object.values(holeScores).some((score) => score && Number.parseInt(score) > 0),
      holeScores,
      isSaving: isSavingRef.current,
    })

    if (!selectedGroupId || !selectedPlayerId || !course || !currentUser.tournamentId || isSavingRef.current) {
      console.log("[v0] saveProgress early return - missing requirements")
      return
    }

    const player = players.find((p) => p.id === selectedPlayerId)
    if (!player) {
      console.log("[v0] saveProgress early return - player not found")
      return
    }

    const hasScores = Object.values(holeScores).some((score) => score && Number.parseInt(score) > 0)
    if (!hasScores) {
      console.log("[v0] saveProgress early return - no scores to save")
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
      console.log("[v0] saveProgress SUCCESS - round saved to database")
    } catch (error) {
      console.error("[v0] Error saving round:", error)
    } finally {
      isSavingRef.current = false
    }
  }

  const updateHoleScore = (holeNumber: number, value: string) => {
    if (isLocked) return
    console.log("[v0] updateHoleScore:", { holeNumber, value, currentHoleScores: holeScores })
    setHoleScores({ ...holeScores, [holeNumber]: value })
    if (pickedUpHoles[holeNumber]) {
      setPickedUpHoles({ ...pickedUpHoles, [holeNumber]: false })
    }
  }

  const markHoleAsPickedUp = (holeNumber: number) => {
    if (isLocked) return
    setPickedUpHoles({ ...pickedUpHoles, [holeNumber]: true })
    setHoleScores({ ...holeScores, [holeNumber]: "0" })
  }

  const markReferenceHoleAsPickedUp = (holeNumber: number) => {
    setReferencePickedUpHoles({ ...referencePickedUpHoles, [holeNumber]: true })
    setReferenceScores({ ...referenceScores, [holeNumber]: 0 })
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
        handicapToUse,
        course.holes.length,
      )
      const points = calculateStablefordPoints(strokes, hole.par, handicapStrokes)
      const netScore = strokes > 0 ? calculateNetScore(strokes, handicapStrokes) : 0

      return {
        holeNumber: hole.holeNumber,
        strokes,
        points,
        netScore,
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
      handicapUsed: handicapToUse,
    }

    console.log("[v0] Attempting to submit round:", {
      roundData,
      existingRoundId: existingRound?.id,
      playerName: player.name,
      courseHoles: course.holes.length,
    })

    if (selectedPlayerId === currentUser?.id && Object.keys(referenceScores).length > 0) {
      const discrepancies: Array<{ hole: number; official: number; reference: number }> = []

      Object.entries(referenceScores).forEach(([holeStr, refScore]) => {
        const holeNum = Number.parseInt(holeStr)
        const officialScore = Number.parseInt(holeScores[holeNum] || "0")

        if (refScore !== officialScore) {
          discrepancies.push({
            hole: holeNum,
            official: officialScore,
            reference: refScore,
          })
        }
      })

      if (discrepancies.length > 0) {
        console.log("[v0] Score discrepancies found:", discrepancies)
        setScoreDiscrepancies(discrepancies)
        setShowDiscrepancyDialog(true)
        return // Don't submit yet, show dialog first
      }
    }

    try {
      let savedRound: Round
      if (existingRound?.id) {
        console.log("[v0] Updating existing round:", existingRound.id)
        savedRound = await updateRound(existingRound.id, roundData)
      } else {
        console.log("[v0] Creating new round")
        savedRound = await createRound(roundData)
      }

      console.log("[v0] Round saved successfully:", savedRound)

      const updatedRounds = existingRound
        ? rounds.map((r) => (r.id === existingRound.id ? savedRound : r))
        : [...rounds, savedRound]

      setRounds(updatedRounds)

      await createNotification({
        tournamentId: currentUser.tournamentId,
        playerId: selectedPlayerId,
        type: "score",
        title: "Round Submitted!",
        message: `${player.name} completed their round with ${totalPoints} points (${totalGross} strokes)`,
        read: false,
      })

      alert(`Score submitted and locked!\n\nTotal Strokes: ${totalGross}\nTotal Points: ${totalPoints}`)

      setReferenceScores({})
      setSelectedPlayerId("")
      setCurrentHole(1)
    } catch (error) {
      console.error("[v0] Error submitting round:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        roundData,
        existingRoundId: existingRound?.id,
      })
      alert(
        `Failed to submit round. Please try again.\n\nError: ${error instanceof Error ? error.message : String(error)}`,
      )
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

  const currentHoleData = useMemo(() => {
    if (!course?.holes) {
      console.log("[v0] No holes data in course:", {
        hasCourse: !!course,
        courseId: course?.id,
        courseName: course?.name,
      })
      return null
    }
    const holeData = course.holes.find((h) => h.holeNumber === currentHole)
    console.log("[v0] Current hole data lookup:", {
      currentHole,
      foundHoleData: !!holeData,
      availableHoles: course.holes.map((h) => h.holeNumber),
      holeData,
    })
    return holeData
  }, [course, currentHole])

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
      console.error("[v0] Error submitting competition entry:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        competitionId,
        type,
        holeNumber,
        playerId: selectedPlayerId,
      })
      alert(`Failed to submit competition entry.\n\nError: ${error instanceof Error ? error.message : String(error)}`)
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

  // Fix: 'selectedPlayer' was used but not declared. It should be 'player'
  const playerHandicapStrokes =
    player && currentHoleData
      ? getHandicapStrokesForHole(currentHoleData.strokeIndex, player.handicap, course?.holes?.length || 18)
      : 0

  const currentUserHandicapStrokes =
    currentUser && currentHoleData && course?.holes?.length
      ? getHandicapStrokesForHole(currentHoleData.strokeIndex, currentUser.handicap, course.holes.length)
      : 0

  const calculateCurrentHolePoints = () => {
    if (!player || !currentHoleData) return 0

    // If hole is picked up, return 0 points
    if (pickedUpHoles[currentHole]) return 0

    const strokes = Number.parseInt(holeScores[currentHole] || "0") || 0
    const handicapToUse = existingRound?.handicapUsed || player.handicap
    const handicapStrokes = getHandicapStrokesForHole(
      currentHoleData.strokeIndex || currentHoleData.holeNumber,
      handicapToUse,
      course.holes.length,
    )
    return calculateStablefordPoints(strokes, currentHoleData.par, handicapStrokes)
  }

  const calculateReferenceHolePoints = () => {
    if (!currentUser || !currentHoleData) return 0

    // If hole is picked up, return 0 points
    if (referencePickedUpHoles[currentHole]) return 0

    const strokes = referenceScores[currentHole] || 0
    const handicapStrokes = getHandicapStrokesForHole(
      currentHoleData.strokeIndex || currentHoleData.holeNumber,
      currentUser.handicap, // Use currentUser's handicap for reference
      course.holes.length,
    )
    return calculateStablefordPoints(strokes, currentHoleData.par, handicapStrokes)
  }

  const totalGross = useMemo(() => {
    return (
      course?.holes.reduce((sum, hole) => {
        const strokes = Number.parseInt(holeScores[hole.holeNumber] || "0") || 0
        return sum + strokes
      }, 0) || 0
    )
  }, [holeScores, course])

  const totalPoints = useMemo(() => {
    if (!player || !course) return 0
    return course.holes.reduce((sum, hole) => {
      const strokes = Number.parseInt(holeScores[hole.holeNumber] || "0") || 0
      if (strokes === 0) return sum
      const handicapToUse = existingRound?.handicapUsed || player.handicap
      const handicapStrokes = getHandicapStrokesForHole(
        hole.strokeIndex || hole.holeNumber,
        handicapToUse, // Use round-specific handicap
        course.holes.length,
      )
      return sum + calculateStablefordPoints(strokes, hole.par, handicapStrokes)
    }, 0)
  }, [holeScores, player, course, existingRound])

  const handleSubmit = () => {
    // This function will be called by the "Finish" button
    // It should trigger the submitRound logic
    submitRound()
  }

  const proceedWithSubmission = async () => {
    setShowDiscrepancyDialog(false)

    if (!selectedGroupId || !selectedPlayerId || !course || !currentUser.tournamentId) return

    const player = players.find((p) => p.id === selectedPlayerId)
    if (!player) return

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
      handicapUsed: handicapToUse,
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
      // Set isLocked state if needed, e.g., from the savedRound object
      // setExistingRound({ ...savedRound, isLocked: true }); // This might need adjustment based on how isLocked is managed
      // Assuming `submitRound` itself sets the final state, this might just need to close the dialog and handle UI feedback.

      // Close dialog and perhaps trigger a broader UI update or navigation
      // For now, just close the dialog and the original submitRound logic will show the final alert.
    } catch (error) {
      console.error("[v0] Error submitting round:", error)
      alert("Failed to submit round. Please try again.")
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

  const isScoringYourself = selectedPlayerId === currentUser.id

  return (
    <>
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
                  <Select
                    value={selectedGroupId}
                    onValueChange={(value) => {
                      setSelectedGroupId(value)
                      setSelectedPlayerId("") // Reset player selection when group changes
                    }}
                  >
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
                    <Select
                      value={selectedPlayerId}
                      onValueChange={(value) => {
                        setSelectedPlayerId(value)
                        if (value) {
                          const player = players.find((p) => p.id === value)
                          if (player) {
                            setCurrentHole(1)
                          }
                        }
                      }}
                    >
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
        {selectedGroup && course && selectedPlayerId && player && currentHoleData ? (
          <div className="fixed inset-0 bg-emerald-900 flex flex-col z-50">
            {/* Top Info Bar */}
            <div className="flex-shrink-0 bg-emerald-900 p-2">
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExitScorecard}
                  className="text-white hover:bg-emerald-800 h-7 px-2 text-xs"
                >
                  <ChevronLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeaderboard(true)}
                  className="text-white hover:bg-emerald-800 h-7 px-2 text-xs"
                >
                  <Trophy className="w-3 h-3 mr-1" />
                  Leaderboard
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className="border border-emerald-700 rounded p-1.5 bg-emerald-800/30">
                  <div className="text-[9px] text-emerald-300 mb-0.5">ROUND TIME</div>
                  <div className="text-xs font-bold text-white">{roundTimer}</div>
                </div>
                <div className="border border-emerald-700 rounded p-1.5 bg-emerald-800/30">
                  <div className="text-[9px] text-emerald-300 mb-0.5">HOLE</div>
                  <div className="text-2xl font-bold text-white text-center leading-none">{currentHole}</div>
                </div>
                <div className="border border-emerald-700 rounded p-1.5 bg-emerald-800/30">
                  <div className="text-[9px] text-emerald-300 mb-0.5">POINTS</div>
                  <div className="text-2xl font-bold text-white text-center leading-none">{totalPoints}</div>
                </div>
              </div>
            </div>

            {/* Scrollable Player Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-hidden">
              {/* Player Being Scored */}
              <div className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="bg-emerald-600 px-3 py-1.5">
                  <h2 className="text-sm font-bold text-white text-center">
                    {player.name} (HC: {player.handicap})
                  </h2>
                </div>

                <div className="bg-white p-3">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-12 w-12 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 p-0"
                      onClick={() => {
                        console.log("[v0] Minus button clicked:", {
                          isLocked,
                          currentHole,
                          currentStrokes: holeScores[currentHole],
                          roundStatus: existingRound,
                        })
                        const currentStrokes = Number.parseInt(holeScores[currentHole] || "0")
                        if (currentStrokes > 0) {
                          updateHoleScore(currentHole, String(currentStrokes - 1))
                        }
                      }}
                      disabled={isLocked}
                    >
                      <Minus className="w-6 h-6 text-slate-700" />
                    </Button>

                    <div className="text-center min-w-[60px]">
                      <div className="text-4xl font-bold text-slate-900 leading-none">
                        {holeScores[currentHole] || "0"}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 mt-1">
                        {calculateCurrentHolePoints()} pts
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-12 w-12 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 p-0"
                      onClick={() => {
                        console.log("[v0] Plus button clicked:", {
                          isLocked,
                          currentHole,
                          currentStrokes: holeScores[currentHole],
                        })
                        const currentStrokes = Number.parseInt(holeScores[currentHole] || "0")
                        updateHoleScore(currentHole, String(currentStrokes + 1))
                      }}
                      disabled={isLocked}
                    >
                      <Plus className="w-6 h-6 text-slate-700" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="text-center">
                      <div className="text-[9px] text-slate-500 font-semibold mb-0.5">PAR</div>
                      <div className="bg-emerald-600 text-white text-base font-bold py-1.5 rounded">
                        {currentHoleData.par}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-slate-500 font-semibold mb-0.5">SHOTS</div>
                      <div className="border border-slate-300 text-slate-900 text-base font-bold py-1.5 rounded bg-white">
                        {playerHandicapStrokes}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-slate-500 font-semibold mb-0.5">PICKUP</div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`w-full text-base font-bold py-1.5 rounded ${
                          pickedUpHoles[currentHole]
                            ? "bg-red-500 text-white border-red-500"
                            : "border-slate-300 text-slate-900 bg-white hover:bg-slate-50"
                        }`}
                        onClick={() => markHoleAsPickedUp(currentHole)}
                        disabled={isLocked}
                      >
                        P
                      </Button>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-slate-500 font-semibold mb-0.5">TOTAL</div>
                      <div className="border border-slate-300 text-slate-900 text-base font-bold py-1.5 rounded bg-white">
                        {totalGross}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference Score (Current User) */}
              {!isScoringYourself && showReferenceScore && (
                <div className="bg-white rounded-lg overflow-hidden shadow-md">
                  <div className="bg-emerald-600 px-3 py-1.5">
                    <h2 className="text-sm font-bold text-white text-center">
                      {currentUser.name} (HC: {currentUser.handicap})
                    </h2>
                  </div>

                  <div className="bg-white p-3">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-12 w-12 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 p-0"
                        onClick={() => {
                          console.log("[v0] Reference minus clicked:", {
                            currentHole,
                            current: referenceScores[currentHole],
                          })
                          const current = referenceScores[currentHole] || 0
                          if (current > 0) {
                            setReferenceScores((prev) => ({
                              ...prev,
                              [currentHole]: current - 1,
                            }))
                          }
                        }}
                      >
                        <Minus className="w-6 h-6 text-slate-700" />
                      </Button>

                      <div className="text-center min-w-[60px]">
                        <div className="text-4xl font-bold text-slate-900 leading-none">
                          {referenceScores[currentHole] || "0"}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-600 mt-1">
                          {calculateReferenceHolePoints()} pts
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-12 w-12 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 p-0"
                        onClick={() => {
                          console.log("[v0] Reference plus clicked:", {
                            currentHole,
                            current: referenceScores[currentHole],
                          })
                          const current = referenceScores[currentHole] || 0
                          setReferenceScores((prev) => ({
                            ...prev,
                            [currentHole]: current + 1,
                          }))
                        }}
                      >
                        <Plus className="w-6 h-6 text-slate-700" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 font-semibold mb-0.5">PAR</div>
                        <div className="bg-emerald-600 text-white text-base font-bold py-1.5 rounded">
                          {currentHoleData.par}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 font-semibold mb-0.5">SHOTS</div>
                        <div className="border border-slate-300 text-slate-900 text-base font-bold py-1.5 rounded bg-white">
                          {currentUserHandicapStrokes}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 font-semibold mb-0.5">PICKUP</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`w-full text-base font-bold py-1.5 rounded ${
                            referencePickedUpHoles[currentHole]
                              ? "bg-red-500 text-white border-red-500"
                              : "border-slate-300 text-slate-900 bg-white hover:bg-slate-50"
                          }`}
                          onClick={() => markReferenceHoleAsPickedUp(currentHole)}
                        >
                          P
                        </Button>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 font-semibold mb-0.5">TOTAL</div>
                        <div className="border border-slate-300 text-slate-900 text-base font-bold py-1.5 rounded bg-white">
                          {referenceTotal.strokes}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation */}
            <div className="flex-shrink-0 bg-emerald-900 p-2 border-t border-emerald-800">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousHole}
                  disabled={currentHole === 1}
                  className="flex-1 bg-emerald-800 border-emerald-700 text-white hover:bg-emerald-700 h-12 text-sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>

                <div className="text-center px-2">
                  <div className="text-[9px] text-emerald-300">Hole</div>
                  <div className="text-sm font-bold text-white leading-none">
                    {currentHole}/{course.holes.length}
                  </div>
                  <div className="text-[9px] text-emerald-300 mt-0.5">
                    S: {totalGross} | P: {totalPoints}
                  </div>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={currentHole === course.holes.length ? handleSubmit : goToNextHole}
                  disabled={currentHole === course.holes.length ? false : currentHole >= course.holes.length}
                  className="flex-1 bg-amber-500 text-emerald-900 hover:bg-amber-400 font-bold h-12 text-sm"
                >
                  {currentHole === course.holes.length ? "Finish" : "Next"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Scorecard</CardTitle>
              <CardDescription>Select a group and player to begin scoring</CardDescription>
            </CardHeader>
            <CardContent className="py-10 text-center text-muted-foreground">
              Please select a group and a player to start scoring.
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Modal */}
        <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Leaderboard</DialogTitle>
            </DialogHeader>
            <PlayerLeaderboard
              tournamentId={currentUser.tournamentId!}
              currentUserId={currentUser.id}
              players={players}
              competitionEntries={competitionEntries}
              rounds={rounds}
              groups={groups}
              tournament={tournament}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showDiscrepancyDialog} onOpenChange={setShowDiscrepancyDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">Score Discrepancies Found!</DialogTitle>
              <DialogDescription>
                Your reference scores don't match the official scores entered by your partner. Please review:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {scoreDiscrepancies.map((disc) => (
                <div
                  key={disc.hole}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <span className="font-semibold">Hole {disc.hole}</span>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Official: </span>
                      <span className="font-bold text-red-600">{disc.official}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Your tracking: </span>
                      <span className="font-bold text-blue-600">{disc.reference}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDiscrepancyDialog(false)} className="flex-1">
                Review Scores
              </Button>
              <Button onClick={proceedWithSubmission} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                Submit Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
