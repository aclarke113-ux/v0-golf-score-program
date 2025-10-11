"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Users } from "lucide-react"

interface Player {
  id: string
  name: string
  handicap: number
}

export function PlayersManagement({ competitionId }: { competitionId: string }) {
  const supabase = getSupabaseBrowserClient()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [handicap, setHandicap] = useState(0)

  useEffect(() => {
    loadPlayers()
  }, [competitionId])

  const loadPlayers = async () => {
    const { data } = await supabase.from("players").select("*").eq("competition_id", competitionId).order("name")

    if (data) setPlayers(data)
  }

  const addPlayer = async () => {
    if (!name.trim()) return

    setLoading(true)

    const { error } = await supabase.from("players").insert({
      competition_id: competitionId,
      name: name.trim(),
      handicap,
    })

    if (!error) {
      setName("")
      setHandicap(0)
      loadPlayers()
    }

    setLoading(false)
  }

  const deletePlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to delete this player?")) return

    const { error } = await supabase.from("players").delete().eq("id", playerId)

    if (!error) {
      loadPlayers()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Player</CardTitle>
          <CardDescription>Add a new player to the competition (max 40 players)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="player-name">Player Name</Label>
              <Input
                id="player-name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              />
            </div>
            <div className="w-32 space-y-2">
              <Label htmlFor="handicap">Handicap</Label>
              <Input
                id="handicap"
                type="number"
                min="0"
                max="54"
                value={handicap}
                onChange={(e) => setHandicap(Number.parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addPlayer} disabled={loading || !name.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Players ({players.length})
          </CardTitle>
          <CardDescription>Manage competition players</CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="py-8 text-center text-gray-600">No players added yet</p>
          ) : (
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <p className="text-sm text-gray-600">Handicap: {player.handicap}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deletePlayer(player.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
