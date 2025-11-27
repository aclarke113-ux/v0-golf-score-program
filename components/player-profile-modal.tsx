"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Trophy, User, TrendingDown, TrendingUp, Minus, Edit2, Check, Save } from "lucide-react"
import type { Player, Round, Group, Course, Tournament, HoleScore } from "@/app/page"
import { useState } from "react"
import { updateRound } from "@/lib/supabase/db"

type PlayerProfileModalProps = {
  player: Player
  rounds: Round[]
  groups: Group[]
  courses: Course[]
  tournament: Tournament | null
  onClose: () => void
  isAdmin?: boolean
}

function calculateStablefordPoints(strokes: number, par: number, handicapStrokes: number): number {
  const netStrokes = strokes - handicapStrokes
  const diff = netStrokes - par

  if (diff <= -2) return 4 // Eagle or better
  if (diff === -1) return 3 // Birdie
  if (diff === 0) return 2 // Par
  if (diff === 1) return 1 // Bogey
  return 0 // Double bogey or worse
}

function calculateNetScore(strokes: number, handicapStrokes: number): number {
  return Math.max(0, strokes - handicapStrokes)
}

function getHandicapStrokesForHole(strokeIndex: number, totalHandicap: number, totalHoles: number): number {
  const baseStrokes = Math.floor(totalHandicap / totalHoles)
  const extraStrokes = totalHandicap % totalHoles
  const additionalStroke = strokeIndex <= extraStrokes ? 1 : 0
  return baseStrokes + additionalStroke
}

