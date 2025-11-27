"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, PenLine, BarChart3, MessageCircle, ImageIcon, Settings, Target, Shield } from "lucide-react"
import { PlayerScoreEntry } from "@/components/player-score-entry"
import { PlayerLeaderboard } from "@/components/player-leaderboard"
import { CompetitionLeaderboard } from "@/components/competition-leaderboard"
import { PlayerPredictions } from "@/components/player-predictions"
import { CalcuttaAuction } from "@/components/calcutta-auction"
import { CompetitionChat } from "@/components/competition-chat"
import { SocialFeed } from "@/components/social-feed"
import { PlayerSettings } from "@/components/player-settings"
import { NotificationBanner, type BannerNotification } from "@/components/notification-banner"
import { NotificationSetupBanner } from "@/components/notification-setup-banner"
import { AdminDashboard } from "@/components/admin-dashboard"
import Image from "next/image"
import type {
  Player,
  Course,
  Group,
  Round,
  User,
  Competition,
  CompetitionEntry,
  Prediction,
  Auction,
  PlayerCredit,
  Tournament,
  Notification,
  Message,
  Post,
} from "@/app/page"

type PlayerDashboardProps = {
  currentUser: User
  currentTournament: Tournament | null
  players: Player[]
  setPlayers: (players: Player[]) => void
  courses: Course[]
  setCourses: (courses: Course[]) => void
  groups: Group[]
  setGroups: (groups: Group[]) => void
  rounds: Round[]
  setRounds: (rounds: Round[]) => void
  competitions: Competition[]
  setCompetitions: (competitions: Competition[]) => void
  competitionEntries: CompetitionEntry[]
  setCompetitionEntries: (entries: CompetitionEntry[]) => void
  predictions: Prediction[]
  setPredictions: (predictions: Prediction[]) => void
  auctions: Auction[]
  setAuctions: (auctions: Auction[]) => void
  playerCredits: PlayerCredit[]
  setPlayerCredits: (credits: PlayerCredit[]) => void
  predictionsLocked: boolean
  auctionsLocked: boolean
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  messages: Message[]
  posts: Post[]
  onLogout: () => void
  onDataChange?: () => Promise<void> // Added onDataChange callback
}

