"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Trophy, User, TrendingDown, TrendingUp, Minus } from "lucide-react"
import type { Player, Round, Group, Course, Tournament } from "@/app/page"

type PlayerProfileModalProps = {
  player: Player
  rounds: Round[]
  groups: Group[]
  courses: Course[]
  tournament: Tournament | null
  onClose: () => void
}

export function PlayerProfileModal({ player, rounds, groups, courses, tournament, onClose }: PlayerProfileModalProps) {
  const playerRounds = rounds.filter((r) => r.playerId === player.id)
  const numberOfDays = tournament?.numberOfDays || 2

  const scoresByDay = Array.from({ length: numberOfDays }, (_, dayIndex) => {
    const day = dayIndex + 1
    const dayGroups = groups.filter((g) => g.day === day)
    const dayGroupIds = dayGroups.map((g) => g.id)
    const dayRounds = playerRounds.filter((r) => dayGroupIds.includes(r.groupId))

    let totalStrokes = 0
    let totalPoints = 0
    let totalPenalties = 0
    let holesPlayed = 0
    let birdies = 0
    let pars = 0
    let bogeys = 0
    let doubleBogeys = 0
    let eagles = 0
    const holeScores: Array<{ hole: number; par: number; strokes: number; points: number; penalty: number }> = []

    // Get course for this day
    const dayGroup = dayGroups[0]
    const course = dayGroup ? courses.find((c) => c.id === dayGroup.courseId) : null

    dayRounds.forEach((round) => {
      if (round.holes) {
        round.holes.forEach((holeScore) => {
          if (holeScore.strokes > 0) {
            holesPlayed++
            totalStrokes += holeScore.strokes
            totalPoints += holeScore.points
            totalPenalties += holeScore.penalty || 0

            // Find par for this hole
            const hole = course?.holes.find((h) => h.holeNumber === holeScore.holeNumber)
            const par = hole?.par || 4

            // Calculate score relative to par
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
            })
          }
        })
      }
    })

    // Sort holes by number
    holeScores.sort((a, b) => a.hole - b.hole)

    return {
      day,
      totalStrokes,
      totalPoints,
      totalPenalties,
      holesPlayed,
      birdies,
      pars,
      bogeys,
      doubleBogeys,
      eagles,
      holeScores,
    }
  })

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
              <p className="text-sm text-muted-foreground">Handicap: {player.handicap}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Championship History */}
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

          {/* Detailed Round Statistics by Day */}
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
                        </div>
                        {dayScore.holesPlayed > 0 && (
                          <div className="text-right">
                            <div className="flex gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Strokes</p>
                                <p className="text-2xl font-bold">{dayScore.totalStrokes}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Points</p>
                                <p className="text-2xl font-bold text-emerald-600">{dayScore.totalPoints}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Score Breakdown */}
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

                      {/* Hole-by-Hole Scorecard */}
                      {dayScore.holeScores.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Hole-by-Hole</p>
                          <div className="grid grid-cols-9 gap-1 text-xs">
                            {dayScore.holeScores.slice(0, 9).map((score) => {
                              const scoreToPar = score.strokes - score.par
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
                                  <div className="font-bold text-sm flex items-center justify-center gap-0.5">
                                    {score.strokes}
                                    {scoreToPar <= -2 && <TrendingDown className="w-3 h-3" />}
                                    {scoreToPar === -1 && <TrendingDown className="w-3 h-3" />}
                                    {scoreToPar === 0 && <Minus className="w-3 h-3" />}
                                    {scoreToPar === 1 && <TrendingUp className="w-3 h-3" />}
                                    {scoreToPar >= 2 && <TrendingUp className="w-3 h-3" />}
                                  </div>
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
                                    <div className="font-bold text-sm flex items-center justify-center gap-0.5">
                                      {score.strokes}
                                      {scoreToPar <= -2 && <TrendingDown className="w-3 h-3" />}
                                      {scoreToPar === -1 && <TrendingDown className="w-3 h-3" />}
                                      {scoreToPar === 0 && <Minus className="w-3 h-3" />}
                                      {scoreToPar === 1 && <TrendingUp className="w-3 h-3" />}
                                      {scoreToPar >= 2 && <TrendingUp className="w-3 h-3" />}
                                    </div>
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
