"use client"

import { useState, useEffect } from "react"
import { Search, MapPin, CheckCircle2, Edit2, Save, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { getClient } from "@/lib/supabase/client"

interface AustralianCourse {
  id: string
  name: string
  suburb: string
  state: string
  holes: Array<{ hole: number; par: number; strokeIndex: number }>
  created_at?: string
  updated_at?: string
}

interface Props {
  tournamentId: string
  onCourseSelected: (course: AustralianCourse) => void
}

export function AustralianCourseSelector({ tournamentId, onCourseSelected }: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [courses, setCourses] = useState<AustralianCourse[]>([])
  const [filteredCourses, setFilteredCourses] = useState<AustralianCourse[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCourse, setEditingCourse] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<AustralianCourse>>({})

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      loadCourses()
    } else {
      setFilteredCourses([])
    }
  }, [searchQuery])

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const query = searchQuery.toLowerCase()
      setFilteredCourses(
        courses.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.suburb?.toLowerCase().includes(query) ||
            c.state?.toLowerCase().includes(query),
        ),
      )
    } else {
      setFilteredCourses([])
    }
  }, [courses, searchQuery])

  const loadCourses = async () => {
    if (courses.length > 0) return

    setLoading(true)
    try {
      const supabase = await getClient()
      const { data, error } = await supabase.from("australian_golf_courses").select("*").order("name")

      console.log("[v0] Courses loaded:", { count: data?.length, error })

      if (data && !error) {
        setCourses(data)
      }
    } catch (err) {
      console.error("[v0] Exception loading courses:", err)
    }
    setLoading(false)
  }

  const startEditing = (course: AustralianCourse) => {
    setEditingCourse(course.id)
    setEditForm(course)
  }

  const cancelEditing = () => {
    setEditingCourse(null)
    setEditForm({})
  }

  const saveCourse = async () => {
    if (!editingCourse || !editForm) return

    const supabase = await getClient()
    const { error } = await supabase
      .from("australian_golf_courses")
      .update({
        name: editForm.name,
        suburb: editForm.suburb,
        state: editForm.state,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingCourse)

    if (!error) {
      // Reload courses to get fresh data
      setCourses([])
      loadCourses()
      setEditingCourse(null)
      setEditForm({})
    }
  }

  const selectCourse = (course: AustralianCourse) => {
    onCourseSelected(course)
  }

  const calculatePar = (holes: Array<{ hole: number; par: number; strokeIndex: number }>) => {
    return holes.reduce((sum, h) => sum + h.par, 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-600" />
          Australian Golf Courses
        </CardTitle>
        <CardDescription>Search and select from our database of Australian golf courses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, suburb, or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading courses...</p>
        ) : searchQuery.trim().length < 2 ? (
          <p className="py-8 text-center text-muted-foreground">Start typing to search Australian golf courses...</p>
        ) : filteredCourses.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No courses found for "{searchQuery}"</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:border-green-600/50 transition-colors">
                <CardContent className="p-4">
                  {editingCourse === course.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Course Name</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Suburb</Label>
                          <Input
                            value={editForm.suburb}
                            onChange={(e) => setEditForm({ ...editForm, suburb: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveCourse}>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{course.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {course.suburb}, {course.state}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditing(course)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => selectCourse(course)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Use This Course
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2 mb-2">
                        <Badge variant="secondary">Par {calculatePar(course.holes)}</Badge>
                        <Badge variant="secondary">{course.holes.length} Holes</Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