export function PlayerProfileModal({
  player,
  rounds,
  groups,
  courses,
  tournament,
  onClose,
  isAdmin = false,
}: PlayerProfileModalProps) {
  const playerRounds = rounds.filter((r) => r.playerId === player.id)
  const numberOfDays = tournament?.numberOfDays || 2
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null)
  const [editHandicap, setEditHandicap] = useState("")
  const [editingScoresRoundId, setEditingScoresRoundId] = useState<string | null>(null)
  const [editedScores, setEditedScores] = useState<{ [holeNumber: number]: number }>({})

  const scoresByDay = Array.from({ length: numberOfDays }, (_, dayIndex) => {
    const day = dayIndex + 1
    const dayGroups = groups.filter((g) => g.day === day)
    const dayGroupIds = dayGroups.map((g) => g.id)
    const dayRounds = playerRounds.filter((r) => dayGroupIds.includes(r.groupId))

    let roundToUse: Round | null = null

    const completedRounds = dayRounds.filter((r) => r.completed || r.submitted)
    if (completedRounds.length > 0) {
      roundToUse = completedRounds[completedRounds.length - 1]
    } else if (dayRounds.length > 0) {
      roundToUse = dayRounds[dayRounds.length - 1]
    }

    let totalStrokes = 0
    let totalPoints = 0
    let totalNetScore = 0
    let totalPenalties = 0
    let holesPlayed = 0
    let birdies = 0
    let pars = 0
    let bogeys = 0
    let doubleBogeys = 0
    let eagles = 0
    const holeScores: Array<{
      hole: number
      par: number
      strokes: number
      points: number
      penalty: number
      netScore: number
    }> = []

    const dayGroup = dayGroups[0]
    const course = dayGroup ? courses.find((c) => c.id === dayGroup.courseId) : null

    if (roundToUse && roundToUse.holes && course) {
      const handicapUsed = roundToUse.handicapUsed || player.handicap

      roundToUse.holes.forEach((holeScore) => {
        if (holeScore.strokes > 0) {
          holesPlayed++
          totalStrokes += holeScore.strokes
          totalPoints += holeScore.points
          totalPenalties += holeScore.penalty || 0

          const hole = course.holes.find((h) => h.holeNumber === holeScore.holeNumber)
          const par = hole?.par || 4
          const strokeIndex = hole?.strokeIndex || holeScore.holeNumber

          // Calculate handicap strokes for this hole
          const handicapStrokes = getHandicapStrokesForHole(strokeIndex, handicapUsed, course.holes.length)

          // Calculate net score (use stored value if available, otherwise calculate)
          const netScore =
            holeScore.netScore !== undefined
              ? holeScore.netScore
              : calculateNetScore(holeScore.strokes, handicapStrokes)

          totalNetScore += netScore

          const scoreToPar = holeScore.strokes - par
          if (scoreToPar <= -2) eagles++
          else if (scoreToPar === -1) birdies++
          else if (scoreToPar === 0) pars++
          else if (scoreToPar === 1) bogeys++
          else if (scoreToPar >= 2) doubleBogeys++

          holeScores.push({
            hole: holeScore.holeNumber,
            par,
            strokes: holeScore.strokes,
            points: holeScore.points,
            penalty: holeScore.penalty || 0,
            netScore,
          })
        }
      })
    }

    holeScores.sort((a, b) => a.hole - b.hole)

    return {
      day,
      roundId: roundToUse?.id,
      handicapUsed: roundToUse?.handicapUsed || player.handicap,
      totalStrokes,
      totalPoints,
      totalNetScore,
      totalPenalties,
      holesPlayed,
      birdies,
      pars,
      bogeys,
      doubleBogeys,
      eagles,
      holeScores,
      course,
    }
  })

  const handleEditHandicap = async (roundId: string, newHandicap: number) => {
    try {
      await updateRound(roundId, { handicapUsed: newHandicap })
      setEditingRoundId(null)
      setEditHandicap("")
      window.location.reload()
    } catch (error) {
      console.error("[v0] Error updating round handicap:", error)
      alert("Failed to update handicap. Please try again.")
    }
  }

  const startEditingScores = (roundId: string, holeScores: Array<{ hole: number; strokes: number }>) => {
    setEditingScoresRoundId(roundId)
    const scores: { [holeNumber: number]: number } = {}
    holeScores.forEach((score) => {
      scores[score.hole] = score.strokes
    })
    setEditedScores(scores)
  }

  const saveEditedScores = async (roundId: string, dayScore: any) => {
    try {
      const course = dayScore.course
      if (!course) {
        alert("Course not found")
        return
      }

      const updatedHoles: HoleScore[] = course.holes.map((hole: any) => {
        const strokes = editedScores[hole.holeNumber] || 0
        const handicapStrokes = getHandicapStrokesForHole(
          hole.strokeIndex || hole.holeNumber,
          dayScore.handicapUsed,
          course.holes.length,
        )
        const points = strokes > 0 ? calculateStablefordPoints(strokes, hole.par, handicapStrokes) : 0
        const netScore = strokes > 0 ? calculateNetScore(strokes, handicapStrokes) : 0

        return {
          holeNumber: hole.holeNumber,
          strokes,
          points,
          netScore, // Include net score in updated holes
          penalty: 0,
        }
      })

      await updateRound(roundId, { holes: updatedHoles })
      setEditingScoresRoundId(null)
      setEditedScores({})
      window.location.reload()
    } catch (error) {
      console.error("[v0] Error updating round scores:", error)
      alert("Failed to update scores. Please try again.")
    }
  }

  const cancelEditingScores = () => {
    setEditingScoresRoundId(null)
    setEditedScores({})
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {player.profilePicture ? (
              <img
                src={player.profilePicture || "/placeholder.svg"}
                alt={player.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="flex items-center gap-2">
                {player.name}
                {player.isCurrentChampion && <Trophy className="w-5 h-5 text-yellow-500" title="Current Champion" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Current Handicap: {player.handicap}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {player.championshipWins && player.championshipWins.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Championship History ({player.championshipWins.length}x Champion)
              </h3>
              <div className="space-y-2">
                {player.championshipWins.map((win) => (
                  <div key={win.year} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold">{win.year}</span>
                      {win.notes && <span className="text-sm text-muted-foreground">• {win.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Round Statistics</h3>
            {scoresByDay.every((d) => d.holesPlayed === 0) ? (
              <p className="text-muted-foreground text-center py-4">No scores entered yet</p>
            ) : (
              <div className="space-y-6">
                {scoresByDay.map((dayScore) => (
                  <div key={dayScore.day} className="space-y-3">
                    <div className="p-4 border rounded-lg bg-card">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-semibold text-lg">Day {dayScore.day}</p>
                          <p className="text-sm text-muted-foreground">
                            {dayScore.holesPlayed === 0
                              ? "Not started"
                              : dayScore.holesPlayed === 18
                                ? "Round complete"
                                : `Through ${dayScore.holesPlayed} holes`}
                          </p>
                          {dayScore.holesPlayed > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              {editingRoundId === dayScore.roundId ? (
                                <>
                                  <Input
                                    type="number"
                                    value={editHandicap}
                                    onChange={(e) => setEditHandicap(e.target.value)}
                                    className="w-20 h-8"
                                    placeholder={dayScore.handicapUsed.toString()}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const newHandicap = Number.parseInt(editHandicap)
                                      if (!Number.isNaN(newHandicap) && dayScore.roundId) {
                                        handleEditHandicap(dayScore.roundId, newHandicap)
                                      }
                                    }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingRoundId(null)
                                      setEditHandicap("")
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-muted-foreground">
                                    Handicap used: {dayScore.handicapUsed}
                                  </p>
                                  {isAdmin && dayScore.roundId && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingRoundId(dayScore.roundId!)
                                        setEditHandicap(dayScore.handicapUsed.toString())
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {dayScore.holesPlayed > 0 && (
                          <div className="text-right">
                            <div className="flex gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Strokes</p>
                                <p className="text-2xl font-bold">{dayScore.totalStrokes}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Net</p>
                                <p className="text-2xl font-bold text-blue-600">{dayScore.totalNetScore}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Points</p>
                                <p className="text-2xl font-bold text-emerald-600">{dayScore.totalPoints}</p>
                              </div>
                            </div>
                            {isAdmin && dayScore.roundId && editingScoresRoundId !== dayScore.roundId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingScores(dayScore.roundId!, dayScore.holeScores)}
                                className="mt-2"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit Scores
                              </Button>
                            )}
                            {isAdmin && editingScoresRoundId === dayScore.roundId && (
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => saveEditedScores(dayScore.roundId!, dayScore)}
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditingScores}>
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {dayScore.holesPlayed > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                          {dayScore.eagles > 0 && (
                            <div className="text-center p-2 bg-blue-500/10 rounded">
                              <p className="text-2xl font-bold text-blue-600">{dayScore.eagles}</p>
                              <p className="text-xs text-muted-foreground">Eagles</p>
                            </div>
                          )}
                          <div className="text-center p-2 bg-green-500/10 rounded">
                            <p className="text-2xl font-bold text-green-600">{dayScore.birdies}</p>
                            <p className="text-xs text-muted-foreground">Birdies</p>
                          </div>
                          <div className="text-center p-2 bg-gray-500/10 rounded">
                            <p className="text-2xl font-bold">{dayScore.pars}</p>
                            <p className="text-xs text-muted-foreground">Pars</p>
                          </div>
                          <div className="text-center p-2 bg-orange-500/10 rounded">
                            <p className="text-2xl font-bold text-orange-600">{dayScore.bogeys}</p>
                            <p className="text-xs text-muted-foreground">Bogeys</p>
                          </div>
                          <div className="text-center p-2 bg-red-500/10 rounded">
                            <p className="text-2xl font-bold text-red-600">{dayScore.doubleBogeys}</p>
                            <p className="text-xs text-muted-foreground">Double+</p>
                          </div>
                          {dayScore.totalPenalties > 0 && (
                            <div className="text-center p-2 bg-red-500/10 rounded">
                              <p className="text-2xl font-bold text-red-600">{dayScore.totalPenalties}</p>
                              <p className="text-xs text-muted-foreground">Penalties</p>
                            </div>
                          )}
                        </div>
                      )}

                      {dayScore.holeScores.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Hole-by-Hole</p>
                          <div className="grid grid-cols-9 gap-1 text-xs">
                            {dayScore.holeScores.slice(0, 9).map((score) => {
                              const scoreToPar = score.strokes - score.par
                              const displayStrokes =
                                editingScoresRoundId === dayScore.roundId
                                  ? editedScores[score.hole] || score.strokes
                                  : score.strokes
                              const isEditing = editingScoresRoundId === dayScore.roundId

                              return (
                                <div
                                  key={score.hole}
                                  className={`p-2 rounded text-center ${
                                    scoreToPar <= -2
                                      ? "bg-blue-500/20 text-blue-700"
                                      : scoreToPar === -1
                                        ? "bg-green-500/20 text-green-700"
                                        : scoreToPar === 0
                                          ? "bg-gray-500/20"
                                          : scoreToPar === 1
                                            ? "bg-orange-500/20 text-orange-700"
                                            : "bg-red-500/20 text-red-700"
                                  }`}
                                >
                                  <div className="font-bold">{score.hole}</div>
                                  <div className="text-[10px] text-muted-foreground">Par {score.par}</div>
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={displayStrokes}
                                      onChange={(e) =>
                                        setEditedScores({
                                          ...editedScores,
                                          [score.hole]: Number.parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full h-8 text-center text-sm font-bold p-0"
                                      min="0"
                                      max="15"
                                    />
                                  ) : (
                                    <div className="font-bold text-sm flex items-center justify-center gap-0.5">
                                      {displayStrokes}
                                      {scoreToPar <= -2 && <TrendingDown className="w-3 h-3" />}
                                      {scoreToPar === -1 && <TrendingDown className="w-3 h-3" />}
                                      {scoreToPar === 0 && <Minus className="w-3 h-3" />}
                                      {scoreToPar === 1 && <TrendingUp className="w-3 h-3" />}
                                      {scoreToPar >= 2 && <TrendingUp className="w-3 h-3" />}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-emerald-600">{score.points}pts</div>
                                  {score.penalty > 0 && (
                                    <div className="text-[10px] text-red-600">P:{score.penalty}</div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {dayScore.holeScores.length > 9 && (
                            <div className="grid grid-cols-9 gap-1 text-xs">
                              {dayScore.holeScores.slice(9, 18).map((score) => {
                                const scoreToPar = score.strokes - score.par
                                const displayStrokes =
                                  editingScoresRoundId === dayScore.roundId
                                    ? editedScores[score.hole] || score.strokes
                                    : score.strokes
                                const isEditing = editingScoresRoundId === dayScore.roundId

                                return (
                                  <div
                                    key={score.hole}
                                    className={`p-2 rounded text-center ${
                                      scoreToPar <= -2
                                        ? "bg-blue-500/20 text-blue-700"
                                        : scoreToPar === -1
                                          ? "bg-green-500/20 text-green-700"
                                          : scoreToPar === 0
                                            ? "bg-gray-500/20"
                                            : scoreToPar === 1
                                              ? "bg-orange-500/20 text-orange-700"
                                              : "bg-red-500/20 text-red-700"
                                    }`}
                                  >
                                    <div className="font-bold">{score.hole}</div>
                                    <div className="text-[10px] text-muted-foreground">Par {score.par}</div>
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={displayStrokes}
                                        onChange={(e) =>
                                          setEditedScores({
                                            ...editedScores,
                                            [score.hole]: Number.parseInt(e.target.value) || 0,
                                          })
                                        }
                                        className="w-full h-8 text-center text-sm font-bold p-0"
                                        min="0"
                                        max="15"
                                      />
                                    ) : (
                                      <div className="font-bold text-sm flex items-center justify-center gap-0.5">
                                        {displayStrokes}
                                        {scoreToPar <= -2 && <TrendingDown className="w-3 h-3" />}
                                        {scoreToPar === -1 && <TrendingDown className="w-3 h-3" />}
                                        {scoreToPar === 0 && <Minus className="w-3 h-3" />}
                                        {scoreToPar === 1 && <TrendingUp className="w-3 h-3" />}
                                        {scoreToPar >= 2 && <TrendingUp className="w-3 h-3" />}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-emerald-600">{score.points}pts</div>
                                    {score.penalty > 0 && (
                                      <div className="text-[10px] text-red-600">P:{score.penalty}</div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
