"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, UsersIcon } from "lucide-react"

interface Player {
  id: string
  name: string
  handicap: number
}

interface Group {
  id: string
  name: string
  day: number
  tee_time: string | null
  group_players: Array<{ player: Player }>
}

export function GroupsManagement({ competitionId }: { competitionId: string }) {
  const supabase = getSupabaseBrowserClient()
  const [groups, setGroups] = useState<Group[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [day, setDay] = useState<1 | 2>(1)
  const [teeTime, setTeeTime] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [competitionId])

  const loadData = async () => {
    // Load groups
    const { data: groupsData } = await supabase
      .from("groups")
      .select(
        `
        *,
        group_players(
          player:players(id, name, handicap)
        )
      `,
      )
      .eq("competition_id", competitionId)
      .order("day")
      .order("tee_time")

    if (groupsData) setGroups(groupsData)

    // Load players
    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .eq("competition_id", competitionId)
      .order("name")

    if (playersData) setPlayers(playersData)
  }

  const createGroup = async () => {
    if (!name.trim() || selectedPlayers.length === 0) return

    setLoading(true)

    // Create group
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        competition_id: competitionId,
        name: name.trim(),
        day,
        tee_time: teeTime || null,
      })
      .select()
      .single()

    if (groupError || !group) {
      setLoading(false)
      return
    }

    // Add players to group
    const groupPlayers = selectedPlayers.map((playerId) => ({
      group_id: group.id,
      player_id: playerId,
    }))

    await supabase.from("group_players").insert(groupPlayers)

    setName("")
    setTeeTime("")
    setSelectedPlayers([])
    loadData()
    setLoading(false)
  }

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) => (prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Group</CardTitle>
          <CardDescription>Create a new group and assign players</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input id="group-name" placeholder="Group A" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="day">Day</Label>
              <Select value={day.toString()} onValueChange={(v) => setDay(Number.parseInt(v) as 1 | 2)}>
                <SelectTrigger id="day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Day 1</SelectItem>
                  <SelectItem value="2">Day 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tee-time">Tee Time (optional)</Label>
              <Input id="tee-time" type="time" value={teeTime} onChange={(e) => setTeeTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Players (max 4)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {players.map((player) => (
                <div key={player.id} className="flex items-center space-x-2 rounded-lg border bg-white p-3">
                  <Checkbox
                    id={`player-${player.id}`}
                    checked={selectedPlayers.includes(player.id)}
                    onCheckedChange={() => togglePlayer(player.id)}
                    disabled={selectedPlayers.length >= 4 && !selectedPlayers.includes(player.id)}
                  />
                  <label htmlFor={`player-${player.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                    {player.name} (HC: {player.handicap})
                  </label>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600">Selected: {selectedPlayers.length} / 4</p>
          </div>

          <Button onClick={createGroup} disabled={loading || !name.trim() || selectedPlayers.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Groups ({groups.length})
          </CardTitle>
          <CardDescription>Manage competition groups</CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="py-8 text-center text-gray-600">No groups created yet</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="rounded-lg border bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-gray-600">
                        Day {group.day}
                        {group.tee_time && ` - ${group.tee_time}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {group.group_players.map(({ player }) => (
                      <p key={player.id} className="text-sm text-gray-700">
                        • {player.name} (HC: {player.handicap})
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
