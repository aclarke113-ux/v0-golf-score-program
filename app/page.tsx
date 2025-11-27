"use client"

import { useState, useEffect } from "react"
import { AdminDashboard } from "@/components/admin-dashboard"
import { PlayerDashboard } from "@/components/player-dashboard"
import { LoginScreen } from "@/components/login-screen"
import { SplashScreen } from "@/components/splash-screen"
import {
  getTournamentByCode,
  getPlayersByTournament,
  getCoursesByTournament,
  getGroupsByTournament,
  getCompetitionsByTournament,
  getAuctionsByTournament,
  getPredictionsByTournament,
  createPlayer,
  getCreditsByTournament,
  getRoundsByTournament,
  getTournamentById,
} from "@/lib/supabase/db"
import { initializeSupabase } from "@/lib/supabase/client"
import type {
  User,
  Tournament,
  Player,
  Course,
  Group,
  Round,
  Competition,
  CompetitionEntry,
  Prediction,
  Auction,
  PlayerCredit,
  Message,
  Post,
  Notification,
} from "@/lib/types"

export type {
  User,
  Player,
  Course,
  Group,
  Round,
  Competition,
  CompetitionEntry,
  Prediction,
  Auction,
  PlayerCredit,
  HoleScore,
  Hole,
  Tournament,
} from "@/lib/types"

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null)
  const [showSplash, setShowSplash] = useState(true)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [supabaseReady, setSupabaseReady] = useState(false)

  // Tournament data loaded from Supabase
  const [players, setPlayers] = useState<Player[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [playerCredits, setPlayerCredits] = useState<PlayerCredit[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    initializeSupabase()
      .then(() => {
        console.log("[v0] Supabase initialized successfully")
        setSupabaseReady(true)
      })
      .catch((error) => {
        console.error("[v0] Failed to initialize Supabase:", error)
        alert("Failed to connect to database. Please refresh the page.")
      })
  }, [])

  useEffect(() => {
    const loadSession = () => {
      try {
        console.log("[v0] Checking for saved session...")
        const savedUser = localStorage.getItem("currentUser")
        const savedTournament = localStorage.getItem("currentTournament")

        if (savedUser && savedTournament) {
          console.log("[v0] Found saved session, restoring...")
          setCurrentUser(JSON.parse(savedUser))
          setCurrentTournament(JSON.parse(savedTournament))
        } else {
          console.log("[v0] No saved session found")
        }
      } catch (error) {
        console.error("Error loading session:", error)
        localStorage.removeItem("currentUser")
        localStorage.removeItem("currentTournament")
      } finally {
        setCheckingSession(false)
      }
    }

    loadSession()
  }, [])

  useEffect(() => {
    const loadTournamentData = async () => {
      if (!currentTournament || !supabaseReady) return

      if (players.length === 0 && courses.length === 0 && groups.length === 0) {
        await refreshTournamentData()
      }
    }

    loadTournamentData()
  }, [currentTournament, supabaseReady])

  useEffect(() => {
    const refreshRounds = async () => {
      if (!currentTournament?.id || !supabaseReady) {
        return
      }

      try {
        const roundsData = await getRoundsByTournament(currentTournament.id)
        setRounds(roundsData as Round[])
      } catch (error) {
        // Silently handle errors - don't spam console
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage.includes("configuration")) {
          console.error("Error refreshing rounds:", error)
        }
      }
    }

    if (!currentTournament || !supabaseReady) return

    // Refresh immediately on mount
    refreshRounds()

    // Then refresh every 15 seconds
    const interval = setInterval(refreshRounds, 15000)

    return () => clearInterval(interval)
  }, [currentTournament, supabaseReady])

  const refreshTournament = async () => {
    if (!currentTournament?.id || !supabaseReady) return

    try {
      const updatedTournament = await getTournamentById(currentTournament.id)

      if (updatedTournament) {
        console.log("[v0] Refreshed tournament data:", updatedTournament)
        setCurrentTournament(updatedTournament as Tournament)
        localStorage.setItem("currentTournament", JSON.stringify(updatedTournament))
      }
    } catch (error) {
      console.error("Error refreshing tournament:", error)
    }
  }

  useEffect(() => {
    if (!currentTournament?.id || !supabaseReady) return

    const interval = setInterval(refreshTournament, 30000)
    return () => clearInterval(interval)
  }, [currentTournament?.id, supabaseReady])

  const generateTournamentCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreateTournament = async (name: string, password: string, adminPassword: string, creatorName: string) => {
    setLoading(true)
    try {
      const code = generateTournamentCode()

      const response = await fetch("/api/tournaments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
          password,
          adminPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create tournament")
      }

      const newTournament = await response.json()

      const creatorPlayer = await createPlayer({
        name: creatorName,
        handicap: 0,
        password: password,
        tournamentId: newTournament.id,
        isAdmin: true,
        isSpectator: false,
      })

      setPlayers([creatorPlayer as Player])

      const user: User = {
        id: creatorPlayer.id,
        name: creatorName,
        role: "player",
        handicap: 0,
        password: password,
        isAdmin: true,
        tournamentId: newTournament.id,
      }

      setCurrentTournament(newTournament as Tournament)
      setCurrentUser(user)

      localStorage.setItem("currentUser", JSON.stringify(user))
      localStorage.setItem("currentTournament", JSON.stringify(newTournament))
    } catch (error) {
      console.error("Error creating tournament:", error)
      alert("Failed to create tournament. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (user: User, tournamentCode: string) => {
    setLoading(true)
    try {
      const tournament = await getTournamentByCode(tournamentCode)

      if (!tournament) {
        alert("Tournament not found")
        return
      }

      const userWithTournament = {
        ...user,
        tournamentId: tournament.id,
      }

      setCurrentUser(userWithTournament)
      setCurrentTournament(tournament as Tournament)

      localStorage.setItem("currentUser", JSON.stringify(userWithTournament))
      localStorage.setItem("currentTournament", JSON.stringify(tournament))
    } catch (error) {
      console.error("Error logging in:", error)
      alert("Failed to login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentTournament(null)
    setPlayers([])
    setCourses([])
    setGroups([])
    setRounds([])
    setCompetitions([])
    setMessages([])
    setPosts([])
    setAuctions([])
    setPredictions([])
    setPlayerCredits([])

    localStorage.removeItem("currentUser")
    localStorage.removeItem("currentTournament")
  }

  const refreshTournamentData = async () => {
    if (!currentTournament || !supabaseReady) return

    try {
      await refreshTournament()

      const [
        playersData,
        coursesData,
        groupsData,
        competitionsData,
        predictionsData,
        auctionsData,
        creditsData,
        roundsData,
      ] = await Promise.all([
        getPlayersByTournament(currentTournament.id),
        getCoursesByTournament(currentTournament.id),
        getGroupsByTournament(currentTournament.id),
        getCompetitionsByTournament(currentTournament.id),
        getPredictionsByTournament(currentTournament.id),
        getAuctionsByTournament(currentTournament.id),
        getCreditsByTournament(currentTournament.id),
        getRoundsByTournament(currentTournament.id),
      ])

      setPlayers(playersData as Player[])
      setCourses(coursesData as Course[])
      setGroups(groupsData as Group[])
      setCompetitions(competitionsData as Competition[])
      setPredictions(predictionsData as Prediction[])
      setAuctions(auctionsData as Auction[])
      setPlayerCredits(creditsData as PlayerCredit[])
      setRounds(roundsData as Round[])
    } catch (error) {
      console.error("Error refreshing tournament data:", error)
    }
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-2xl font-bold text-white mb-2">Loading...</p>
          <p className="text-emerald-200">Checking your session</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-2xl font-bold text-white mb-2">Loading Tournament...</p>
          <p className="text-emerald-200">Please wait while we load your data</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} onCreateTournament={handleCreateTournament} />
  }

  if (currentUser.role === "admin") {
    return (
      <AdminDashboard
        currentUser={currentUser}
        currentTournament={currentTournament}
        players={players}
        setPlayers={setPlayers}
        courses={courses}
        setCourses={setCourses}
        groups={groups}
        setGroups={setGroups}
        rounds={rounds}
        setRounds={setRounds}
        competitions={competitions}
        setCompetitions={setCompetitions}
        competitionEntries={competitionEntries}
        predictions={predictions}
        auctions={auctions}
        playerCredits={playerCredits}
        setPlayerCredits={setPlayerCredits}
        predictionsLocked={false}
        setPredictionsLocked={() => {}}
        auctionsLocked={false}
        setAuctionsLocked={() => {}}
        tournaments={currentTournament ? [currentTournament] : []}
        setTournaments={(tournaments) => setCurrentTournament(tournaments[0] || null)}
        onLogout={handleLogout}
        onDataChange={refreshTournamentData}
      />
    )
  }

  return (
    <PlayerDashboard
      currentUser={currentUser}
      currentTournament={currentTournament}
      players={players}
      setPlayers={setPlayers}
      courses={courses}
      setCourses={setCourses}
      groups={groups}
      setGroups={setGroups}
      rounds={rounds}
      setRounds={setRounds}
      competitions={competitions}
      setCompetitions={setCompetitions}
      competitionEntries={competitionEntries}
      setCompetitionEntries={setCompetitionEntries}
      predictions={predictions}
      setPredictions={setPredictions}
      auctions={auctions}
      setAuctions={setAuctions}
      playerCredits={playerCredits}
      setPlayerCredits={setPlayerCredits}
      predictionsLocked={false}
      auctionsLocked={false}
      notifications={notifications}
      setNotifications={setNotifications}
      messages={messages}
      posts={posts}
      onLogout={handleLogout}
      onDataChange={refreshTournamentData}
    />
  )
}
