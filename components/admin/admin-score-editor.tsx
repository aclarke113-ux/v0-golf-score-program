"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateRound } from "@/lib/supabase/db"
import type { Round, Player, Course, Group } from "@/lib/types"
import { Pencil } from "lucide-react"

type AdminScoreEditorProps = {
  round: Round
  player: Player
  course: Course
  group: Group
  onUpdate: () => void
}

export function AdminScoreEditor({ round, player, course, group, onUpdate }: AdminScoreEditorProps) {
  const [open, setOpen] = useState(false)
  const [editedHoles, setEditedHoles] = useState(round.holes)
  const [editedHandicap, setEditedHandicap] = useState(round.handicapUsed || player.handicap)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Recalculate points for each hole based on edited strokes
      const updatedHoles = editedHoles.map((hole) => {
        const courseHole = course.holes.find((h) => h.holeNumber === hole.holeNumber)
        if (!courseHole) return hole

        const par = courseHole.par
        const strokes = hole.strokes
        const points = Math.max(0, 2 + par - strokes)

        return {
          ...hole,
          points,
        }
      })

      await updateRound(round.id, {
        holes: updatedHoles,
        handicapUsed: editedHandicap,
      })

      onUpdate()
      setOpen(false)
    } catch (error) {
      console.error("[v0] Error updating round:", error)
      alert("Failed to update round. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleStrokeChange = (holeNumber: number, strokes: number) => {
    setEditedHoles((prev) =>
      prev.map((hole) => (hole.holeNumber === holeNumber ? { ...hole, strokes: Math.max(0, strokes) } : hole)),
    )
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Round - {player.name}</DialogTitle>
            <DialogDescription>
              {group.name} - Day {group.day} - {course.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Handicap Editor */}
            <div>
              <Label htmlFor="handicap">Round Handicap</Label>
              <Input
                id="handicap"
                type="number"
                value={editedHandicap}
                onChange={(e) => setEditedHandicap(Number.parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">Player's current handicap: {player.handicap}</p>
            </div>

            {/* Hole Scores Editor */}
            <div>
              <Label>Hole Scores</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {editedHoles.map((hole) => {
                  const courseHole = course.holes.find((h) => h.holeNumber === hole.holeNumber)
                  return (
                    <div key={hole.holeNumber} className="flex items-center gap-2">
                      <Label htmlFor={`hole-${hole.holeNumber}`} className="w-16">
                        Hole {hole.holeNumber}
                      </Label>
                      <Input
                        id={`hole-${hole.holeNumber}`}
                        type="number"
                        value={hole.strokes}
                        onChange={(e) => handleStrokeChange(hole.holeNumber, Number.parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground">Par {courseHole?.par || "-"}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
