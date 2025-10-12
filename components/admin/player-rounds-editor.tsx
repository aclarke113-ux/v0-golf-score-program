"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { AdminScoreEditor } from "./admin-score-editor"
import type { Player, Course, Group, Round } from "@/lib/types"

type PlayerRoundsEditorProps = {
  player: Player
  rounds: Round[]
  courses: Course[]
  groups: Group[]
  onUpdate: () => void
}

export function PlayerRoundsEditor({ player, rounds, courses, groups, onUpdate }: PlayerRoundsEditorProps) {
  const [open, setOpen] = useState(false)

  const playerRounds = rounds.filter((r) => r.playerId === player.id && r.completed)

  if (playerRounds.length === 0) {
    return null
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} title="Edit player's rounds">
        <Pencil className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rounds - {player.name}</DialogTitle>
            <DialogDescription>
              Handicap: {player.handicap} • {playerRounds.length} completed round{playerRounds.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {playerRounds.map((round) => {
              const group = groups.find((g) => g.id === round.groupId)
              const course = courses.find((c) => c.id === group?.courseId)

              if (!group || !course) return null

              return (
                <div key={round.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div>
                    <p className="font-medium">
                      {group.name} - Day {group.day}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {course.name} • Gross: {round.totalGross} • Points: {round.totalPoints}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Handicap used: {round.handicapUsed || player.handicap}
                    </p>
                  </div>
                  <AdminScoreEditor
                    round={round}
                    player={player}
                    course={course}
                    group={group}
                    onUpdate={() => {
                      onUpdate()
                      // Keep the dialog open so they can edit multiple rounds
                    }}
                  />
                </div>
              )
            })}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
