"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, Gavel, Trophy, TrendingUp, Lock, Crown, Wallet, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Player, Auction, User, Round, Group, PlayerCredit, Tournament } from "@/app/page"
import { subscribeToAuctions, unsubscribe } from "@/lib/supabase/realtime"

type CalcuttaAuctionProps = {
  currentUser: User
  players: Player[]
  auctions: Auction[]
  setAuctions: (auctions: Auction[]) => void
  rounds: Round[]
  groups: Group[]
  playerCredits: PlayerCredit[]
  auctionsLocked: boolean
  currentTournament: Tournament | null
}

export function CalcuttaAuction({
  currentUser,
  players,
  auctions,
  setAuctions,
  rounds,
  groups,
  playerCredits,
  auctionsLocked,
  currentTournament,
}: CalcuttaAuctionProps) {
  const [selectedGolferId, setSelectedGolferId] = useState<string>("")
  const [bidAmount, setBidAmount] = useState<string>("")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!currentTournament?.id) return

    console.log("[v0] Calcutta auction: Setting up real-time subscription")

    const auctionChannel = subscribeToAuctions(currentTournament.id, () => {
      console.log("[v0] Calcutta auction: Auctions updated, refreshing")
      setRefreshKey((prev) => prev + 1)
    })

    return () => {
      unsubscribe(auctionChannel)
    }
  }, [currentTournament?.id])

  const userCredit = useMemo(() => {
    const credit = playerCredits.find((pc) => pc.playerId === currentUser.id)
    return credit?.credits || 0
  }, [playerCredits, currentUser.id])

  const userTotalBids = useMemo(() => {
    const userAuction = auctions.find((a) => a.buyerId === currentUser.id)
    return userAuction?.bidAmount || 0
  }, [auctions, currentUser.id, refreshKey])

  const availableCredit = userCredit - userTotalBids

  const userOwnedGolfer = useMemo(() => {
    const userAuction = auctions.find((a) => a.buyerId === currentUser.id)
    if (!userAuction) return null
    return players.find((p) => p.id === userAuction.golferId)
  }, [auctions, currentUser.id, players])

  const isAuctionClosed = useMemo(() => {
    if (auctionsLocked) return true

    if (currentTournament?.calcuttaCloseDate && currentTournament?.calcuttaCloseTime) {
      const closeDateTime = new Date(`${currentTournament.calcuttaCloseDate}T${currentTournament.calcuttaCloseTime}`)
      return new Date() > closeDateTime
    }

    return false
  }, [auctionsLocked, currentTournament])

  const closeDateTime = useMemo(() => {
    if (currentTournament?.calcuttaCloseDate && currentTournament?.calcuttaCloseTime) {
      const date = new Date(`${currentTournament.calcuttaCloseDate}T${currentTournament.calcuttaCloseTime}`)
      return date.toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Australia/Sydney",
      })
    }
    return null
  }, [currentTournament])

  const totalPot = useMemo(() => {
    return auctions.reduce((sum, auction) => sum + auction.bidAmount, 0)
  }, [auctions])

  const highestBids = useMemo(() => {
    const bids: Record<string, { amount: number; buyerId: string; buyerName: string }> = {}
    auctions.forEach((auction) => {
      if (!bids[auction.golferId] || auction.bidAmount > bids[auction.golferId].amount) {
        const buyer = players.find((p) => p.id === auction.buyerId)
        bids[auction.golferId] = {
          amount: auction.bidAmount,
          buyerId: auction.buyerId,
          buyerName: buyer?.name || "Unknown",
        }
      }
    })
    return bids
  }, [auctions, players, refreshKey])

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

    const playerTotals = players.map((player) => {
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

    const buyer = players.find((p) => p.id === winningBid.buyerId)

    return {
      golfer: topPlayer.player,
      buyer,
      bidAmount: winningBid.amount,
      totalStrokes: topPlayer.totalStrokes,
      winnings: totalPot,
    }
  }, [isCompetitionSealed, players, rounds, highestBids, totalPot])

  const handlePlaceBid = () => {
    if (userOwnedGolfer && userOwnedGolfer.id !== selectedGolferId) {
      alert(`You already own ${userOwnedGolfer.name}. You can only own one golfer.`)
      return
    }

    if (!selectedGolferId || !bidAmount) {
      alert("Please select a golfer and enter an entry amount")
      return
    }

    const amount = Number.parseFloat(bidAmount)
    if (isNaN(amount) || amount < 5) {
      alert("Minimum entry is 5 credits")
      return
    }

    if (amount % 5 !== 0) {
      alert("Entries must be in 5 credit increments (e.g., 5, 10, 15, 20...)")
      return
    }

    const currentHighest = highestBids[selectedGolferId]?.amount || 0
    if (amount <= currentHighest) {
      alert(`Entry must be higher than current entry of ${currentHighest}`)
      return
    }

    if (amount > availableCredit) {
      alert(`Insufficient credit. You have ${availableCredit.toFixed(2)} credits available.`)
      return
    }

    const updatedAuctions = auctions.filter((a) => a.buyerId !== currentUser.id)

    const newAuction: Auction = {
      id: `auction-${Date.now()}`,
      buyerId: currentUser.id,
      golferId: selectedGolferId,
      bidAmount: amount,
      timestamp: new Date().toISOString(),
    }

    setAuctions([...updatedAuctions, newAuction])
    setBidAmount("")
    setSelectedGolferId("")
  }

  const eligiblePlayers = useMemo(() => {
    return players.filter((p) => !p.isSpectator)
  }, [players])

  if (isAuctionClosed) {
    return (
      <div className="h-full overflow-y-auto pb-4 space-y-4">
        <Card className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-6 h-6 text-orange-600" />
              <CardTitle>Auction Closed</CardTitle>
            </div>
            <CardDescription>
              {closeDateTime ? `Closed: ${closeDateTime}` : "Bidding has ended. Good luck!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold text-green-600">{totalPot.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Prize Pool</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Auction Board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eligiblePlayers.map((golfer) => {
                const bid = highestBids[golfer.id]
                return (
                  <div key={golfer.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                    <div>
                      <p className="font-semibold">{golfer.name}</p>
                      <p className="text-xs text-muted-foreground">HC: {golfer.handicap}</p>
                    </div>
                    {bid ? (
                      <div className="text-right">
                        <p className="font-bold text-green-600">{bid.amount.toFixed(2)}</p>
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
      </div>
    )
  }

  if (isCompetitionSealed && winner) {
    return (
      <div className="h-full overflow-y-auto pb-4 space-y-4">
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
              <p className="text-2xl font-bold">{winner.buyer?.name}</p>
              <p className="text-sm text-muted-foreground">Owned {winner.golfer.name}</p>
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg border-2 border-green-500">
                <p className="text-4xl font-bold text-green-600">{winner.winnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Winnings</p>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Winning Entry: {winner.bidAmount.toFixed(2)}</p>
                <p>Final Score: {winner.totalStrokes} strokes</p>
                <p className="font-semibold text-green-600">
                  Profit: {(winner.winnings - winner.bidAmount).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Auction Board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eligiblePlayers.map((golfer) => {
                const bid = highestBids[golfer.id]
                const isWinner = golfer.id === winner.golfer.id
                return (
                  <div
                    key={golfer.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isWinner ? "bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500" : "bg-muted"
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
                        <p className="font-bold text-green-600">{bid.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{isWinner ? "Your entry" : bid.buyerName}</p>
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
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto pb-4 space-y-4">
      <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Your Credit Balance</p>
                <p className="text-3xl font-bold text-blue-600">{availableCredit.toFixed(2)}</p>
              </div>
            </div>
            {userOwnedGolfer && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Entry</p>
                <p className="text-xl font-semibold">{userTotalBids.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{userOwnedGolfer.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {currentTournament?.auctionNotes && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm whitespace-pre-wrap">{currentTournament.auctionNotes}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-orange-500" />
            Calcutta Auction
          </CardTitle>
          <CardDescription>{closeDateTime ? `Closes: ${closeDateTime}` : "Place your entries now"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Prize Pool</p>
            <p className="text-3xl font-bold text-green-600">{totalPot.toFixed(2)}</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              How It Works
            </h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• You can only own ONE golfer</li>
              <li>• Minimum entry: 5 credits, increments of 5</li>
              <li>• Highest entry owns that golfer</li>
              <li>• All entries go into the prize pool</li>
              <li>• Owner of the winning golfer takes the entire pot</li>
              <li>• You can upgrade your entry on your golfer</li>
              <li>• Unused credit refunded after competition</li>
            </ul>
          </div>

          {availableCredit < 5 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need at least 5 credits to place an entry. Contact admin to add credit.
              </AlertDescription>
            </Alert>
          )}

          {userOwnedGolfer && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You currently own <strong>{userOwnedGolfer.name}</strong>. You can only upgrade your entry on this
                golfer.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Golfer</label>
              <Select value={selectedGolferId} onValueChange={setSelectedGolferId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a golfer" />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePlayers.map((player) => {
                    const currentBid = highestBids[player.id]
                    const isDisabled = userOwnedGolfer && userOwnedGolfer.id !== player.id
                    return (
                      <SelectItem key={player.id} value={player.id} disabled={isDisabled}>
                        {player.name} (HC: {player.handicap}){currentBid && ` - Current: ${currentBid.amount}`}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {selectedGolferId && highestBids[selectedGolferId] && (
                <p className="text-sm text-muted-foreground">
                  Current entry: {highestBids[selectedGolferId].amount.toFixed(2)} by{" "}
                  {highestBids[selectedGolferId].buyerName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Entry Amount (min 5, increments of 5)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="5, 10, 15, 20..."
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="pl-9"
                  step="5"
                  min="5"
                  max={availableCredit}
                />
              </div>
              <p className="text-xs text-muted-foreground">Available credit: {availableCredit.toFixed(2)} credits</p>
            </div>
          </div>

          <Button onClick={handlePlaceBid} className="w-full" size="lg" disabled={availableCredit < 5}>
            <Gavel className="w-4 h-4 mr-2" />
            {userOwnedGolfer ? "Upgrade Entry" : "Place Entry"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Auction Board</CardTitle>
          <CardDescription>Highest entries for each golfer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {eligiblePlayers.map((golfer) => {
              const bid = highestBids[golfer.id]
              const isYourBid = bid?.buyerId === currentUser.id
              return (
                <div
                  key={golfer.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isYourBid ? "bg-green-50 dark:bg-green-900 border-green-500" : "bg-muted"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{golfer.name}</p>
                    <p className="text-xs text-muted-foreground">HC: {golfer.handicap}</p>
                  </div>
                  {bid ? (
                    <div className="text-right">
                      <p className="font-bold text-green-600">{bid.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{isYourBid ? "Your entry" : bid.buyerName}</p>
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
    </div>
  )
}
