"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Key, Eye, EyeOff, Settings, Calendar, Trophy, Target, Copy, Check, QrCode } from "lucide-react"
import type { Player, Tournament } from "@/app/page"
import { updateTournament, updatePlayer, getTournamentById } from "@/lib/supabase/db"

type TournamentSettingsProps = {
  currentTournament: Tournament | null
  players: Player[]
  setPlayers: (players: Player[]) => void
  tournaments: Tournament[]
  setTournaments: (tournaments: Tournament[]) => void
}

export function TournamentSettings({
  currentTournament,
  players,
  setPlayers,
  tournaments,
  setTournaments,
}: TournamentSettingsProps) {
  const [localTournament, setLocalTournament] = useState<Tournament | null>(currentTournament)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLocalTournament(currentTournament)
  }, [currentTournament])

  useEffect(() => {
    const loadTournament = async () => {
      if (!currentTournament?.id) return
      try {
        const data = await getTournamentById(currentTournament.id)
        setLocalTournament(data as Tournament)
      } catch (error) {
        console.error("[v0] Error loading tournament:", error)
      }
    }
    loadTournament()
  }, [currentTournament?.id])

  const tournamentPlayers = localTournament ? players.filter((p) => p.tournamentId === localTournament.id) : []

  const handleUpdateTournamentSettings = async (updates: Partial<Tournament>) => {
    if (!localTournament) return

    console.log("[v0] Updating tournament settings:", updates)
    setLoading(true)
    try {
      await updateTournament(localTournament.id, updates)
      console.log("[v0] Tournament updated successfully")

      const updatedTournament = await getTournamentById(localTournament.id)
      console.log("[v0] Reloaded tournament:", updatedTournament)
      setLocalTournament(updatedTournament as Tournament)

      const updatedTournaments = tournaments.map((t) =>
        t.id === localTournament.id ? (updatedTournament as Tournament) : t,
      )
      setTournaments(updatedTournaments)
    } catch (error) {
      console.error("[v0] Error updating tournament:", error)
      alert("Failed to update tournament settings. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSetPlayerPassword = async () => {
    if (!selectedPlayerId || !newPassword) {
      alert("Please select a player and enter a password")
      return
    }

    if (newPassword.length < 4) {
      alert("Password must be at least 4 characters")
      return
    }

    setLoading(true)
    try {
      await updatePlayer(selectedPlayerId, { password: newPassword })

      const updatedPlayers = players.map((p) => (p.id === selectedPlayerId ? { ...p, password: newPassword } : p))
      setPlayers(updatedPlayers)
      setNewPassword("")
      setSelectedPlayerId("")
      alert("Player password updated successfully")
    } catch (error) {
      console.error("[v0] Error updating player password:", error)
      alert("Failed to update password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    if (!localTournament?.code) return
    navigator.clipboard.writeText(localTournament.code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  if (!localTournament) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Settings</CardTitle>
          <CardDescription>No tournament selected</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-[#FFD700]/30 bg-gradient-to-br from-[#2D5016]/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#FFD700]" />
            Tournament Access Code
          </CardTitle>
          <CardDescription>Share this code with players to join the tournament</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-[#2D5016] to-[#1a3a0f] p-6 rounded-lg text-center">
            <p className="text-4xl font-bold text-[#FFD700] tracking-widest mb-2">{localTournament.code}</p>
            <p className="text-sm text-[#F5F1E8]/60 mb-4">Players enter this code to access the tournament</p>
            <Button
              onClick={copyCode}
              variant="secondary"
              className="bg-[#FFD700] text-[#1a3a0f] hover:bg-[#FFD700]/90"
              disabled={loading}
            >
              {codeCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tournament Configuration
          </CardTitle>
          <CardDescription>Configure competition format and scoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="num-days" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Number of Competition Days
              </Label>
              <Select
                value={localTournament.numberOfDays?.toString() || "2"}
                onValueChange={(value) => {
                  console.log("[v0] Changing number of days to:", value)
                  handleUpdateTournamentSettings({ numberOfDays: Number.parseInt(value) })
                }}
                disabled={loading}
              >
                <SelectTrigger id="num-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="2">2 Days</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="4">4 Days</SelectItem>
                  <SelectItem value="5">5 Days</SelectItem>
                  <SelectItem value="6">6 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                !loading && handleUpdateTournamentSettings({ hasPlayAroundDay: !localTournament.hasPlayAroundDay })
              }
            >
              <Switch
                id="play-around"
                checked={localTournament.hasPlayAroundDay || false}
                onCheckedChange={(checked) => handleUpdateTournamentSettings({ hasPlayAroundDay: checked })}
                className="mt-0.5"
                onClick={(e) => e.stopPropagation()}
                disabled={loading}
              />
              <div className="flex-1">
                <Label htmlFor="play-around" className="cursor-pointer font-medium">
                  Include Play Around Day (Practice Day)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a casual practice day before the competition starts
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="scoring-type" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Scoring Type
              </Label>
              <Select
                value={localTournament.scoringType || "handicap"}
                onValueChange={(value: "strokes" | "handicap") =>
                  handleUpdateTournamentSettings({ scoringType: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="scoring-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="handicap">Handicap (Stableford Points)</SelectItem>
                  <SelectItem value="strokes">Stroke Play (Gross Strokes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Feature Toggles
          </CardTitle>
          <CardDescription>Enable or disable tournament features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Calcutta Auction</p>
              <p className="text-sm text-muted-foreground">Allow players to bid on golfers</p>
            </div>
            <Switch
              checked={localTournament.hasCalcutta ?? true}
              onCheckedChange={(checked) => handleUpdateTournamentSettings({ hasCalcutta: checked })}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Pick 3 Predictions</p>
              <p className="text-sm text-muted-foreground">Allow players to predict top 3 finishers</p>
            </div>
            <Switch
              checked={localTournament.hasPick3 ?? true}
              onCheckedChange={(checked) => handleUpdateTournamentSettings({ hasPick3: checked })}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Spectator Permissions
          </CardTitle>
          <CardDescription>Control what spectators can do in the tournament</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Allow Spectator Chat</p>
              <p className="text-sm text-muted-foreground">Let spectators send messages in the chat</p>
            </div>
            <Switch
              checked={localTournament.allowSpectatorChat ?? true}
              onCheckedChange={(checked) => handleUpdateTournamentSettings({ allowSpectatorChat: checked })}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Allow Spectator Feed Posts</p>
              <p className="text-sm text-muted-foreground">Let spectators create posts in the social feed</p>
            </div>
            <Switch
              checked={localTournament.allowSpectatorFeed ?? true}
              onCheckedChange={(checked) => handleUpdateTournamentSettings({ allowSpectatorFeed: checked })}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Allow Spectator Betting</p>
              <p className="text-sm text-muted-foreground">Let spectators participate in auctions and predictions</p>
            </div>
            <Switch
              checked={localTournament.allowSpectatorBetting ?? true}
              onCheckedChange={(checked) => handleUpdateTournamentSettings({ allowSpectatorBetting: checked })}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Player Password Management
          </CardTitle>
          <CardDescription>Set or reset player passwords</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="player-select">Select Player</Label>
              <select
                id="player-select"
                className="w-full p-2 border rounded-md"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                disabled={loading}
              >
                <option value="">Choose a player</option>
                {tournamentPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPlayerId && (
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={handleSetPlayerPassword}
              disabled={!selectedPlayerId || !newPassword || loading}
              className="w-full"
            >
              {loading ? "Setting..." : "Set Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
