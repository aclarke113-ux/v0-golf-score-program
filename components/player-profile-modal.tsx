"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Unlock, Lock, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import type { Player, Round, Group, Course, Tournament } from "@/app/page"
import { updateRound } from "@/lib/supabase/db"

interface PlayerProfileModalProps {
  player: Player
  rounds: Round[]
  groups: Group[]
  courses: Course[]
  tournament?: Tournament | null
  onClose: () => void
  isAdmin: boolean
}

export function PlayerProfileModal({
  player,
  rounds,
  groups,
  courses,
  tournament,
  onClose,
  isAdmin,
}: PlayerProfileModalProps) {
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [expandedRound, setExpandedRound] = useState<string | null>(null)

  const playerRounds = rounds.filter((r) => r.playerId === player.id)

  const handleUnlockRound = async (roundId: string) => {
    if (!confirm(`Unlock this round for ${player.name}? They will be able to edit their scores.`)) {
      return
    }

    setUnlocking(roundId)
    try {
      await updateRound(roundId, { submitted: false, completed: false })
      alert(`Round unlocked for ${player.name}. They can now edit their scores.`)
      onClose()
    } catch (error) {
      console.error("[v0] Error unlocking round:", error)
      alert(`Failed to unlock round: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setUnlocking(null)
    }
  }

  const getHandicapStrokesForHole = (strokeIndex: number, handicap: number, totalHoles: number): number => {
    if (handicap <= 0) return 0
    const fullStrokes = Math.floor(handicap / totalHoles)
    const remainingStrokes = handicap % totalHoles
    return fullStrokes + (strokeIndex <= remainingStrokes ? 1 : 0)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{player.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Handicap</p>
                  <p className="text-3xl font-bold">{player.handicap}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Rounds Played</p>
                  <p className="text-3xl font-bold">{playerRounds.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Round History</h3>
            {playerRounds.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No rounds played yet</p>
            ) : (
              <div className="space-y-2">
                {playerRounds.map((round) => {
                  const group = groups.find((g) => g.id === round.groupId)
                  const course = group ? courses.find((c) => c.id === group.courseId) : null
                  const isLocked = round.submitted === true
                  const isExpanded = expandedRound === round.id
                  const hasDiscrepancy = round.scoreDiscrepancyFlagged

                  return (
                    <div key={round.id} className="border rounded-lg bg-card">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setExpandedRound(isExpanded ? null : round.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{course?.name || "Unknown Course"}</p>
                            {isLocked ? (
                              <Badge variant="secondary" className="gap-1">
                                <Lock className="w-3 h-3" />
                                Locked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <Unlock className="w-3 h-3" />
                                Unlocked
                              </Badge>
                            )}
                            {hasDiscrepancy && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Score Discrepancy
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {group?.name || "Unknown Group"} • Day {group?.day || 1}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Points</p>
                            <p className="text-2xl font-bold text-emerald-600">{round.totalPoints || 0}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Gross</p>
                            <p className="text-2xl font-bold">{round.totalGross || 0}</p>
                          </div>

                          {isAdmin && isLocked && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnlockRound(round.id)
                              }}
                              disabled={unlocking === round.id}
                            >
                              <Unlock className="w-4 h-4 mr-1" />
                              {unlocking === round.id ? "Unlocking..." : "Unlock"}
                            </Button>
                          )}

                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>

                      {isExpanded && course && round.holes && (
                        <div className="border-t p-4 bg-muted/30">
                          {hasDiscrepancy && round.discrepancyNotes && (
                            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                                <div className="flex-1">
                                  <h5 className="font-semibold text-destructive mb-1">Score Discrepancy Detected</h5>
                                  <p className="text-sm text-muted-foreground">{round.discrepancyNotes}</p>
                                  {isAdmin && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Review the scorecard below and unlock if corrections are needed.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <h4 className="font-semibold mb-3">Scorecard Details</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-2">Hole</th>
                                  <th className="text-center py-2 px-2">Par</th>
                                  <th className="text-center py-2 px-2">SI</th>
                                  <th className="text-center py-2 px-2">Strokes</th>
                                  {round.referenceScores && Object.keys(round.referenceScores).length > 0 && (
                                    <th className="text-center py-2 px-2 text-blue-600">Their Score</th>
                                  )}
                                  <th className="text-center py-2 px-2">Net</th>
                                  <th className="text-center py-2 px-2">Points</th>
                                </tr>
                              </thead>
                              <tbody>
                                {round.holes.map((hole) => {
                                  const courseHole = course.holes.find((h) => h.holeNumber === hole.holeNumber)
                                  const handicapUsed = round.handicapUsed || player.handicap
                                  const handicapStrokes = courseHole
                                    ? getHandicapStrokesForHole(
                                        courseHole.strokeIndex || 18,
                                        handicapUsed,
                                        course.holes.length,
                                      )
                                    : 0
                                  const netScore = (hole.strokes || 0) - handicapStrokes
                                  const refScore = round.referenceScores?.[hole.holeNumber]
                                  const hasDiff = refScore && refScore !== hole.strokes

                                  return (
                                    <tr key={hole.holeNumber} className="border-b hover:bg-accent/30">
                                      <td className="py-2 px-2 font-medium">{hole.holeNumber}</td>
                                      <td className="text-center py-2 px-2">{courseHole?.par || "-"}</td>
                                      <td className="text-center py-2 px-2">{courseHole?.strokeIndex || "-"}</td>
                                      <td
                                        className={`text-center py-2 px-2 font-semibold ${hasDiff ? "text-destructive" : ""}`}
                                      >
                                        {hole.strokes || 0}
                                      </td>
                                      {round.referenceScores && Object.keys(round.referenceScores).length > 0 && (
                                        <td
                                          className={`text-center py-2 px-2 ${hasDiff ? "text-blue-600 font-semibold" : "text-muted-foreground"}`}
                                        >
                                          {refScore || "-"}
                                        </td>
                                      )}
                                      <td className="text-center py-2 px-2">{netScore}</td>
                                      <td className="text-center py-2 px-2">
                                        <span className="font-bold text-emerald-600">{hole.points || 0}</span>
                                      </td>
                                    </tr>
                                  )
                                })}
                                <tr className="font-bold border-t-2">
                                  <td className="py-2 px-2">Total</td>
                                  <td className="text-center py-2 px-2">
                                    {course.holes.reduce((sum, h) => sum + (h.par || 0), 0)}
                                  </td>
                                  <td className="text-center py-2 px-2">-</td>
                                  <td className="text-center py-2 px-2">{round.totalGross || 0}</td>
                                  {round.referenceScores && Object.keys(round.referenceScores).length > 0 && (
                                    <td className="text-center py-2 px-2 text-blue-600">
                                      {Object.values(round.referenceScores).reduce((sum, score) => sum + score, 0)}
                                    </td>
                                  )}
                                  <td className="text-center py-2 px-2">
                                    {round.holes.reduce((sum, hole) => {
                                      const courseHole = course.holes.find((h) => h.holeNumber === hole.holeNumber)
                                      const handicapUsed = round.handicapUsed || player.handicap
                                      const handicapStrokes = courseHole
                                        ? getHandicapStrokesForHole(
                                            courseHole.strokeIndex || 18,
                                            handicapUsed,
                                            course.holes.length,
                                          )
                                        : 0
                                      return sum + ((hole.strokes || 0) - handicapStrokes)
                                    }, 0)}
                                  </td>
                                  <td className="text-center py-2 px-2">
                                    <span className="text-emerald-600">{round.totalPoints || 0}</span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
