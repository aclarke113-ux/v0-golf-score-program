"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Calendar } from "lucide-react"

interface Group {
  id: string
  name: string
  tee_time: string | null
  starting_hole: number
}

export function TeeTimeManager({ competitionId }: { competitionId: string }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGroups()
  }, [competitionId])

  const loadGroups = async () => {
    const res = await fetch(`/api/competitions/${competitionId}/groups`)
    const data = await res.json()
    setGroups(data.groups || [])
    setLoading(false)
  }

  const updateTeeTime = async (groupId: string, teeTime: string, startingHole: number) => {
    await fetch(`/api/competitions/${competitionId}/groups/${groupId}/tee-time`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teeTime, startingHole }),
    })
    loadGroups()
  }

  if (loading) {
    return <div>Loading groups...</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Tee Time Management</h3>

      <div className="grid gap-4">
        {groups.map((group) => (
          <TeeTimeCard key={group.id} group={group} onUpdate={updateTeeTime} />
        ))}
      </div>

      {groups.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No groups created yet. Create groups first to assign tee times.
        </Card>
      )}
    </div>
  )
}

function TeeTimeCard({
  group,
  onUpdate,
}: {
  group: Group
  onUpdate: (groupId: string, teeTime: string, startingHole: number) => void
}) {
  const [teeTime, setTeeTime] = useState(group.tee_time ? new Date(group.tee_time).toISOString().slice(0, 16) : "")
  const [startingHole, setStartingHole] = useState(group.starting_hole.toString())
  const [editing, setEditing] = useState(false)

  const handleSave = () => {
    if (teeTime) {
      onUpdate(group.id, new Date(teeTime).toISOString(), Number.parseInt(startingHole))
      setEditing(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold">{group.name}</h4>
            {group.tee_time && !editing && (
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(group.tee_time).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(group.tee_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <span className="font-medium">Starting Hole: {group.starting_hole}</span>
              </div>
            )}
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              {group.tee_time ? "Edit" : "Set Tee Time"}
            </Button>
          )}
        </div>

        {editing && (
          <div className="space-y-3">
            <div>
              <Label>Tee Time</Label>
              <Input type="datetime-local" value={teeTime} onChange={(e) => setTeeTime(e.target.value)} />
            </div>

            <div>
              <Label>Starting Hole</Label>
              <Select value={startingHole} onValueChange={setStartingHole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Hole</SelectItem>
                  <SelectItem value="10">10th Hole (Shotgun/Busy Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 bg-transparent">
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Players will receive notifications 12 hours, 1 hour, and 10 minutes before tee time.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
