import { NextRequest, NextResponse } from 'next/server'
import { courseOperations } from '@/lib/db/helpers'
import { requireUser } from '@/lib/auth/ensure-user'
import type { CourseUpdate } from '@/lib/types/database'

interface Params {
  params: Promise<{
    id: string
  }>
}

// GET /api/courses/[id] - Get a specific course
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const user = await requireUser()

    // Get the course with lessons
    const course = await courseOperations.getWithLessons(id)
    
    // Verify the course belongs to the user
    if (course.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ course })
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    )
  }
}

// PUT /api/courses/[id] - Update a course
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const user = await requireUser()

    // Get the existing course
    const existingCourse = await courseOperations.getById(id)
    
    // Verify the course belongs to the user
    if (existingCourse.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { title, topic, description, outline, settings, status } = body

    // Create update data
    const updateData: CourseUpdate = {}
    
    if (title !== undefined) updateData.title = title
    if (topic !== undefined) updateData.topic = topic
    if (description !== undefined) updateData.description = description
    if (outline !== undefined) updateData.outline = outline
    if (settings !== undefined) updateData.settings = settings
    if (status !== undefined) updateData.status = status

    // Update the course
    const updatedCourse = await courseOperations.update(id, updateData)
    
    return NextResponse.json({ course: updatedCourse })
  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    )
  }
}

// DELETE /api/courses/[id] - Delete a course
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const user = await requireUser()

    // Get the existing course
    const existingCourse = await courseOperations.getById(id)
    
    // Verify the course belongs to the user
    if (existingCourse.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Delete the course (cascades to lessons and other related data)
    await courseOperations.delete(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}
