"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Minus, Trophy, Crown } from "lucide-react"

interface LeaderboardEntry {
  playerId: string
  playerName: string
  handicap: number
  userId: string
  position: number
  totalGross: number
  totalNet: number
  scoreToPar: number
  rounds: number
  dayScores: { [key: number]: { gross: number; net: number } }
}

export function LiveLeaderboard({ competitionId, championId }: { competitionId: string; championId?: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [view, setView] = useState<"overall" | "day1" | "day2">("overall")
  const [loading, setLoading] = useState(true)
  const previousPositions = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    loadLeaderboard()
    const interval = setInterval(loadLeaderboard, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [competitionId, view])

  const loadLeaderboard = async () => {
    const dayParam = view === "overall" ? "" : view === "day1" ? "?day=1" : "?day=2"
    const res = await fetch(`/api/competitions/${competitionId}/leaderboard${dayParam}`)
    const data = await res.json()

    // Store previous positions before updating
    if (leaderboard.length > 0) {
      leaderboard.forEach((entry) => {
        previousPositions.current.set(entry.playerId, entry.position)
      })
    }

    setLeaderboard(data.leaderboard || [])
    setLoading(false)
  }

  const getPositionChange = (playerId: string, currentPosition: number) => {
    const previousPosition = previousPositions.current.get(playerId)
    if (!previousPosition) return null

    const change = previousPosition - currentPosition
    if (change > 0) return { direction: "up", value: change }
    if (change < 0) return { direction: "down", value: Math.abs(change) }
    return { direction: "same", value: 0 }
  }

  const formatScore = (score: number) => {
    if (score === 0) return "E"
    return score > 0 ? `+${score}` : score.toString()
  }

  if (loading) {
    return <div className="text-center py-8">Loading leaderboard...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Live Leaderboard
        </h2>
        <div className="text-sm text-muted-foreground">Updates every 30s</div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="day1">Day 1</TabsTrigger>
          <TabsTrigger value="day2">Day 2</TabsTrigger>
        </TabsList>

        <TabsContent value={view} className="space-y-2 mt-4">
          {leaderboard.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No scores recorded yet</Card>
          ) : (
            leaderboard.map((entry, index) => {
              const positionChange = getPositionChange(entry.playerId, entry.position)
              const isChampion = entry.userId === championId
              const isLeader = entry.position === 1

              return (
                <Card
                  key={entry.playerId}
                  className={`p-4 transition-all duration-500 ${
                    isLeader ? "bg-yellow-500/10 border-yellow-500/50" : ""
                  } ${positionChange?.direction === "up" ? "animate-pulse" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Position */}
                    <div className="flex items-center gap-2 w-16">
                      <div className={`text-2xl font-bold ${isLeader ? "text-yellow-500" : "text-muted-foreground"}`}>
                        {entry.position}
                      </div>
                      {positionChange && (
                        <div className="flex flex-col items-center">
                          {positionChange.direction === "up" && (
                            <TrendingUp className="w-4 h-4 text-green-500 animate-bounce" />
                          )}
                          {positionChange.direction === "down" && (
                            <TrendingDown className="w-4 h-4 text-red-500 animate-bounce" />
                          )}
                          {positionChange.direction === "same" && <Minus className="w-4 h-4 text-muted-foreground" />}
                          {positionChange.value > 0 && (
                            <span className="text-xs font-semibold">{positionChange.value}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Player Name */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{entry.playerName}</span>
                        {isChampion && (
                          <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full">
                            <Crown className="w-3 h-3" />
                            (C)
                          </span>
                        )}
                        {isLeader && <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />}
                      </div>
                      <div className="text-sm text-muted-foreground">Handicap: {entry.handicap}</div>
                    </div>

                    {/* Scores */}
                    <div className="flex gap-6 items-center">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Gross</div>
                        <div className="text-lg font-semibold">{entry.totalGross}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Net</div>
                        <div className="text-lg font-semibold">{entry.totalNet}</div>
                      </div>
                      <div className="text-center min-w-[60px]">
                        <div className="text-xs text-muted-foreground">To Par</div>
                        <div
                          className={`text-xl font-bold ${
                            entry.scoreToPar < 0
                              ? "text-green-500"
                              : entry.scoreToPar > 0
                                ? "text-red-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {formatScore(entry.scoreToPar)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
