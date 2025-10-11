"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react"
import { createPlayer, updatePlayer, deletePlayer as deletePlayerDb, getPlayersByTournament } from "@/lib/supabase/db"
import type { Player } from "@/app/page"

type PlayerManagementProps = {
  players: Player[]
  setPlayers: (players: Player[]) => void
  currentTournamentId: string | null
}

export function PlayerManagement({ players, setPlayers, currentTournamentId }: PlayerManagementProps) {
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerHandicap, setNewPlayerHandicap] = useState("0")
  const [newPlayerPassword, setNewPlayerPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [newPlayerIsSpectator, setNewPlayerIsSpectator] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editHandicap, setEditHandicap] = useState("0")
  const [editPassword, setEditPassword] = useState("")
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [editIsSpectator, setEditIsSpectator] = useState(false)
  const [loading, setLoading] = useState(false)

  const tournamentPlayers = players.filter((p) => p.tournamentId === currentTournamentId)

  const addPlayer = async () => {
    console.log("[v0] Add player clicked", {
      name: newPlayerName,
      hasPassword: !!newPlayerPassword,
      tournamentId: currentTournamentId,
      isSpectator: newPlayerIsSpectator,
    })

    if (!newPlayerName.trim()) {
      console.log("[v0] Player name is empty")
      return
    }
    if (!newPlayerPassword.trim()) {
      console.log("[v0] Player password is empty")
      alert("Please enter a password for the player")
      return
    }
    if (!currentTournamentId) {
      console.log("[v0] No tournament ID")
      alert("No tournament selected")
      return
    }

    setLoading(true)
    try {
      console.log("[v0] Creating player in database...")
      const newPlayer = await createPlayer({
        name: newPlayerName.trim(),
        handicap: Number.parseFloat(newPlayerHandicap) || 0,
        password: newPlayerPassword.trim(),
        tournamentId: currentTournamentId,
        isSpectator: newPlayerIsSpectator,
        isAdmin: false,
        teePreference: "white",
      })

      console.log("[v0] Player created successfully:", newPlayer)
      console.log("[v0] Reloading players from database...")
      const updatedPlayers = await getPlayersByTournament(currentTournamentId)
      console.log("[v0] Loaded players:", updatedPlayers.length)
      setPlayers(updatedPlayers as Player[])

      setNewPlayerName("")
      setNewPlayerHandicap("0")
      setNewPlayerPassword("")
      setNewPlayerIsSpectator(false)
    } catch (error) {
      console.error("[v0] Error creating player:", error)
      alert(`Failed to create player: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (player: Player) => {
    setEditingId(player.id)
    setEditName(player.name)
    setEditHandicap(player.handicap.toString())
    setEditPassword(player.password || "")
    setEditIsSpectator(player.isSpectator || false)
  }

  const saveEdit = async () => {
    if (!editingId) return
    if (!editPassword.trim()) {
      alert("Password cannot be empty")
      return
    }

    setLoading(true)
    try {
      const updatedPlayer = await updatePlayer(editingId, {
        name: editName.trim(),
        handicap: Number.parseFloat(editHandicap) || 0,
        password: editPassword.trim(),
        isSpectator: editIsSpectator,
      })

      setPlayers(players.map((p) => (p.id === editingId ? (updatedPlayer as Player) : p)))
      setEditingId(null)
      setShowEditPassword(false)
    } catch (error) {
      console.error("[v0] Error updating player:", error)
      alert("Failed to update player. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlayer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this player?")) return

    setLoading(true)
    try {
      await deletePlayerDb(id)
      setPlayers(players.filter((p) => p.id !== id))
    } catch (error) {
      console.error("[v0] Error deleting player:", error)
      alert("Failed to delete player. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Player</CardTitle>
          <CardDescription>Add players to your golf tournament (up to 300 players)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="player-name">Player Name</Label>
              <Input
                id="player-name"
                placeholder="Enter player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="player-handicap">Handicap</Label>
              <Input
                id="player-handicap"
                type="number"
                step="0.1"
                placeholder="0"
                value={newPlayerHandicap}
                onChange={(e) => setNewPlayerHandicap(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="player-password">Password</Label>
              <div className="relative">
                <Input
                  id="player-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={newPlayerPassword}
                  onChange={(e) => setNewPlayerPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && addPlayer()}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="md:col-span-2">
              <div
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => !loading && setNewPlayerIsSpectator(!newPlayerIsSpectator)}
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="player-spectator" className="cursor-pointer font-medium">
                      Spectator Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">View-only, not playing in tournament</p>
                  </div>
                </div>
                <Switch
                  id="player-spectator"
                  checked={newPlayerIsSpectator}
                  onCheckedChange={setNewPlayerIsSpectator}
                  onClick={(e) => e.stopPropagation()}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
          <Button
            onClick={addPlayer}
            className="mt-4 w-full md:w-auto"
            disabled={tournamentPlayers.length >= 300 || loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            {loading ? "Adding..." : "Add Player"}
          </Button>
          {tournamentPlayers.length >= 300 && (
            <p className="text-sm text-destructive mt-2">Maximum of 300 players reached</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Players ({tournamentPlayers.length}/300)</CardTitle>
          <CardDescription>Manage player information and handicaps</CardDescription>
        </CardHeader>
        <CardContent>
          {tournamentPlayers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No players added yet</p>
          ) : (
            <div className="space-y-2">
              {tournamentPlayers.map((player) => (
                <div key={player.id} className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                  {editingId === player.id ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        disabled={loading}
                      />
                      <Input
                        type="number"
                        step="0.1"
                        value={editHandicap}
                        onChange={(e) => setEditHandicap(e.target.value)}
                        placeholder="Handicap"
                        disabled={loading}
                      />
                      <div className="relative">
                        <Input
                          type={showEditPassword ? "text" : "password"}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Password"
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          disabled={loading}
                        >
                          {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <div className="md:col-span-3">
                        <div
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => !loading && setEditIsSpectator(!editIsSpectator)}
                        >
                          <div className="flex items-center gap-3">
                            <Eye className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <Label htmlFor="edit-spectator" className="cursor-pointer font-medium">
                                Spectator Mode
                              </Label>
                              <p className="text-sm text-muted-foreground">View-only, not playing in tournament</p>
                            </div>
                          </div>
                          <Switch
                            id="edit-spectator"
                            checked={editIsSpectator}
                            onCheckedChange={setEditIsSpectator}
                            onClick={(e) => e.stopPropagation()}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 md:col-span-3">
                        <Button onClick={saveEdit} size="sm" disabled={loading}>
                          {loading ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingId(null)
                            setShowEditPassword(false)
                          }}
                          size="sm"
                          variant="outline"
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{player.name}</p>
                          {player.isSpectator && (
                            <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Spectator
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {player.isSpectator ? "Spectator" : `Handicap: ${player.handicap}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => startEdit(player)} size="sm" variant="outline" disabled={loading}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeletePlayer(player.id)}
                          size="sm"
                          variant="destructive"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
