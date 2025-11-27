"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LogOut, Trophy, Menu, Copy, Check } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { PlayerManagement } from "@/components/player-management"
import { CourseManagement } from "@/components/course-management"
import { GroupManagement } from "@/components/group-management"
import { AdminLeaderboard } from "@/components/admin-leaderboard"
import { CompetitionManagement } from "@/components/competition-management"
import { AdminPredictions } from "@/components/admin-predictions"
import { AdminAuction } from "@/components/admin-auction"
import { TournamentSettings } from "@/components/tournament-settings"
import { GenerateAchievementsButton } from "@/components/admin/generate-achievements-button"
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
} from "@/app/page"

type AdminDashboardProps = {
  currentUser: User
  currentTournament: Tournament | null
  players: Player[]
  setPlayers: (players: Player[]) => void
  courses: Course[]
  setCourses: (courses: Course[]) => void // Added setCourses prop
  groups: Group[]
  setGroups: (groups: Group[]) => void
  rounds: Round[]
  setRounds: (rounds: Round[]) => void
  competitions: Competition[]
  setCompetitions: (competitions: Competition[]) => void
  competitionEntries: CompetitionEntry[]
  predictions: Prediction[]
  auctions: Auction[]
  playerCredits: PlayerCredit[]
  setPlayerCredits: (credits: PlayerCredit[]) => void
  predictionsLocked: boolean
  setPredictionsLocked: (locked: boolean) => void
  auctionsLocked: boolean
  setAuctionsLocked: (locked: boolean) => void
  tournaments: Tournament[]
  setTournaments: (tournaments: Tournament[]) => void
  onLogout: () => void
  onDataChange?: () => Promise<void> // Added onDataChange callback for refreshing data
}

