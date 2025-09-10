import { NextRequest, NextResponse } from 'next/server'
import { courseOperations } from '@/lib/db/helpers'
import { requireUser, requireCredits } from '@/lib/auth/ensure-user'
import type { CourseInsert } from '@/lib/types/database'

// GET /api/courses - Get all courses for the current user
export async function GET() {
  try {
    // Ensure user exists in database
    const user = await requireUser()

    // Get all courses for the user
    const courses = await courseOperations.getAll(user.id)
    
    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

// POST /api/courses - Create a new course
export async function POST(request: NextRequest) {
  try {
    // Ensure user exists and has credits
    const user = await requireCredits(1)

    // Parse request body
    const body = await request.json()
    const { title, topic, description, settings } = body

    // Validate required fields
    if (!title || !topic) {
      return NextResponse.json(
        { error: 'Title and topic are required' },
        { status: 400 }
      )
    }

    // Create course data
    const courseData: CourseInsert = {
      user_id: user.id,
      title,
      topic,
      description: description || null,
      outline: {},
      settings: settings || {
        research_enabled: true,
        humanization_level: 'moderate',
        content_tone: 'professional',
        include_quizzes: true,
        include_activities: true,
        generate_images: false
      },
      status: 'draft'
    }

    // Create the course
    const course = await courseOperations.create(courseData)
    
    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    )
  }
}
