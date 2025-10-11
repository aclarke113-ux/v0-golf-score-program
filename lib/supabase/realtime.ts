import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function subscribeToMessages(tournamentId: string, callback: () => void): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`messages:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      callback,
    )
    .subscribe()

  return channel
}

export function subscribeToPosts(tournamentId: string, callback: () => void): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`posts:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "posts",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      callback,
    )
    .subscribe()

  return channel
}

export function subscribeToPlayers(tournamentId: string, callback: () => void): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`players:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "players",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      callback,
    )
    .subscribe()

  return channel
}

export function subscribeToGroups(tournamentId: string, callback: () => void): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`groups:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "groups",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      callback,
    )
    .subscribe()

  return channel
}

export function subscribeToRounds(tournamentId: string, callback: () => void): RealtimeChannel {
  const supabase = createClient()

  // Note: Rounds don't have tournament_id directly, so we subscribe to all changes
  // In production, you might want to filter by player_id or group_id
  const channel = supabase
    .channel(`rounds:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rounds",
      },
      callback,
    )
    .subscribe()

  return channel
}

export function subscribeToAuctions(tournamentId: string, callback: () => void): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`auctions:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "auctions",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      callback,
    )
    .subscribe()

  return channel
}

export function subscribeToPredictions(tournamentId: string, callback: () => void): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`predictions:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "predictions",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      callback,
    )
    .subscribe()

  return channel
}

export function subscribeToNotifications(playerId: string, callback: () => void): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`notifications:${playerId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `player_id=eq.${playerId}`,
      },
      callback,
    )
    .subscribe()

  return channel
}

// Utility to unsubscribe from a channel
export function unsubscribe(channel: RealtimeChannel) {
  const supabase = createClient()
  supabase.removeChannel(channel)
}
