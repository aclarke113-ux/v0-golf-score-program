"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Crown, Trophy, Plus, X } from "lucide-react"
import { put } from "@vercel/blob"

interface ChampionshipWinner {
  id: string
  player_id: string
  year: number
  winning_score: number
  photo_url: string | null
  notes: string | null
  totalWins: number
  player: {
    id: string
    name: string
    user_id: string
  }
}

interface CurrentChampion {
  id: string
  name: string
  user_id: string
}

export function ChampionshipHistory({
  competitionId,
  isAdmin,
}: {
  competitionId: string
  isAdmin: boolean
}) {
  const [winners, setWinners] = useState<ChampionshipWinner[]>([])
  const [currentChampion, setCurrentChampion] = useState<CurrentChampion | null>(null)
  const [championPhotoUrl, setChampionPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadChampionships()
  }, [competitionId])

  const loadChampionships = async () => {
    const res = await fetch(`/api/competitions/${competitionId}/championships`)
    const data = await res.json()
    setWinners(data.winners || [])
    setCurrentChampion(data.currentChampion)
    setChampionPhotoUrl(data.championPhotoUrl)
    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-8">Loading championship history...</div>
  }

  return (
    <div className="space-y-6">
      {/* Current Champion Banner */}
      {currentChampion && (
        <Card className="p-6 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/50">
          <div className="flex items-center gap-6">
            <div className="relative">
              {championPhotoUrl ? (
                <img
                  src={championPhotoUrl || "/placeholder.svg"}
                  alt={currentChampion.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-yellow-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-yellow-500/20 flex items-center justify-center border-4 border-yellow-500">
                  <Crown className="w-12 h-12 text-yellow-500" />
                </div>
              )}
              <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
                <Crown className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-semibold text-yellow-600 uppercase tracking-wide">
                  Defending Champion
                </span>
              </div>
              <h3 className="text-3xl font-bold">{currentChampion.name}</h3>
              <p className="text-muted-foreground mt-1">
                {winners.filter((w) => w.player_id === currentChampion.id).length} time
                {winners.filter((w) => w.player_id === currentChampion.id).length !== 1 ? "s" : ""} champion
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Championship History */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Championship History</h2>
          {isAdmin && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Winner
            </Button>
          )}
        </div>

        {winners.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No championship history yet. Add past winners to build the legacy!
          </Card>
        ) : (
          <div className="grid gap-4">
            {winners.map((winner) => (
              <Card key={winner.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[80px]">
                    <div className="text-3xl font-bold text-yellow-500">{winner.year}</div>
                  </div>

                  {winner.photo_url && (
                    <img
                      src={winner.photo_url || "/placeholder.svg"}
                      alt={winner.player.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-semibold">{winner.player.name}</h4>
                      {winner.totalWins > 1 && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full">
                          {winner.totalWins}x Champion
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Winning Score: {winner.winning_score}</p>
                    {winner.notes && <p className="text-sm mt-1">{winner.notes}</p>}
                  </div>

                  <Trophy className="w-8 h-8 text-yellow-500" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddWinnerModal
          competitionId={competitionId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            loadChampionships()
          }}
        />
      )}
    </div>
  )
}

function AddWinnerModal({ competitionId, onClose, onSuccess }: any) {
  const [players, setPlayers] = useState<any[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [winningScore, setWinningScore] = useState("")
  const [notes, setNotes] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async () => {
    const res = await fetch(`/api/competitions/${competitionId}/players`)
    const data = await res.json()
    setPlayers(data.players || [])
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!selectedPlayer || !year || !winningScore) return

    setUploading(true)

    let photoUrl = null
    if (photo) {
      const blob = await put(`championships/${competitionId}/${year}-${photo.name}`, photo, {
        access: "public",
      })
      photoUrl = blob.url
    }

    const res = await fetch(`/api/competitions/${competitionId}/championships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: selectedPlayer,
        year: Number.parseInt(year),
        winningScore: Number.parseInt(winningScore),
        photoUrl,
        notes,
      }),
    })

    if (res.ok) {
      onSuccess()
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Add Championship Winner</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {photoPreview && (
          <div className="flex justify-center">
            <img
              src={photoPreview || "/placeholder.svg"}
              alt="Champion preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-yellow-500"
            />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label>Champion Photo (Optional)</Label>
            <Input type="file" accept="image/*" onChange={handlePhotoChange} />
          </div>

          <div>
            <Label>Player</Label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
            >
              <option value="">Select player...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>

          <div>
            <Label>Winning Score</Label>
            <Input type="number" value={winningScore} onChange={(e) => setWinningScore(e.target.value)} />
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add memorable moments or details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPlayer || !year || !winningScore || uploading}
            className="flex-1"
          >
            {uploading ? "Adding..." : "Add Winner"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
