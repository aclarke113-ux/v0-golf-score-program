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
  createTournament,
  createPlayer,
  getCreditsByTournament,
  getRoundsByTournament, // Added import for getRoundsByTournament
} from "@/lib/supabase/db"
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
    const loadSession = () => {
      try {
        const savedUser = localStorage.getItem("currentUser")
        const savedTournament = localStorage.getItem("currentTournament")

        if (savedUser && savedTournament) {
          setCurrentUser(JSON.parse(savedUser))
          setCurrentTournament(JSON.parse(savedTournament))
        }
      } catch (error) {
        console.error("Error loading session:", error)
        localStorage.removeItem("currentUser")
        localStorage.removeItem("currentTournament")
      }
    }

    loadSession()
  }, [])

  // Load tournament data when tournament changes
  useEffect(() => {
    const loadTournamentData = async () => {
      if (!currentTournament) return

      if (players.length === 0 && courses.length === 0 && groups.length === 0) {
        await refreshTournamentData()
      }
    }

    loadTournamentData()
  }, [currentTournament])

  useEffect(() => {
    if (!currentTournament) return

    const refreshRounds = async () => {
      try {
        const roundsData = await getRoundsByTournament(currentTournament.id)
        setRounds(roundsData as Round[])
      } catch (error) {
        console.error("Error refreshing rounds:", error)
      }
    }

    // Refresh immediately on mount
    refreshRounds()

    // Then refresh every 15 seconds
    const interval = setInterval(refreshRounds, 15000)

    return () => clearInterval(interval)
  }, [currentTournament])

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

      const newTournament = await createTournament({
        name,
        code,
        password,
        adminPassword,
        numberOfDays: 2,
        hasPlayAroundDay: false,
        scoringType: "handicap",
        hasCalcutta: true,
        hasPick3: true,
        allowSpectatorChat: true,
        allowSpectatorFeed: true,
        allowSpectatorBetting: false,
      })

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
    if (!currentTournament) return

    try {
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
        getRoundsByTournament(currentTournament.id), // Added loading rounds for tournament
      ])

      setPlayers(playersData as Player[])
      setCourses(coursesData as Course[])
      setGroups(groupsData as Group[])
      setCompetitions(competitionsData as Competition[])
      setPredictions(predictionsData as Prediction[])
      setAuctions(auctionsData as Auction[])
      setPlayerCredits(creditsData as PlayerCredit[])
      setRounds(roundsData as Round[]) // Added set rounds state with loaded data
    } catch (error) {
      console.error("Error refreshing tournament data:", error)
    }
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
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
