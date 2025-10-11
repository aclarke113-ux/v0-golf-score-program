"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Trophy, Calendar, Gavel, Target, Upload, Loader2 } from "lucide-react"
import type { User, Player, Tournament } from "@/lib/types"
import { uploadProfilePicture } from "@/app/actions/upload-profile-picture"

type PlayerSettingsProps = {
  currentUser: User
  players: Player[]
  setPlayers: (players: Player[]) => void
  currentTournament?: Tournament | null
  onNavigateToAuction?: () => void
  onNavigateToPredictions?: () => void
}

export function PlayerSettings({
  currentUser,
  players,
  setPlayers,
  currentTournament,
  onNavigateToAuction,
  onNavigateToPredictions,
}: PlayerSettingsProps) {
  const currentPlayer = players.find((p) => p.id === currentUser.id)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [uploading, setUploading] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handlePasswordChange = () => {
    if (!currentPlayer) return

    if (newPassword !== confirmPassword) {
      alert("Passwords don't match!")
      return
    }

    if (newPassword.length < 4) {
      alert("Password must be at least 4 characters")
      return
    }

    const updatedPlayers = players.map((p) => (p.id === currentPlayer.id ? { ...p, password: newPassword } : p))
    setPlayers(updatedPlayers)
    setNewPassword("")
    setConfirmPassword("")
    alert("Password updated successfully!")
  }

  const handleFileUpload = async (file: File) => {
    if (!currentPlayer) return

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadProfilePicture(formData)

      if (result.error) {
        alert(result.error)
        return
      }

      const updatedPlayers = players.map((p) => (p.id === currentPlayer.id ? { ...p, profilePicture: result.url } : p))
      setPlayers(updatedPlayers)
      alert("Profile picture updated!")
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      alert("Failed to upload profile picture")
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  if (!currentPlayer) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Player not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 pb-20">
      {(currentTournament?.calcuttaEnabled !== false || currentTournament?.pick3Enabled !== false) && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Access tournament features</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {currentTournament?.calcuttaEnabled !== false && (
              <Button
                onClick={onNavigateToAuction}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 bg-transparent"
              >
                <Gavel className="w-6 h-6 text-primary" />
                <span className="text-sm font-semibold">Auction</span>
              </Button>
            )}
            {currentTournament?.pick3Enabled !== false && (
              <Button
                onClick={onNavigateToPredictions}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 bg-transparent"
              >
                <Target className="w-6 h-6 text-primary" />
                <span className="text-sm font-semibold">Pick 3</span>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Take a photo or choose from your gallery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-32 h-32">
              <AvatarImage src={currentPlayer.profilePicture || "/placeholder.svg"} />
              <AvatarFallback className="text-3xl">{currentPlayer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="w-full grid grid-cols-2 gap-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    <span className="text-sm">Take Photo</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Choose Photo</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Championship History</CardTitle>
          <CardDescription>Your tournament wins</CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlayer.isCurrentChampion && (
            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-400 rounded-lg flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-600" />
              <div>
                <p className="font-bold text-amber-900">Current Champion</p>
                <p className="text-sm text-amber-700">Defending your title!</p>
              </div>
            </div>
          )}

          {currentPlayer.championshipWins && currentPlayer.championshipWins.length > 0 ? (
            <div className="space-y-2">
              <p className="font-semibold text-lg">
                {currentPlayer.championshipWins.length} Championship
                {currentPlayer.championshipWins.length > 1 ? "s" : ""}
              </p>
              {currentPlayer.championshipWins.map((win, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{win.year}</span>
                  {win.notes && <span className="text-sm text-muted-foreground">- {win.notes}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No championship wins yet. Keep playing!</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <Button onClick={handlePasswordChange} className="w-full">
            Update Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Player Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{currentPlayer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Handicap:</span>
            <span className="font-medium">{currentPlayer.handicap}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
