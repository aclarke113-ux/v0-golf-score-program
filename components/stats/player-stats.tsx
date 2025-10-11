"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Target, BarChart3 } from "lucide-react"

interface PlayerStats {
  totalRounds: number
  averageGross: number
  averageNet: number
  bestRound: number
  worstRound: number
  bestNet: number
  handicap: number
  holeStats: {
    [hole: number]: {
      average: number
      best: number
      worst: number
      pars: number
      birdies: number
      bogeys: number
      doubles: number
    }
  }
  trends: Array<{
    roundNumber: number
    day: number
    gross: number
    net: number
    date: string
  }>
  scoreDistribution: {
    birdiesOrBetter: number
    pars: number
    bogeys: number
    doubleOrWorse: number
  }
}

export function PlayerStats({
  competitionId,
  playerId,
  playerName,
}: { competitionId: string; playerId: string; playerName: string }) {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [competitionId, playerId])

  const loadStats = async () => {
    const res = await fetch(`/api/competitions/${competitionId}/players/${playerId}/stats`)
    const data = await res.json()
    setStats(data.stats)
    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>
  }

  if (!stats) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No statistics available yet. Complete some rounds to see your performance data.
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">{playerName} - Performance Stats</h2>
        <p className="text-muted-foreground">Detailed analysis across {stats.totalRounds} completed rounds</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Average Score</div>
          <div className="text-2xl font-bold">{stats.averageGross}</div>
          <div className="text-xs text-muted-foreground">Net: {stats.averageNet}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Best Round</div>
          <div className="text-2xl font-bold text-green-500">{stats.bestRound}</div>
          <div className="text-xs text-muted-foreground">Net: {stats.bestNet}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Worst Round</div>
          <div className="text-2xl font-bold text-red-500">{stats.worstRound}</div>
          <div className="text-xs text-muted-foreground">Gross score</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Handicap</div>
          <div className="text-2xl font-bold">{stats.handicap}</div>
          <div className="text-xs text-muted-foreground">Current</div>
        </Card>
      </div>

      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="distribution">Score Distribution</TabsTrigger>
          <TabsTrigger value="holes">Hole Analysis</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Score Distribution
            </h3>
            <div className="space-y-3">
              <ScoreBar
                label="Birdies or Better"
                count={stats.scoreDistribution.birdiesOrBetter}
                total={stats.totalRounds * 18}
                color="bg-green-500"
              />
              <ScoreBar
                label="Pars"
                count={stats.scoreDistribution.pars}
                total={stats.totalRounds * 18}
                color="bg-blue-500"
              />
              <ScoreBar
                label="Bogeys"
                count={stats.scoreDistribution.bogeys}
                total={stats.totalRounds * 18}
                color="bg-yellow-500"
              />
              <ScoreBar
                label="Double or Worse"
                count={stats.scoreDistribution.doubleOrWorse}
                total={stats.totalRounds * 18}
                color="bg-red-500"
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="holes" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Hole-by-Hole Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(stats.holeStats).map(([hole, data]) => (
                <Card key={hole} className="p-3 bg-muted/50">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Hole {hole}</div>
                    <div className="text-xl font-bold">{data.average.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Best: {data.best} | Worst: {data.worst}
                    </div>
                    <div className="flex justify-center gap-1 mt-2 text-xs">
                      {data.birdies > 0 && <span className="text-green-500">🐦{data.birdies}</span>}
                      {data.pars > 0 && <span className="text-blue-500">P{data.pars}</span>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Round-by-Round Performance
            </h3>
            <div className="space-y-2">
              {stats.trends.map((trend, index) => {
                const isImprovement = index > 0 && trend.net < stats.trends[index - 1].net
                const isDecline = index > 0 && trend.net > stats.trends[index - 1].net

                return (
                  <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="text-center min-w-[80px]">
                      <div className="text-xs text-muted-foreground">Round {trend.roundNumber}</div>
                      <div className="text-sm font-semibold">Day {trend.day}</div>
                    </div>

                    <div className="flex-1 flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Gross</div>
                        <div className="text-lg font-bold">{trend.gross}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Net</div>
                        <div className="text-lg font-bold">{trend.net}</div>
                      </div>
                    </div>

                    {index > 0 && (
                      <div className="flex items-center gap-1">
                        {isImprovement && <TrendingDown className="w-5 h-5 text-green-500" />}
                        {isDecline && <TrendingUp className="w-5 h-5 text-red-500" />}
                        {!isImprovement && !isDecline && <span className="text-muted-foreground">-</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ScoreBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = (count / total) * 100

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-semibold">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
