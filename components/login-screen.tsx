"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trophy, Eye, EyeOff, Plus, ArrowLeft, Shield, HelpCircle, User } from "lucide-react"
import type { User as UserType } from "@/app/page"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getAllTournaments, getTournamentByCode, getPlayersByTournament } from "@/lib/supabase/db"

type LoginScreenProps = {
  onLogin: (user: UserType, tournamentCode: string) => Promise<void>
  onCreateTournament: (name: string, password: string, adminPassword: string, creatorName: string) => Promise<void>
}

export function LoginScreen({ onLogin, onCreateTournament }: LoginScreenProps) {
  const [step, setStep] = useState<"enter-code" | "create" | "login" | "admin-login">("enter-code")
  const [tournamentCode, setTournamentCode] = useState("")
  const [loading, setLoading] = useState(false)

  const [showForgotCode, setShowForgotCode] = useState(false)
  const [forgotTournamentName, setForgotTournamentName] = useState("")
  const [forgotAdminPassword, setForgotAdminPassword] = useState("")
  const [retrievedCode, setRetrievedCode] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const [creatorName, setCreatorName] = useState("")
  const [newTournamentName, setNewTournamentName] = useState("")
  const [newTournamentPassword, setNewTournamentPassword] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false)

  const [adminPassword, setAdminPassword] = useState("")
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  const [playerName, setPlayerName] = useState("")
  const [playerPassword, setPlayerPassword] = useState("")
  const [showPlayerPassword, setShowPlayerPassword] = useState(false)

  const handleRetrieveCode = async () => {
    const name = forgotTournamentName.trim()
    const password = forgotAdminPassword.trim()

    if (!name) {
      alert("Please enter the tournament name")
      return
    }
    if (!password) {
      alert("Please enter the admin password")
      return
    }

    setLoading(true)
    try {
      const tournaments = await getAllTournaments()
      const tournament = tournaments.find(
        (t: any) => t.name.toLowerCase() === name.toLowerCase() && t.adminPassword === password,
      )

      if (!tournament) {
        alert("No tournament found with that name and password combination")
        return
      }

      setRetrievedCode(tournament.code)
    } catch (error) {
      console.error("[v0] Error retrieving code:", error)
      alert("Failed to retrieve code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyRetrievedCode = () => {
    navigator.clipboard.writeText(retrievedCode)
    alert("Tournament code copied to clipboard!")
    setShowForgotCode(false)
    setTournamentCode(retrievedCode)
    setForgotTournamentName("")
    setForgotAdminPassword("")
    setRetrievedCode("")
  }

  const handleCreateTournament = async () => {
    if (!creatorName.trim()) {
      alert("Please enter your name")
      return
    }
    if (!newTournamentName.trim()) {
      alert("Please enter a tournament name")
      return
    }
    if (!newTournamentPassword) {
      alert("Please enter a player password")
      return
    }
    if (!newAdminPassword) {
      alert("Please enter an admin password")
      return
    }
    if (newTournamentPassword !== confirmPassword) {
      alert("Passwords do not match")
      return
    }
    if (newTournamentPassword.length < 4 || newAdminPassword.length < 4) {
      alert("Passwords must be at least 4 characters")
      return
    }

    setLoading(true)
    try {
      await onCreateTournament(newTournamentName.trim(), newTournamentPassword, newAdminPassword, creatorName.trim())
      setCreatorName("")
      setNewTournamentName("")
      setNewTournamentPassword("")
      setNewAdminPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error("[v0] Error creating tournament:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCodeEntry = () => {
    const code = tournamentCode.trim().toUpperCase()
    if (!code) {
      alert("Please enter a tournament code")
      return
    }

    setStep("login")
  }

  const handlePlayerLogin = async () => {
    const code = tournamentCode.trim().toUpperCase()
    const name = playerName.trim()
    const password = playerPassword.trim()

    if (!name) {
      alert("Please enter your name")
      return
    }
    if (!password) {
      alert("Please enter your password")
      return
    }

    setLoading(true)
    try {
      console.log("[v0] Attempting player login:", { code, name })

      const tournament = await getTournamentByCode(code)
      if (!tournament) {
        alert("Tournament not found")
        return
      }

      const players = await getPlayersByTournament(tournament.id)
      console.log("[v0] Found players:", players.length)

      const player = players.find((p: any) => p.name.toLowerCase() === name.toLowerCase())

      if (!player) {
        alert("Player not found in this tournament")
        return
      }

      if (player.password !== password) {
        alert("Incorrect password")
        return
      }

      console.log("[v0] Player login successful:", player.name)

      const user: UserType = {
        id: player.id,
        name: player.name,
        role: "player",
        handicap: player.handicap || 0,
        password: player.password,
        isAdmin: player.isAdmin || false,
        tournamentId: tournament.id,
      }

      await onLogin(user, code)
    } catch (error) {
      console.error("[v0] Error logging in:", error)
      alert("Failed to login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async () => {
    const code = tournamentCode.trim().toUpperCase()
    if (!adminPassword) {
      alert("Please enter the admin password")
      return
    }

    setLoading(true)
    try {
      const tournament = await getTournamentByCode(code)
      if (!tournament) {
        alert("Tournament not found")
        return
      }

      if (tournament.adminPassword !== adminPassword) {
        alert("Incorrect admin password")
        return
      }

      await onLogin(
        {
          id: "admin-" + code,
          name: "Admin",
          role: "admin",
          handicap: 0,
          password: "",
        },
        code,
      )
    } catch (error) {
      console.error("[v0] Error logging in:", error)
      alert("Invalid tournament code or password")
    } finally {
      setLoading(false)
    }
  }

  if (step === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a3a0f] via-[#2D5016] to-[#8B7355] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="w-12 h-12 text-[#FFD700]" />
              <h1 className="text-4xl font-bold text-[#F5F1E8]">Aussie Golf</h1>
            </div>
            <p className="text-[#F5F1E8]/80">Create Your Tournament</p>
          </div>

          <Card className="shadow-2xl border-2 border-[#FFD700]/20">
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("enter-code")}
                className="w-fit -ml-2 mb-2"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <CardTitle>New Tournament</CardTitle>
              <CardDescription>You will be the tournament admin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="creator-name">Your Name</Label>
                <Input
                  id="creator-name"
                  placeholder="e.g., John Smith"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  className="border-[#2D5016]/20"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">You'll be added as the first player and admin</p>
              </div>

              <div>
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input
                  id="tournament-name"
                  placeholder="e.g., Spring Classic 2025"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  className="border-[#2D5016]/20"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="player-password">Player Password</Label>
                <div className="relative">
                  <Input
                    id="player-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Password for players to join"
                    value={newTournamentPassword}
                    onChange={(e) => setNewTournamentPassword(e.target.value)}
                    className="border-[#2D5016]/20"
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
                <p className="text-xs text-muted-foreground mt-1">Players use this to join the tournament</p>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm Player Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter player password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-[#2D5016]/20"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="admin-password">Admin Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showNewAdminPassword ? "text" : "password"}
                    placeholder="Password for admin access"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleCreateTournament()}
                    className="border-[#2D5016]/20"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                    disabled={loading}
                  >
                    {showNewAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Keep this secure - only for admin access</p>
              </div>

              <Button
                onClick={handleCreateTournament}
                className="w-full bg-[#2D5016] hover:bg-[#1a3a0f]"
                size="lg"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Tournament"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a3a0f] via-[#2D5016] to-[#8B7355] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="w-12 h-12 text-[#FFD700]" />
              <h1 className="text-4xl font-bold text-[#F5F1E8]">Aussie Golf</h1>
            </div>
            <p className="text-[#F5F1E8]/80">Tournament: {tournamentCode}</p>
          </div>

          <Card className="shadow-2xl border-2 border-[#FFD700]/20">
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("enter-code")
                  setPlayerName("")
                  setPlayerPassword("")
                }}
                className="w-fit -ml-2 mb-2"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#FFD700]" />
                Player Login
              </CardTitle>
              <CardDescription>Enter your name and password to join</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="player-name">Your Name</Label>
                <Input
                  id="player-name"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="border-[#2D5016]/20"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="player-password">Password</Label>
                <div className="relative">
                  <Input
                    id="player-password"
                    type={showPlayerPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={playerPassword}
                    onChange={(e) => setPlayerPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handlePlayerLogin()}
                    className="border-[#2D5016]/20"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPlayerPassword(!showPlayerPassword)}
                    disabled={loading}
                  >
                    {showPlayerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handlePlayerLogin}
                className="w-full bg-[#2D5016] hover:bg-[#1a3a0f]"
                size="lg"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login as Player"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#2D5016]/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setStep("admin-login")
                  setPlayerName("")
                  setPlayerPassword("")
                }}
                variant="outline"
                className="w-full border-2 border-[#FFD700]/30 hover:bg-[#FFD700]/10"
                disabled={loading}
              >
                <Shield className="w-4 h-4 mr-2" />
                Login as Admin
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === "admin-login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a3a0f] via-[#2D5016] to-[#8B7355] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="w-12 h-12 text-[#FFD700]" />
              <h1 className="text-4xl font-bold text-[#F5F1E8]">Aussie Golf</h1>
            </div>
            <p className="text-[#F5F1E8]/80">Tournament: {tournamentCode}</p>
          </div>

          <Card className="shadow-2xl border-2 border-[#FFD700]/20">
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("login")
                  setAdminPassword("")
                }}
                className="w-fit -ml-2 mb-2"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FFD700]" />
                Admin Login
              </CardTitle>
              <CardDescription>Enter the admin password to access tournament</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="admin-password">Admin Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showAdminPassword ? "text" : "password"}
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleAdminLogin()}
                    className="border-[#2D5016]/20"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    disabled={loading}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleAdminLogin}
                className="w-full bg-[#2D5016] hover:bg-[#1a3a0f]"
                size="lg"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login as Admin"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a3a0f] via-[#2D5016] to-[#8B7355] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-16 h-16 text-[#FFD700] drop-shadow-lg" />
            <h1 className="text-5xl font-bold text-[#F5F1E8] drop-shadow-lg">Aussie Golf</h1>
          </div>
          <p className="text-[#F5F1E8]/90 text-lg">Professional Tournament Management</p>
        </div>

        <Card className="shadow-2xl border-2 border-[#FFD700]/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>Enter your tournament code or create a new tournament</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tournament-code" className="text-base">
                Tournament Code
              </Label>
              <Input
                id="tournament-code"
                placeholder="Enter 6-digit code"
                value={tournamentCode}
                onChange={(e) => setTournamentCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleCodeEntry()}
                className="text-center text-2xl font-bold tracking-widest border-[#2D5016]/20"
                maxLength={6}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground text-center">Get this code from your tournament admin</p>
            </div>

            <Button
              onClick={handleCodeEntry}
              className="w-full bg-[#2D5016] hover:bg-[#1a3a0f]"
              size="lg"
              disabled={loading}
            >
              Join Tournament
            </Button>

            <Dialog open={showForgotCode} onOpenChange={setShowForgotCode}>
              <DialogTrigger asChild>
                <Button
                  variant="link"
                  className="w-full text-sm text-muted-foreground hover:text-[#FFD700]"
                  disabled={loading}
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Forgot Tournament Code? (Admin Only)
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#FFD700]" />
                    Retrieve Tournament Code
                  </DialogTitle>
                  <DialogDescription>
                    Enter your tournament name and admin password to retrieve your code
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!retrievedCode ? (
                    <>
                      <div>
                        <Label htmlFor="forgot-name">Tournament Name</Label>
                        <Input
                          id="forgot-name"
                          placeholder="Enter exact tournament name"
                          value={forgotTournamentName}
                          onChange={(e) => setForgotTournamentName(e.target.value)}
                          className="border-[#2D5016]/20"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="forgot-password">Admin Password</Label>
                        <div className="relative">
                          <Input
                            id="forgot-password"
                            type={showForgotPassword ? "text" : "password"}
                            placeholder="Enter admin password"
                            value={forgotAdminPassword}
                            onChange={(e) => setForgotAdminPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !loading && handleRetrieveCode()}
                            className="border-[#2D5016]/20"
                            disabled={loading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowForgotPassword(!showForgotPassword)}
                            disabled={loading}
                          >
                            {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={handleRetrieveCode}
                        className="w-full bg-[#2D5016] hover:bg-[#1a3a0f]"
                        disabled={loading}
                      >
                        {loading ? "Retrieving..." : "Retrieve Code"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-center space-y-4">
                        <div className="p-6 bg-[#2D5016]/10 rounded-lg border-2 border-[#FFD700]/30">
                          <p className="text-sm text-muted-foreground mb-2">Your Tournament Code</p>
                          <p className="text-4xl font-bold tracking-widest text-[#FFD700]">{retrievedCode}</p>
                        </div>
                        <Button onClick={handleCopyRetrievedCode} className="w-full bg-[#2D5016] hover:bg-[#1a3a0f]">
                          Copy Code & Continue
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#2D5016]/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              onClick={() => setStep("create")}
              variant="outline"
              className="w-full border-2 border-[#FFD700]/30 hover:bg-[#FFD700]/10"
              size="lg"
              disabled={loading}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Tournament
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
