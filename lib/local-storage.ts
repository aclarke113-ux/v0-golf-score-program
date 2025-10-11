import type { AppData } from "./types"

const STORAGE_KEY = "aussie_golf_data"

function getDefaultData(): AppData {
  return {
    tournaments: [],
    currentTournamentId: null,
    users: [
      { id: "admin1", name: "Admin", role: "admin", password: "admin" },
      { id: "player1", name: "Austin Clarke", role: "player", password: "aussie" },
    ],
    players: [],
    courses: [],
    groups: [],
    rounds: [],
    competitions: [],
    competitionEntries: [],
    predictions: [],
    auctions: [],
    playerCredits: [],
    messages: [],
    posts: [],
    championships: [],
    notifications: [],
    predictionsLocked: false,
    auctionsLocked: false,
  }
}

export function loadData(): AppData {
  if (typeof window === "undefined") return getDefaultData()
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return getDefaultData()

  const data = JSON.parse(stored)
  if (!data.tournaments) {
    data.tournaments = []
    data.currentTournamentId = null
  }
  if (!data.notifications) {
    data.notifications = []
  }
  return data
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearData(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}
