import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/ensure-user'
import { progressOperations, courseOperations } from '@/lib/db/helpers'

// POST /api/progress - Upsert progress for a lesson
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const { courseId, lessonId = null, status = 'in_progress', progressPercent = 0 } = body

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    const course = await courseOperations.getById(courseId)
    if (course.user_id !== user.id) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const saved = await progressOperations.upsert({
      user_id: user.id,
      course_id: courseId,
      lesson_id: lessonId,
      status,
      progress_percent: progressPercent,
      last_viewed_at: new Date().toISOString()
    })

    return NextResponse.json({ success: true, progress: saved })
  } catch (error) {
    console.error('Progress upsert error:', error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}

// GET /api/progress?courseId=...
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }
    const data = await progressOperations.getForCourse(user.id, courseId)
    const summary = {
      total: data.length,
      completed: data.filter(p => p.status === 'completed').length,
      in_progress: data.filter(p => p.status === 'in_progress').length,
      not_started: data.filter(p => p.status === 'not_started').length,
      averageProgress: data.length ? Math.round(data.reduce((s, p) => s + Number(p.progress_percent || 0), 0) / data.length) : 0
    }
    return NextResponse.json({ progress: data, summary })
  } catch (error) {
    console.error('Progress fetch error:', error)
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 })
  }
}

