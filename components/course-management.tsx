"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, MapPin } from "lucide-react"
import { createCourse, updateCourse, deleteCourse as deleteCourseFn, getCoursesByTournament } from "@/lib/supabase/db"
import type { Course, Hole } from "@/app/page"

type CourseManagementProps = {
  currentTournamentId: string | null
}

export function CourseManagement({ currentTournamentId }: CourseManagementProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [newCourseName, setNewCourseName] = useState("")
  const [newCourseHoles, setNewCourseHoles] = useState("18")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editHoles, setEditHoles] = useState<Hole[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadCourses = async () => {
      if (!currentTournamentId) {
        setCourses([])
        return
      }

      try {
        const coursesData = await getCoursesByTournament(currentTournamentId)
        setCourses(coursesData as Course[])
      } catch (error) {
        console.error("Error loading courses:", error)
      }
    }

    loadCourses()
  }, [currentTournamentId])

  const tournamentCourses = courses.filter((c) => c.tournamentId === currentTournamentId)

  const addCourse = async () => {
    if (!newCourseName.trim() || !currentTournamentId) {
      return
    }

    setLoading(true)
    try {
      const numHoles = Number.parseInt(newCourseHoles) || 18
      const holes: Hole[] = Array.from({ length: numHoles }, (_, i) => ({
        holeNumber: i + 1,
        par: 4,
        strokeIndex: i % 2 === 0 ? i + 1 : numHoles - i,
      }))

      await createCourse({
        name: newCourseName.trim(),
        holes,
        tournamentId: currentTournamentId,
      })

      const updatedCourses = await getCoursesByTournament(currentTournamentId)
      setCourses(updatedCourses as Course[])

      setNewCourseName("")
      setNewCourseHoles("18")
    } catch (error) {
      console.error("Error creating course:", error)
      alert("Failed to create course. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (course: Course) => {
    setEditingId(course.id)
    setEditName(course.name)
    const holesForEdit = course.holes.map((h) => ({
      ...h,
      strokeIndex: h.strokeIndex || h.holeNumber,
    }))
    setEditHoles(holesForEdit)
  }

  const updateHolePar = (holeNumber: number, value: string) => {
    const numValue = Number.parseInt(value)
    if (value === "" || isNaN(numValue)) {
      setEditHoles(editHoles.map((h) => (h.holeNumber === holeNumber ? { ...h, par: value as any } : h)))
      return
    }
    const par = Math.max(3, Math.min(6, numValue))
    setEditHoles(editHoles.map((h) => (h.holeNumber === holeNumber ? { ...h, par } : h)))
  }

  const updateHoleStrokeIndex = (holeNumber: number, value: string) => {
    const numValue = Number.parseInt(value)
    if (value === "" || isNaN(numValue)) {
      setEditHoles(editHoles.map((h) => (h.holeNumber === holeNumber ? { ...h, strokeIndex: value as any } : h)))
      return
    }
    const strokeIndex = Math.max(1, Math.min(editHoles.length, numValue))
    setEditHoles(editHoles.map((h) => (h.holeNumber === holeNumber ? { ...h, strokeIndex } : h)))
  }

  const saveEdit = async () => {
    if (!editingId || !currentTournamentId) return

    setLoading(true)
    try {
      await updateCourse(editingId, {
        name: editName.trim(),
        holes: editHoles,
      })

      const updatedCourses = await getCoursesByTournament(currentTournamentId)
      setCourses(updatedCourses as Course[])

      setEditingId(null)
    } catch (error) {
      console.error("Error updating course:", error)
      alert("Failed to update course. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?") || !currentTournamentId) return

    setLoading(true)
    try {
      await deleteCourseFn(id)

      const updatedCourses = await getCoursesByTournament(currentTournamentId)
      setCourses(updatedCourses as Course[])
    } catch (error) {
      console.error("Error deleting course:", error)
      alert("Failed to delete course. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getTotalPar = (holes: Hole[]) => {
    return holes.reduce((sum, hole) => sum + hole.par, 0)
  }

  const handleParBlur = (holeNumber: number, value: string) => {
    const numValue = Number.parseInt(value)
    const par = isNaN(numValue) ? 4 : Math.max(3, Math.min(6, numValue))
    setEditHoles(editHoles.map((h) => (h.holeNumber === holeNumber ? { ...h, par } : h)))
  }

  const handleStrokeIndexBlur = (holeNumber: number, value: string) => {
    const numValue = Number.parseInt(value)
    const strokeIndex = isNaN(numValue) ? holeNumber : Math.max(1, Math.min(editHoles.length, numValue))
    setEditHoles(editHoles.map((h) => (h.holeNumber === holeNumber ? { ...h, strokeIndex } : h)))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Course</CardTitle>
          <CardDescription>Add golf courses with hole-by-hole par information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="course-name">Course Name</Label>
              <Input
                id="course-name"
                placeholder="Enter course name"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && addCourse()}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="course-holes">Number of Holes</Label>
              <Input
                id="course-holes"
                type="number"
                placeholder="18"
                value={newCourseHoles}
                onChange={(e) => setNewCourseHoles(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && addCourse()}
                disabled={loading}
              />
            </div>
          </div>
          <Button onClick={addCourse} className="mt-4 w-full md:w-auto" disabled={loading}>
            <Plus className="w-4 h-4 mr-2" />
            {loading ? "Adding..." : "Add Course"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Course will be created with default par 4 and standard stroke index. You can edit after creation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courses ({tournamentCourses.length})</CardTitle>
          <CardDescription>Manage golf course information, hole pars, and stroke indexes</CardDescription>
        </CardHeader>
        <CardContent>
          {tournamentCourses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No courses added yet</p>
          ) : (
            <div className="space-y-4">
              {tournamentCourses.map((course) => (
                <div key={course.id} className="border rounded-lg bg-card">
                  {editingId === course.id ? (
                    <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                      <div className="sticky top-0 z-10 bg-card border-b pb-3 mb-3 -mx-4 px-4 -mt-4 pt-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={saveEdit}
                            size="lg"
                            className="flex-1 text-base font-bold h-12"
                            disabled={loading}
                          >
                            {loading ? "Saving..." : "💾 Save Changes"}
                          </Button>
                          <Button
                            onClick={() => setEditingId(null)}
                            size="lg"
                            variant="outline"
                            className="h-12"
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Course Name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={loading}
                          className="h-12 text-lg"
                        />
                      </div>

                      <div>
                        <Label className="text-base font-semibold">Hole Pars</Label>
                        <div className="grid grid-cols-6 md:grid-cols-9 gap-2 mt-2">
                          {editHoles.map((hole) => (
                            <div key={hole.holeNumber} className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Hole {hole.holeNumber}</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[3-6]"
                                value={hole.par}
                                onChange={(e) => updateHolePar(hole.holeNumber, e.target.value)}
                                onBlur={(e) => handleParBlur(hole.holeNumber, e.target.value)}
                                className="text-center w-10 h-10 text-base font-bold p-0"
                                disabled={loading}
                                placeholder="4"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-base font-semibold">Stroke Index (1 = hardest, 18 = easiest)</Label>
                        <div className="grid grid-cols-6 md:grid-cols-9 gap-2 mt-2">
                          {editHoles.map((hole) => (
                            <div key={hole.holeNumber} className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Hole {hole.holeNumber}</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={hole.strokeIndex}
                                onChange={(e) => updateHoleStrokeIndex(hole.holeNumber, e.target.value)}
                                onBlur={(e) => handleStrokeIndexBlur(hole.holeNumber, e.target.value)}
                                className="text-center w-10 h-10 text-base font-bold p-0"
                                disabled={loading}
                                placeholder={hole.holeNumber.toString()}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <div>
                            <p className="font-medium">{course.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Par {getTotalPar(course.holes)} • {course.holes.length} holes
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => startEdit(course)} size="sm" variant="outline" disabled={loading}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteCourse(course.id)}
                            size="sm"
                            variant="destructive"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-6 md:grid-cols-9 gap-2">
                        {course.holes.map((hole) => (
                          <div
                            key={hole.holeNumber}
                            className="text-center p-2 bg-emerald-50 border border-emerald-200 rounded"
                          >
                            <p className="text-xs text-muted-foreground">H{hole.holeNumber}</p>
                            <p className="font-semibold text-emerald-900">Par {hole.par}</p>
                            <p className="text-xs text-emerald-600">SI {hole.strokeIndex || hole.holeNumber}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