export function PlayerDashboard({
  currentUser,
  currentTournament,
  players,
  setPlayers,
  courses,
  setCourses,
  groups,
  setGroups,
  rounds,
  setRounds,
  competitions,
  setCompetitions,
  competitionEntries,
  setCompetitionEntries,
  predictions,
  setPredictions,
  auctions,
  setAuctions,
  playerCredits,
  setPlayerCredits,
  predictionsLocked,
  auctionsLocked,
  notifications,
  setNotifications,
  messages,
  posts,
  onLogout,
  onDataChange, // Added onDataChange
}: PlayerDashboardProps) {
  const [activeTab, setActiveTab] = useState("score")
  const [bannerNotifications, setBannerNotifications] = useState<BannerNotification[]>([])
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null)
  const currentPlayer = players.find((p) => p.id === currentUser.id)
  const hasAdminAccess = currentUser.isAdmin || currentPlayer?.isAdmin || false
  const [isAdminMode, setIsAdminMode] = useState(hasAdminAccess)

  const unreadMessageCount = useMemo(() => {
    if (!lastSeenMessageId) return messages.length
    const lastSeenIndex = messages.findIndex((m) => m.id === lastSeenMessageId)
    if (lastSeenIndex === -1) return messages.length
    return messages.length - lastSeenIndex - 1
  }, [messages, lastSeenMessageId])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "chat" && messages.length > 0) {
      setLastSeenMessageId(messages[messages.length - 1].id)
    }
  }

  const handleDismissNotification = (id: string) => {
    setBannerNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (isAdminMode && hasAdminAccess) {
    return (
      <div className="h-dvh flex flex-col bg-gradient-to-br from-amber-900/30 via-amber-800/20 to-amber-900/30 overflow-hidden">
        <div className="flex-none px-4 pt-4 pb-2">
          <div className="flex items-center justify-between bg-amber-700 text-white p-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-200" />
              <div>
                <h1 className="text-lg font-bold">Admin Mode</h1>
                <p className="text-xs text-amber-100">{currentTournament?.name || "Tournament"}</p>
              </div>
            </div>
            <Button onClick={() => setIsAdminMode(false)} variant="secondary" size="sm">
              Exit Admin
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <AdminDashboard
            currentUser={{ ...currentUser, role: "admin" }}
            currentTournament={currentTournament}
            players={players}
            setPlayers={setPlayers}
            courses={courses}
            setCourses={setCourses} // Pass setCourses to AdminDashboard
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
            predictionsLocked={predictionsLocked}
            setPredictionsLocked={() => {}}
            auctionsLocked={auctionsLocked}
            setAuctionsLocked={() => {}}
            tournaments={currentTournament ? [currentTournament] : []}
            setTournaments={() => {}}
            onLogout={onLogout}
            onDataChange={onDataChange} // Pass onDataChange to AdminDashboard
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-br from-[#1a3a2e] via-[#2d4a3e] to-[#3a5a4e] overflow-hidden">
      <NotificationSetupBanner />
      <NotificationBanner notifications={bannerNotifications} onDismiss={handleDismissNotification} />

      <div className="flex-none px-4 pt-4 pb-2">
        <div className="flex items-center justify-between bg-[#1a3a2e] text-[#d4af37] p-3 rounded-lg shadow-lg border-2 border-[#d4af37]/30">
          <div className="flex items-center gap-3">
            <Image src="/aussie-slice-logo.png" alt="Aussie Slice" width={40} height={40} />
            <div>
              <h1 className="text-lg font-bold text-[#d4af37]">Aussie Slice</h1>
              <p className="text-xs text-[#d4af37]/80">
                {currentTournament?.name || "Tournament"} - {currentUser.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasAdminAccess && (
              <Button
                onClick={() => setIsAdminMode(true)}
                variant="secondary"
                size="default"
                className="bg-[#d4af37] text-[#1a3a2e] hover:bg-[#d4af37]/90 font-bold shadow-lg"
              >
                <Shield className="w-5 h-5 mr-2" />
                ADMIN
              </Button>
            )}
            <Button
              onClick={onLogout}
              variant="secondary"
              size="sm"
              className="bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30 border border-[#d4af37]/50"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden px-4">
            <TabsContent value="score" className="h-full mt-0 overflow-y-auto">
              <PlayerScoreEntry
                currentUser={currentUser}
                players={players}
                courses={courses}
                groups={groups}
                rounds={rounds}
                setRounds={setRounds}
                competitions={competitions}
                competitionEntries={competitionEntries}
                setCompetitionEntries={setCompetitionEntries}
                notifications={notifications}
                setNotifications={setNotifications}
                onDataChange={onDataChange}
              />
            </TabsContent>

            <TabsContent value="leaderboard" className="h-full mt-0 overflow-y-auto">
              <PlayerLeaderboard
                players={players}
                courses={courses}
                groups={groups}
                rounds={rounds}
                tournament={currentTournament}
              />
            </TabsContent>

            <TabsContent value="chat" className="h-full mt-0 overflow-y-auto">
              <CompetitionChat
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                tournamentId={currentUser.tournamentId}
              />
            </TabsContent>

            <TabsContent value="feed" className="h-full mt-0 overflow-y-auto">
              <SocialFeed
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                tournamentId={currentUser.tournamentId}
              />
            </TabsContent>

            <TabsContent value="competitions" className="h-full mt-0 overflow-y-auto">
              <CompetitionLeaderboard
                competitions={competitions}
                competitionEntries={competitionEntries}
                players={players}
                courses={courses}
                tournament={currentTournament}
              />
            </TabsContent>

            {currentTournament?.pick3Enabled !== false && (
              <TabsContent value="predictions" className="h-full mt-0 overflow-y-auto">
                <PlayerPredictions
                  currentUser={currentUser}
                  players={players}
                  predictions={predictions}
                  setPredictions={setPredictions}
                  rounds={rounds}
                  groups={groups}
                  predictionsLocked={predictionsLocked}
                />
              </TabsContent>
            )}

            {currentTournament?.calcuttaEnabled !== false && (
              <TabsContent value="auction" className="h-full mt-0 overflow-y-auto">
                <CalcuttaAuction
                  currentUser={currentUser}
                  currentTournament={currentTournament}
                  players={players}
                  auctions={auctions}
                  setAuctions={setAuctions}
                  rounds={rounds}
                  groups={groups}
                  playerCredits={playerCredits}
                  auctionsLocked={auctionsLocked}
                />
              </TabsContent>
            )}

            <TabsContent value="settings" className="h-full mt-0 overflow-y-auto">
              <PlayerSettings
                currentUser={currentUser}
                players={players}
                setPlayers={setPlayers}
                currentTournament={currentTournament}
                onNavigateToAuction={() => setActiveTab("auction")}
                onNavigateToPredictions={() => setActiveTab("predictions")}
              />
            </TabsContent>
          </div>

          <TabsList className="flex-none grid w-full grid-cols-6 h-16 rounded-none border-t bg-background/95 backdrop-blur">
            <TabsTrigger value="score" className="flex flex-col items-center gap-1 data-[state=active]:bg-primary/10">
              <PenLine className="w-4 h-4" />
              <span className="text-[10px]">Score</span>
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex flex-col items-center gap-1 data-[state=active]:bg-primary/10"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-[10px]">Board</span>
            </TabsTrigger>
            <TabsTrigger
              value="competitions"
              className="flex flex-col items-center gap-1 data-[state=active]:bg-primary/10"
            >
              <Target className="w-4 h-4" />
              <span className="text-[10px]">Comps</span>
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="flex flex-col items-center gap-1 data-[state=active]:bg-primary/10 relative"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-[10px]">Chat</span>
              {unreadMessageCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex flex-col items-center gap-1 data-[state=active]:bg-primary/10">
              <ImageIcon className="w-4 h-4" />
              <span className="text-[10px]">Feed</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex flex-col items-center gap-1 data-[state=active]:bg-primary/10"
            >
              <Settings className="w-4 h-4" />
              <span className="text-[10px]">More</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