export function AdminDashboard({
  currentUser,
  currentTournament,
  players,
  setPlayers,
  courses,
  setCourses, // Added setCourses
  groups,
  setGroups,
  rounds,
  setRounds,
  competitions,
  setCompetitions,
  competitionEntries,
  predictions,
  auctions,
  playerCredits,
  setPlayerCredits,
  predictionsLocked,
  setPredictionsLocked,
  auctionsLocked,
  setAuctionsLocked,
  tournaments,
  setTournaments,
  onLogout,
  onDataChange, // Added onDataChange
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("players")
  const [copied, setCopied] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Added state to control mobile menu sheet

  const copyTournamentCode = () => {
    if (currentTournament?.code) {
      navigator.clipboard.writeText(currentTournament.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleTabChange = (tab: string) => {
    // Added handler to close menu and switch tabs
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-br from-[#1a3a0f] via-[#2D5016]/95 to-[#8B7355] overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto py-8 px-4 pb-24">
          {currentTournament?.code && (
            <div className="mb-4 space-y-2">
              <div className="bg-[#FFD700]/90 px-4 py-2 rounded-lg shadow-md border border-[#FFD700] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#1a3a0f]">Tournament Code:</span>
                  <span className="text-lg font-bold text-[#1a3a0f] font-mono tracking-wider">
                    {currentTournament.code}
                  </span>
                </div>
                <Button
                  onClick={copyTournamentCode}
                  size="sm"
                  variant="ghost"
                  className="text-[#1a3a0f] hover:bg-[#1a3a0f]/10"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-[#2D5016]/80 px-4 py-2 rounded-lg border border-[#FFD700]/30">
                <p className="text-xs text-[#F5F1E8]/90">
                  <span className="font-semibold text-[#FFD700]">Before sharing:</span> Add players and set their
                  passwords in the Players tab. Players will need their password to enter the tournament.
                </p>
              </div>
            </div>
          )}

          {currentTournament && rounds.length > 0 && (
            <div className="mb-6">
              <GenerateAchievementsButton
                tournament={currentTournament}
                rounds={rounds}
                players={players}
                courses={courses}
              />
            </div>
          )}

          <div className="mb-8 bg-gradient-to-r from-[#2D5016] to-[#1a3a0f] text-primary-foreground p-6 rounded-lg shadow-2xl border-2 border-[#FFD700]/20">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-10 h-10 text-[#FFD700]" />
                <div>
                  <h1 className="text-4xl font-bold text-[#F5F1E8]">Aussie Slice</h1>
                  <p className="text-[#F5F1E8]/80">
                    {currentTournament?.name || "Tournament"} - Admin: {currentUser.name}
                  </p>
                </div>
              </div>

              <Button
                onClick={onLogout}
                variant="secondary"
                className="bg-[#FFD700] text-[#1a3a0f] hover:bg-[#FFD700]/90"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-8">
              {/* Desktop tabs */}
              <TabsList className="hidden md:grid w-full grid-cols-8 gap-2 bg-[#2D5016]/50 p-2">
                <TabsTrigger
                  value="players"
                  className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1a3a0f]"
                >
                  Players
                </TabsTrigger>
                <TabsTrigger
                  value="courses"
                  className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1a3a0f]"
                >
                  Courses
                </TabsTrigger>
                <TabsTrigger
                  value="groups"
                  className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1a3a0f]"
                >
                  Groups
                </TabsTrigger>
                <TabsTrigger
                  value="competitions"
                  className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1a3a0f]"
                >
                  Comps
                </TabsTrigger>
                <TabsTrigger
                  value="predictions"
                  className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1a3a0f]"
                >
                  Pick 3
                </TabsTrigger>
                <TabsTrigger
                  value="auction"
                  className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1a3a0f]"
                >
                  Auction
                </TabsTrigger>
                <TabsTrigger
                  value="leaderboard"
                  className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1a3a0f]"
                >
                  Board
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#1a3a0f]"
                >
                  Settings
                </TabsTrigger>
              </TabsList>

              <div className="md:hidden">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full bg-[#2D5016]/50 border-[#FFD700]/20 text-[#F5F1E8]">
                      <Menu className="w-4 h-4 mr-2" />
                      Menu
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="bg-[#2D5016] border-[#FFD700]/20">
                    <SheetHeader>
                      <SheetTitle className="text-[#FFD700]">Admin Menu</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-2 mt-6">
                      <Button
                        onClick={() => handleTabChange("players")}
                        variant={activeTab === "players" ? "default" : "ghost"}
                        className="w-full justify-start text-[#F5F1E8]"
                      >
                        Players
                      </Button>
                      <Button
                        onClick={() => handleTabChange("courses")}
                        variant={activeTab === "courses" ? "default" : "ghost"}
                        className="w-full justify-start text-[#F5F1E8]"
                      >
                        Courses
                      </Button>
                      <Button
                        onClick={() => handleTabChange("groups")}
                        variant={activeTab === "groups" ? "default" : "ghost"}
                        className="w-full justify-start text-[#F5F1E8]"
                      >
                        Groups
                      </Button>
                      <Button
                        onClick={() => handleTabChange("competitions")}
                        variant={activeTab === "competitions" ? "default" : "ghost"}
                        className="w-full justify-start text-[#F5F1E8]"
                      >
                        Competitions
                      </Button>
                      <Button
                        onClick={() => handleTabChange("predictions")}
                        variant={activeTab === "predictions" ? "default" : "ghost"}
                        className="w-full justify-start text-[#F5F1E8]"
                      >
                        Predictions
                      </Button>
                      <Button
                        onClick={() => handleTabChange("auction")}
                        variant={activeTab === "auction" ? "default" : "ghost"}
                        className="w-full justify-start text-[#F5F1E8]"
                      >
                        Auction
                      </Button>
                      <Button
                        onClick={() => handleTabChange("leaderboard")}
                        variant={activeTab === "leaderboard" ? "default" : "ghost"}
                        className="w-full justify-start text-[#F5F1E8]"
                      >
                        Leaderboard
                      </Button>
                      <Button
                        onClick={() => handleTabChange("settings")}
                        variant={activeTab === "settings" ? "default" : "ghost"}
                        className="w-full justify-start text-[#F5F1E8]"
                      >
                        Settings
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <TabsContent value="players" className="mt-6">
              <PlayerManagement
                players={players}
                setPlayers={setPlayers}
                currentTournamentId={currentTournament?.id || null}
              />
            </TabsContent>

            <TabsContent value="courses" className="mt-6">
              <CourseManagement
                currentTournamentId={currentTournament?.id || null}
                onDataChange={onDataChange} // Pass onDataChange to CourseManagement
              />
            </TabsContent>

            <TabsContent value="groups" className="mt-6">
              <GroupManagement
                players={players}
                courses={courses}
                groups={groups}
                setGroups={setGroups}
                rounds={rounds}
                currentTournamentId={currentTournament?.id || null}
                onDataChange={onDataChange} // Pass onDataChange to GroupManagement
              />
            </TabsContent>

            <TabsContent value="competitions" className="mt-6">
              <CompetitionManagement
                competitions={competitions}
                setCompetitions={setCompetitions}
                competitionEntries={competitionEntries}
                players={players}
                courses={courses}
                currentTournament={currentTournament}
              />
            </TabsContent>

            <TabsContent value="predictions" className="mt-6">
              <AdminPredictions
                players={players}
                predictions={predictions}
                rounds={rounds}
                groups={groups}
                predictionsLocked={predictionsLocked}
                setPredictionsLocked={setPredictionsLocked}
              />
            </TabsContent>

            <TabsContent value="auction" className="mt-6">
              <AdminAuction
                players={players}
                auctions={auctions}
                rounds={rounds}
                groups={groups}
                playerCredits={playerCredits}
                setPlayerCredits={setPlayerCredits}
                auctionsLocked={auctionsLocked}
                setAuctionsLocked={setAuctionsLocked}
                currentTournamentId={currentTournament?.id || null}
                onDataChange={onDataChange} // Added onDataChange prop to AdminAuction
              />
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-6">
              <AdminLeaderboard
                players={players}
                courses={courses}
                groups={groups}
                rounds={rounds}
                tournamentId={currentTournament?.id}
                tournament={currentTournament} // Added tournament prop to AdminLeaderboard
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <TournamentSettings
                currentTournament={currentTournament}
                players={players}
                setPlayers={setPlayers}
                tournaments={tournaments}
                setTournaments={setTournaments}
                rounds={rounds}
                setRounds={setRounds}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
