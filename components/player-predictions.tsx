"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Star, Medal, CheckCircle2, AlertCircle, Lock } from "lucide-react"
import type { Player, Prediction, User, Round, Group } from "@/app/page"
import { createPrediction, getPredictionsByTournament } from "@/lib/supabase/db"

type PlayerPredictionsProps = {
  currentUser: User
  players: Player[]
  predictions: Prediction[]
  setPredictions: (predictions: Prediction[]) => void
  rounds: Round[]
  groups: Group[]
  predictionsLocked: boolean
}

export function PlayerPredictions({
  currentUser,
  players,
  predictions,
  setPredictions,
  rounds,
  groups,
  predictionsLocked,
}: PlayerPredictionsProps) {
  const [predictedWinnerId, setPredictedWinnerId] = useState<string>("")
  const [predictedSecondId, setPredictedSecondId] = useState<string>("")
  const [predictedThirdId, setPredictedThirdId] = useState<string>("")
  const [localPredictions, setLocalPredictions] = useState<Prediction[]>(predictions)

  useEffect(() => {
    if (!currentUser.tournamentId) return

    const loadPredictions = async () => {
      try {
        const data = await getPredictionsByTournament(currentUser.tournamentId!)
        setLocalPredictions(data as Prediction[])
        setPredictions(data as Prediction[])
      } catch (error) {
        console.error("[v0] Error loading predictions:", error)
      }
    }

    loadPredictions()
  }, [currentUser.tournamentId])

  // Check if current user has already made a prediction
  const existingPrediction = useMemo(() => {
    return localPredictions.find((p) => p.playerId === currentUser.id)
  }, [localPredictions, currentUser.id])

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

  const predictionResults = useMemo(() => {
    if (!isCompetitionSealed || actualTop3.length < 3) return []

    return localPredictions.map((prediction) => {
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
  }, [localPredictions, players, actualTop3, isCompetitionSealed])

  const winner = useMemo(() => {
    if (predictionResults.length === 0) return null
    const sorted = [...predictionResults].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return actualTop3[0]?.totalStrokes || 0
    })
    return sorted[0]
  }, [predictionResults, actualTop3])

  const handleSubmitPrediction = async () => {
    if (!predictedWinnerId || !predictedSecondId || !predictedThirdId) {
      alert("Please select all three players")
      return
    }

    if (
      predictedWinnerId === predictedSecondId ||
      predictedWinnerId === predictedThirdId ||
      predictedSecondId === predictedThirdId
    ) {
      alert("Please select three different players")
      return
    }

    if (!currentUser.tournamentId) {
      alert("Tournament ID not found")
      return
    }

    try {
      await createPrediction({
        playerId: currentUser.id,
        predictedWinnerId,
        predictedTop3Ids: [predictedWinnerId, predictedSecondId, predictedThirdId],
        tournamentId: currentUser.tournamentId,
      })

      // Reload predictions from database
      const updatedPredictions = await getPredictionsByTournament(currentUser.tournamentId)
      setLocalPredictions(updatedPredictions as Prediction[])
      setPredictions(updatedPredictions as Prediction[])
    } catch (error) {
      console.error("[v0] Error submitting prediction:", error)
      alert("Failed to submit prediction. Please try again.")
    }
  }

  if (predictionsLocked && !existingPrediction) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-950 max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-6 h-6 text-red-600" />
              <CardTitle>Predictions Locked</CardTitle>
            </div>
            <CardDescription>The prediction deadline has passed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Predictions are now closed. The competition has started and no new predictions can be submitted.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (existingPrediction) {
    const winner = players.find((p) => p.id === existingPrediction.predictedWinnerId)
    const second = players.find((p) => p.id === existingPrediction.predictedTop3Ids[1])
    const third = players.find((p) => p.id === existingPrediction.predictedTop3Ids[2])

    return (
      <div className="space-y-4 h-full overflow-y-auto pb-4">
        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <CardTitle>Prediction Submitted</CardTitle>
            </div>
            <CardDescription>Your picks for the 2-day competition</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border-2 border-yellow-500">
                <Trophy className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Winner</p>
                  <p className="text-lg font-bold">{winner?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-400">
                <Medal className="w-6 h-6 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">2nd Place</p>
                  <p className="text-lg font-bold">{second?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border-2 border-orange-500">
                <Medal className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">3rd Place</p>
                  <p className="text-lg font-bold">{third?.name}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Results will be revealed after the competition is sealed
            </p>
          </CardContent>
        </Card>

        {isCompetitionSealed && actualTop3.length === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Actual Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actualTop3.map((result, index) => (
                <div
                  key={result.player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
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
                    <p className="font-bold">{result.player.name}</p>
                    <p className="text-sm text-muted-foreground">{result.totalStrokes} strokes</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isCompetitionSealed && winner && (
          <Card className="border-2 border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                Prediction Winner - 200 Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold">{winner.predictor?.name}</p>
                <p className="text-lg text-muted-foreground">Score: {winner.score} points</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  {winner.correctWinner && <p className="text-green-600 font-semibold">✓ Correct Winner (+100pts)</p>}
                  {winner.correct2nd && <p className="text-green-600">✓ Correct 2nd Place (+30pts)</p>}
                  {winner.correct3rd && <p className="text-green-600">✓ Correct 3rd Place (+15pts)</p>}
                  <p>
                    Got {winner.correctInTop3} out of 3 in top 3 (+{winner.correctInTop3 * 10}pts)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 h-full overflow-y-auto pb-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            2-Day Competition Prediction
          </CardTitle>
          <CardDescription>Pick your top 3 finishers and win 200 points!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              How to Win
            </h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Select 3 players you think will finish in the top 3</li>
              <li>• You must pick who will be the winner (1st place)</li>
              <li>• Scoring: Winner = 100pts, 2nd in position = 30pts, 3rd in position = 15pts</li>
              <li>• Each correct player in top 3 = 10pts</li>
              <li>• Highest score wins 200 points (ties split prize)</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                1st Place (Winner)
              </label>
              <Select value={predictedWinnerId} onValueChange={setPredictedWinnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select winner" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} (HC: {player.handicap})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Medal className="w-4 h-4 text-gray-500" />
                2nd Place
              </label>
              <Select value={predictedSecondId} onValueChange={setPredictedSecondId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select 2nd place" />
                </SelectTrigger>
                <SelectContent>
                  {players
                    .filter((p) => p.id !== predictedWinnerId)
                    .map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} (HC: {player.handicap})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Medal className="w-4 h-4 text-orange-500" />
                3rd Place
              </label>
              <Select value={predictedThirdId} onValueChange={setPredictedThirdId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select 3rd place" />
                </SelectTrigger>
                <SelectContent>
                  {players
                    .filter((p) => p.id !== predictedWinnerId && p.id !== predictedSecondId)
                    .map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} (HC: {player.handicap})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSubmitPrediction}
            className="w-full"
            size="lg"
            disabled={!predictedWinnerId || !predictedSecondId || !predictedThirdId}
          >
            Submit Prediction
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can only submit once. Predictions lock when Day 1 starts!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
