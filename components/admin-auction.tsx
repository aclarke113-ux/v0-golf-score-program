"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Gavel, Trophy, DollarSign, Lock, Unlock, Crown, Wallet, Plus } from "lucide-react"
import type { Player, Auction, Round, Group, PlayerCredit } from "@/app/page"
import { getCreditsByTournament, createPlayerCredit, updatePlayerCredit } from "@/lib/supabase/db"
import { subscribeToAuctions, unsubscribe } from "@/lib/supabase/realtime"

type AdminAuctionProps = {
  players: Player[]
  auctions: Auction[]
  rounds: Round[]
  groups: Group[]
  playerCredits: PlayerCredit[]
  setPlayerCredits: (credits: PlayerCredit[]) => void
  auctionsLocked: boolean
  setAuctionsLocked: (locked: boolean) => void
  currentTournamentId: string | null
  onDataChange?: () => void // Added onDataChange callback
}

export function AdminAuction({
  players,
  auctions,
  rounds,
  groups,
  playerCredits,
  setPlayerCredits,
  auctionsLocked,
  setAuctionsLocked,
  currentTournamentId,
  onDataChange, // Destructure onDataChange
}: AdminAuctionProps) {
  const [localCredits, setLocalCredits] = useState<PlayerCredit[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [creditAmount, setCreditAmount] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLocalCredits(playerCredits)
  }, [playerCredits])

  useEffect(() => {
    if (!currentTournamentId) return

    const loadCredits = async () => {
      try {
        const data = await getCreditsByTournament(currentTournamentId)
        setLocalCredits(data as PlayerCredit[])
        setPlayerCredits(data as PlayerCredit[])
      } catch (error) {
        console.error("[v0] Error loading credits:", error)
      }
    }

    loadCredits()
  }, [currentTournamentId, setPlayerCredits])

  useEffect(() => {
    if (!currentTournamentId) return

    console.log("[v0] Admin auction: Setting up real-time subscription")

    const auctionChannel = subscribeToAuctions(currentTournamentId, () => {
      console.log("[v0] Admin auction: Auctions updated, refreshing")
      setRefreshKey((prev) => prev + 1)
    })

    return () => {
      unsubscribe(auctionChannel)
    }
  }, [currentTournamentId])

  const tournamentPlayers = useMemo(() => {
    return players.filter((p) => p.tournamentId === currentTournamentId)
  }, [players, currentTournamentId])

  const eligiblePlayers = useMemo(() => {
    return tournamentPlayers.filter((p) => !p.isSpectator)
  }, [tournamentPlayers])

  const tournamentCredits = useMemo(() => {
    return localCredits.filter((pc) => pc.tournamentId === currentTournamentId)
  }, [localCredits, currentTournamentId])

  const totalPot = useMemo(() => {
    return auctions.reduce((sum, auction) => sum + auction.bidAmount, 0)
  }, [auctions])

  const highestBids = useMemo(() => {
    const bids: Record<string, { amount: number; buyerId: string; buyerName: string }> = {}
    auctions.forEach((auction) => {
      if (!bids[auction.golferId] || auction.bidAmount > bids[auction.golferId].amount) {
        const buyer = tournamentPlayers.find((p) => p.id === auction.buyerId)
        bids[auction.golferId] = {
          amount: auction.bidAmount,
          buyerId: auction.buyerId,
          buyerName: buyer?.name || "Unknown",
        }
      }
    })
    return bids
  }, [auctions, tournamentPlayers, refreshKey]) // Added refreshKey dependency

  const isCompetitionSealed = useMemo(() => {
    const day2Groups = groups.filter((g) => g.day === 2)
    return day2Groups.some((group) => {
      const groupRounds = rounds.filter((r) => r.groupId === group.id)
      return groupRounds.some((round) => {
        const hole18 = round.holes.find((h) => h.holeNumber === 18)
        return hole18 && hole18.strokes > 0
      })
    })
  }, [groups, rounds])

  const winner = useMemo(() => {
    if (!isCompetitionSealed) return null

    const playerTotals = tournamentPlayers.map((player) => {
      const playerRounds = rounds.filter((r) => r.playerId === player.id && r.completed)
      const totalStrokes = playerRounds.reduce((sum, round) => sum + round.totalGross, 0)
      const roundsPlayed = playerRounds.length

      return {
        player,
        totalStrokes,
        roundsPlayed,
      }
    })

    const topPlayer = playerTotals
      .filter((pt) => pt.roundsPlayed > 0)
      .sort((a, b) => a.totalStrokes - b.totalStrokes)[0]

    if (!topPlayer) return null

    const winningBid = highestBids[topPlayer.player.id]
    if (!winningBid) return null

    const buyer = tournamentPlayers.find((p) => p.id === winningBid.buyerId)

    return {
      golfer: topPlayer.player,
      buyer,
      bidAmount: winningBid.amount,
      totalStrokes: topPlayer.totalStrokes,
      winnings: totalPot,
    }
  }, [isCompetitionSealed, tournamentPlayers, rounds, highestBids, totalPot])

  const allBidsHistory = useMemo(() => {
    return [...auctions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((auction) => {
        const buyer = tournamentPlayers.find((p) => p.id === auction.buyerId)
        const golfer = tournamentPlayers.find((p) => p.id === auction.golferId)
        return {
          ...auction,
          buyerName: buyer?.name || "Unknown",
          golferName: golfer?.name || "Unknown",
        }
      })
  }, [auctions, tournamentPlayers, refreshKey]) // Added refreshKey dependency

  const totalCredits = useMemo(() => {
    return tournamentCredits.reduce((sum, pc) => sum + (pc.credits || 0), 0)
  }, [tournamentCredits])

  const totalBids = useMemo(() => {
    const playerBids: Record<string, number> = {}
    auctions.forEach((auction) => {
      playerBids[auction.buyerId] = auction.bidAmount
    })
    return Object.values(playerBids).reduce((sum, bid) => sum + (bid || 0), 0)
  }, [auctions])

  const unusedCredits = totalCredits - totalBids

  const handleAddCredit = async () => {
    console.log("[v0] handleAddCredit called:", { selectedPlayerId, creditAmount })

    if (!selectedPlayerId || !creditAmount) {
      alert("Please select a player and enter credit amount")
      return
    }

    const amount = creditAmount === "" ? 0 : Number.parseFloat(creditAmount)
    console.log("[v0] Parsed amount:", amount)

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setLoading(true)
    try {
      const existingCredit = tournamentCredits.find((pc) => pc.playerId === selectedPlayerId)
      console.log("[v0] Existing credit:", existingCredit)

      if (existingCredit) {
        console.log("[v0] Updating existing credit")
        await updatePlayerCredit(existingCredit.id!, {
          credits: existingCredit.credits + amount,
        })
      } else {
        console.log("[v0] Creating new credit")
        await createPlayerCredit({
          playerId: selectedPlayerId,
          credits: amount,
          tournamentId: currentTournamentId!,
        })
      }

      if (onDataChange) {
        await onDataChange()
      } else {
        // Fallback: reload credits locally if onDataChange not provided
        console.log("[v0] Reloading credits from database")
        const updatedCredits = await getCreditsByTournament(currentTournamentId!)
        console.log("[v0] Loaded credits:", updatedCredits.length)
        setLocalCredits(updatedCredits as PlayerCredit[])
        setPlayerCredits(updatedCredits as PlayerCredit[])
      }

      setCreditAmount("")
      setSelectedPlayerId("")
    } catch (error) {
      console.error("[v0] Error adding credit:", error)
      alert("Failed to add credit. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            Credit Management
          </CardTitle>
          <CardDescription>Add credit to player accounts after they transfer funds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border">
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-2xl font-bold text-blue-600">{totalCredits.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border">
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold text-green-600">{totalBids.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border">
              <p className="text-sm text-muted-foreground">To Refund</p>
              <p className="text-2xl font-bold text-orange-600">{unusedCredits.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              disabled={loading}
            >
              <option value="">Select player...</option>
              {tournamentPlayers.map((player) => {
                const credit = tournamentCredits.find((pc) => pc.playerId === player.id)
                const bid = auctions.find((a) => a.buyerId === player.id)
                const available = (credit?.credits || 0) - (bid?.bidAmount || 0)
                return (
                  <option key={player.id} value={player.id}>
                    {player.name} - Balance: {available.toFixed(2)}
                  </option>
                )
              })}
            </select>
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              placeholder="Amount"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="w-32 h-12 text-2xl font-bold px-4"
              disabled={loading}
            />
            <Button onClick={handleAddCredit} disabled={loading} className="whitespace-nowrap h-12 px-6">
              <Plus className="w-4 h-4 mr-2" />
              {loading ? "Adding..." : "Add"}
            </Button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-sm font-semibold">Player Balances:</p>
            {tournamentPlayers.map((player) => {
              const credit = tournamentCredits.find((pc) => pc.playerId === player.id)
              const bid = auctions.find((a) => a.buyerId === player.id)
              const totalCredit = credit?.credits || 0
              const bidAmount = bid?.bidAmount || 0
              const available = totalCredit - bidAmount

              return (
                <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded border text-sm">
                  <span className="font-medium">{player.name}</span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted-foreground">Credit: {totalCredit.toFixed(2)}</span>
                    <span className="text-muted-foreground">Entry: {bidAmount.toFixed(2)}</span>
                    <span className="font-semibold">Available: {available.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Auction Controls</CardTitle>
          <CardDescription>Closes automatically at midnight Nov 28, 2025</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Status: {auctionsLocked ? "Closed" : "Open"}</p>
            <p className="text-sm text-muted-foreground">
              {auctionsLocked ? "No new entries can be placed" : "Players can still place entries"}
            </p>
          </div>
          <Button
            onClick={() => setAuctionsLocked(!auctionsLocked)}
            variant={auctionsLocked ? "destructive" : "default"}
            size="lg"
          >
            {auctionsLocked ? (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Reopen Auction
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Close Auction
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Prize Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-5xl font-bold text-green-600">{totalPot.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-2">Total from {auctions.length} entries</p>
          </div>
        </CardContent>
      </Card>

      {isCompetitionSealed && winner && (
        <Card className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-600" />
              <CardTitle>Calcutta Winner!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <Trophy className="w-16 h-16 mx-auto text-yellow-600" />
              <p className="text-3xl font-bold">{winner.buyer?.name}</p>
              <p className="text-lg text-muted-foreground">Owned {winner.golfer.name}</p>
              <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-lg border-2 border-green-500">
                <p className="text-5xl font-bold text-green-600">{winner.winnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-2">Total Winnings</p>
              </div>
              <div className="text-sm text-muted-foreground space-y-1 mt-4">
                <p>Winning Entry: {winner.bidAmount.toFixed(2)}</p>
                <p>Final Score: {winner.totalStrokes} strokes</p>
                <p className="text-lg font-semibold text-green-600">
                  Profit: {(winner.winnings - winner.bidAmount).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-6 h-6" />
            Current Highest Entries
          </CardTitle>
          <CardDescription>Final entries for each golfer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {eligiblePlayers.map((golfer) => {
              const bid = highestBids[golfer.id]
              const isWinner = winner && golfer.id === winner.golfer.id
              return (
                <div
                  key={golfer.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    isWinner ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500" : "bg-muted border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isWinner && <Trophy className="w-5 h-5 text-yellow-600" />}
                    <div>
                      <p className="font-semibold">{golfer.name}</p>
                      <p className="text-xs text-muted-foreground">HC: {golfer.handicap}</p>
                    </div>
                  </div>
                  {bid ? (
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">{bid.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{bid.buyerName}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No entries</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Entries History</CardTitle>
          <CardDescription>Complete entry history (most recent first)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allBidsHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries placed yet</p>
            ) : (
              allBidsHistory.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                  <div>
                    <p className="font-semibold">{bid.buyerName}</p>
                    <p className="text-sm text-muted-foreground">entered for {bid.golferName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(bid.timestamp).toLocaleString()}</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">{bid.bidAmount.toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
