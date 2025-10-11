"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Star, Users, Lock, Unlock } from "lucide-react"
import type { Player, Prediction, Round, Group } from "@/app/page"

type AdminPredictionsProps = {
  players: Player[]
  predictions: Prediction[]
  rounds: Round[]
  groups: Group[]
  predictionsLocked: boolean
  setPredictionsLocked: (locked: boolean) => void
}

export function AdminPredictions({
  players,
  predictions,
  rounds,
  groups,
  predictionsLocked,
  setPredictionsLocked,
}: AdminPredictionsProps) {
  // Check if competition is sealed
  const isCompetitionSealed = useMemo(() => {
    const day2Groups = groups.filter((g) => g.day === 2)
    return day2Groups.some((group) => {
      const groupRounds = rounds.filter((r) => r.groupId === group.id)
      return groupRounds.some((round) => {
        const hole18 = round.holes.find((h) => h.holeNumber === 18)
        return hole18 && hole18.strokes > 0
      })
    })
  }, [groups, rounds])

  // Calculate actual top 3
  const actualTop3 = useMemo(() => {
    if (!isCompetitionSealed) return []

    const playerTotals = players.map((player) => {
      const playerRounds = rounds.filter((r) => r.playerId === player.id && r.completed)
      const totalStrokes = playerRounds.reduce((sum, round) => sum + round.totalGross, 0)
      const roundsPlayed = playerRounds.length

      return {
        player,
        totalStrokes,
        roundsPlayed,
      }
    })

    return playerTotals
      .filter((pt) => pt.roundsPlayed > 0)
      .sort((a, b) => a.totalStrokes - b.totalStrokes)
      .slice(0, 3)
  }, [players, rounds, isCompetitionSealed])

  // Calculate prediction results
  const predictionResults = useMemo(() => {
    if (!isCompetitionSealed || actualTop3.length < 3) return []

    return predictions.map((prediction) => {
      const predictor = players.find((p) => p.id === prediction.playerId)
      const correctWinner = prediction.predictedWinnerId === actualTop3[0].player.id
      const correct2nd = prediction.predictedTop3Ids[1] === actualTop3[1].player.id
      const correct3rd = prediction.predictedTop3Ids[2] === actualTop3[2].player.id
      const correctInTop3 = prediction.predictedTop3Ids.filter((id) =>
        actualTop3.some((t) => t.player.id === id),
      ).length

      let score = correctInTop3 * 10
      if (correctWinner) score += 100
      if (correct2nd) score += 30
      if (correct3rd) score += 15

      return {
        predictor,
        prediction,
        correctWinner,
        correct2nd,
        correct3rd,
        correctInTop3,
        score,
      }
    })
  }, [predictions, players, actualTop3, isCompetitionSealed])

  const sortedResults = useMemo(() => {
    return [...predictionResults].sort((a, b) => b.score - a.score)
  }, [predictionResults])

  return (
    <div className="space-y-6">
      {/* Prediction Controls */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Prediction Controls</CardTitle>
          <CardDescription>Lock predictions before Day 1 starts</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Status: {predictionsLocked ? "Locked" : "Open"}</p>
            <p className="text-sm text-muted-foreground">
              {predictionsLocked ? "No new predictions can be submitted" : "Players can still submit predictions"}
            </p>
          </div>
          <Button
            onClick={() => setPredictionsLocked(!predictionsLocked)}
            variant={predictionsLocked ? "destructive" : "default"}
            size="lg"
          >
            {predictionsLocked ? (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Unlock Predictions
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Lock Predictions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            All Predictions ({predictions.length})
          </CardTitle>
          <CardDescription>View all player predictions for the 2-day competition</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No predictions submitted yet</p>
            ) : (
              predictions.map((prediction) => {
                const predictor = players.find((p) => p.id === prediction.playerId)
                const winner = players.find((p) => p.id === prediction.predictedWinnerId)
                const second = players.find((p) => p.id === prediction.predictedTop3Ids[1])
                const third = players.find((p) => p.id === prediction.predictedTop3Ids[2])

                return (
                  <Card key={prediction.id} className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{predictor?.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Submitted {new Date(prediction.timestamp).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold">Winner:</span>
                          <span>{winner?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Medal className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">2nd:</span>
                          <span>{second?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Medal className="w-4 h-4 text-orange-500" />
                          <span className="font-semibold">3rd:</span>
                          <span>{third?.name}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {isCompetitionSealed && actualTop3.length === 3 && (
        <>
          <Card className="border-2 border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Actual Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actualTop3.map((result, index) => (
                  <div
                    key={result.player.id}
                    className={`flex items-center gap-3 p-4 rounded-lg ${
                      index === 0
                        ? "bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500"
                        : index === 1
                          ? "bg-gray-100 dark:bg-gray-800 border-2 border-gray-400"
                          : "bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500"
                    }`}
                  >
                    {index === 0 ? (
                      <Trophy className="w-6 h-6 text-yellow-600" />
                    ) : (
                      <Medal className={`w-6 h-6 ${index === 1 ? "text-gray-500" : "text-orange-600"}`} />
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-lg">{result.player.name}</p>
                      <p className="text-sm text-muted-foreground">{result.totalStrokes} strokes</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                Prediction Results - 200 Points Winner
              </CardTitle>
              <CardDescription>Ranked by prediction accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedResults.map((result, index) => (
                  <div
                    key={result.prediction.id}
                    className={`p-4 rounded-lg border-2 ${
                      index === 0 ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-500" : "bg-muted border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Star className="w-5 h-5 text-yellow-500" />}
                        <span className="font-bold text-lg">{result.predictor?.name}</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">{result.score} pts</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {result.correctWinner && (
                        <p className="text-green-600 font-semibold">✓ Correct Winner (+100pts)</p>
                      )}
                      {result.correct2nd && <p className="text-green-600">✓ Correct 2nd Place (+30pts)</p>}
                      {result.correct3rd && <p className="text-green-600">✓ Correct 3rd Place (+15pts)</p>}
                      <p className="text-muted-foreground">
                        Got {result.correctInTop3} out of 3 in top 3 (+{result.correctInTop3 * 10}pts)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
