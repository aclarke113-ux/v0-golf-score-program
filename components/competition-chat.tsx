"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, MessageCircle } from "lucide-react"
import { createMessage, getMessagesByTournament, createNotification, getPlayersByTournament } from "@/lib/supabase/db"
import { subscribeToMessages, unsubscribe } from "@/lib/supabase/realtime"
import { sendPushNotification } from "@/lib/notifications/push-sender"
import type { Message } from "@/lib/types"

type CompetitionChatProps = {
  currentUserId: string
  currentUserName: string
  tournamentId: string
}

export function CompetitionChat({ currentUserId, currentUserName, tournamentId }: CompetitionChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()

    const channel = subscribeToMessages(tournamentId, () => {
      loadMessages()
    })

    return () => {
      unsubscribe(channel)
    }
  }, [tournamentId])

  useEffect(() => {
    scrollToBottom()
  }, [localMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadMessages = async () => {
    try {
      const data = await getMessagesByTournament(tournamentId)
      setLocalMessages(data as Message[])
      setMessages(data as Message[])
    } catch (error) {
      console.error("[v0] Error loading messages:", error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading) return

    setLoading(true)
    try {
      await createMessage({
        tournamentId,
        userId: currentUserId,
        userName: currentUserName,
        content: newMessage.trim(),
      })

      try {
        const players = await getPlayersByTournament(tournamentId)
        const otherPlayers = players.filter((p) => p.id !== currentUserId)

        // Create notification for each player
        await Promise.all(
          otherPlayers.map((player) =>
            createNotification({
              tournamentId,
              playerId: player.id,
              type: "chat",
              title: `New message from ${currentUserName}`,
              message: newMessage.trim().substring(0, 100),
              read: false,
            }),
          ),
        )

        await sendPushNotification({
          tournamentId,
          title: `💬 ${currentUserName}`,
          message: newMessage.trim().substring(0, 100),
          excludeUserId: currentUserId,
        })

        console.log("[v0] Push notifications sent for chat message")
      } catch (notifError) {
        console.error("[v0] Error creating chat notifications:", notifError)
      }

      setNewMessage("")
      await loadMessages()
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      alert("Failed to send message. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <h3 className="font-semibold">Group Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
        ) : (
          localMessages.map((message) => {
            const isOwn = message.userId === currentUserId
            return (
              <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {!isOwn && <p className="text-xs opacity-70 mb-1">{message.userName}</p>}
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(message.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || loading}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  )
}
