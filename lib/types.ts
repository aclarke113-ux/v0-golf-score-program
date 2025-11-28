export interface User {
  id: string
  name: string
  role: "admin" | "player"
  password?: string
  handicap?: number // Added handicap to User type
  isAdmin?: boolean // Added isAdmin flag to track admin access
  tournamentId?: string // Added tournamentId so user knows which tournament they're in
}

export interface Player {
  id: string
  name: string
  handicap: number
  password?: string
  tournamentId: string // Added tournamentId to associate players with specific tournaments
  profilePicture?: string // URL to profile picture
  championshipWins?: Array<{ year: number; notes?: string }> // Championship history
  isCurrentChampion?: boolean // Flag for current champion
  isSpectator?: boolean // Added spectator flag for view-only access
  isAdmin?: boolean // Flag for players who have admin access
  teePreference?: string // Added to match database schema
}

export interface Hole {
  holeNumber: number
  par: number
  strokeIndex?: number
}

export interface Course {
  id: string
  name: string
  holes: Hole[]
  tournamentId: string // Added tournamentId to associate courses with specific tournaments
}

export interface Group {
  id: string
  name: string
  playerIds: string[]
  courseId: string
  date: string
  day: number
  teeTime?: string
  startingHole?: number
  tournamentId: string // Added to isolate groups per tournament
}

export interface HoleScore {
  holeNumber: number
  strokes: number
  points: number
  netScore?: number // Added net score for Net Score scoring format
  penalty?: number // Number of penalty strokes
}

export interface Round {
  id: string
  groupId: string
  playerId: string
  day?: number // Added to match database schema
  holes: HoleScore[]
  totalGross: number
  totalPoints: number
  completed: boolean
  submitted: boolean
  handicapUsed: number
  referenceScores?: { [holeNumber: number]: number } // Player's own tracked scores
  scoreDiscrepancyFlagged?: boolean // Flag if there's a mismatch between official and reference scores
  discrepancyNotes?: string // Notes about the discrepancy
}

export interface Competition {
  id: string
  type: "closest-to-pin" | "longest-drive" | "straightest-drive" // Added straightest-drive competition type
  holeNumber: number
  enabled: boolean
  day?: number
  courseId?: string // Added to match database schema
  tournamentId: string // Added to isolate competitions per tournament
}

export interface CompetitionEntry {
  id: string
  competitionId: string
  playerId: string
  groupId: string // Added to match database schema
  distance: number
  timestamp: string
}

export interface Prediction {
  id: string
  playerId: string
  predictedWinnerId: string
  predictedTop3Ids: string[]
  timestamp: string
  tournamentId: string // Added to isolate predictions per tournament
}

export interface Auction {
  id: string
  playerId: string
  bidderId: string
  amount: number
  timestamp: string
  tournamentId: string // Added to isolate auctions per tournament
}

export interface PlayerCredit {
  playerId: string
  credits: number
  tournamentId: string // Added to isolate credits per tournament
}

export interface Message {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: string
  tournamentId: string // Added to isolate chat per tournament
}

export interface Post {
  id: string
  userId: string | null // Allow null for system posts like achievements
  userName: string
  mediaUrl: string
  mediaType: "image" | "video"
  caption: string
  likedBy: string[] // Updated to match database schema - likes stored as array of player IDs
  comments: Array<{
    id: string
    userName: string
    content: string
    timestamp: string
  }>
  timestamp: string
  tournamentId: string
}

export interface Championship {
  id: string
  year: number
  winnerId: string
  winnerName: string
  winnerPhoto?: string
  notes?: string
  tournamentId: string // Added to isolate championships per tournament
}

export interface Tournament {
  id: string
  name: string
  code: string // Added unique tournament code for easy access
  password: string
  adminPassword: string // Updated Tournament type to match database schema
  createdAt: string
  updatedAt: string
  numberOfDays: number
  hasPlayAroundDay: boolean
  scoringType: "strokes" | "handicap" | "net-score" // Added net-score as a scoring type option
  hasCalcutta: boolean
  hasPick3: boolean
  calcuttaCloseTime?: string
  allowSpectatorChat?: boolean // Added spectator permission settings
  allowSpectatorFeed?: boolean
  allowSpectatorBetting?: boolean
  infiniteBetting?: boolean // Added infinite betting toggle for unlimited credits
}

export interface Notification {
  id: string
  type: "eagle" | "hole-in-one" | "birdie" | "chat" | "post" | "auction" | "group" | "tee-time"
  title: string
  message: string
  timestamp: string
  read: boolean
  playerId?: string
  tournamentId: string // Added to isolate notifications per tournament
}

export interface AppData {
  tournaments: Tournament[]
  currentTournamentId: string | null
  users: User[]
  players: Player[]
  courses: Course[]
  groups: Group[]
  rounds: Round[]
  competitions: Competition[]
  competitionEntries: CompetitionEntry[]
  predictions: Prediction[]
  auctions: Auction[]
  playerCredits: PlayerCredit[]
  messages: Message[]
  posts: Post[]
  championships: Championship[]
  predictionsLocked: boolean
  auctionsLocked: boolean
  notifications: Notification[] // Added notifications array
}
