"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, MapPin } from "lucide-react"

interface Course {
  id: string
  name: string
  par: number
  holes: Array<{ holeNumber: number; par: number; strokeIndex: number }>
}

export function CoursesManagement({ competitionId }: { competitionId: string }) {
  const supabase = getSupabaseBrowserClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [numHoles, setNumHoles] = useState(18)

  useEffect(() => {
    loadCourses()
  }, [competitionId])

  const loadCourses = async () => {
    const { data } = await supabase.from("courses").select("*").eq("competition_id", competitionId).order("name")

    if (data) setCourses(data)
  }

  const createStandardCourse = async () => {
    if (!name.trim()) return

    setLoading(true)

    // Create standard 18-hole course with par 72 (4 par 3s, 10 par 4s, 4 par 5s)
    const holes = []
    const parPattern = [4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5] // Standard par 72

    for (let i = 1; i <= numHoles; i++) {
      holes.push({
        holeNumber: i,
        par: parPattern[i - 1] || 4,
        strokeIndex: i,
      })
    }

    const totalPar = holes.reduce((sum, h) => sum + h.par, 0)

    const { error } = await supabase.from("courses").insert({
      competition_id: competitionId,
      name: name.trim(),
      par: totalPar,
      holes,
    })

    if (!error) {
      setName("")
      loadCourses()
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Course</CardTitle>
          <CardDescription>Create a new golf course for the competition</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="course-name">Course Name</Label>
              <Input
                id="course-name"
                placeholder="Pebble Beach"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createStandardCourse()}
              />
            </div>
            <div className="w-32 space-y-2">
              <Label htmlFor="num-holes">Holes</Label>
              <Input
                id="num-holes"
                type="number"
                min="9"
                max="18"
                value={numHoles}
                onChange={(e) => setNumHoles(Number.parseInt(e.target.value) || 18)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={createStandardCourse} disabled={loading || !name.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Create
              </Button>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Creates a standard par 72 course (18 holes) or par 36 (9 holes)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Courses ({courses.length})
          </CardTitle>
          <CardDescription>Manage competition courses</CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="py-8 text-center text-gray-600">No courses added yet</p>
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <div key={course.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-sm text-gray-600">
                        {course.holes.length} holes - Par {course.par}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
