import { NextRequest, NextResponse } from 'next/server'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { bedrockService } from '@/lib/ai/bedrock'
import { assessmentOperations, lessonOperations, courseOperations } from '@/lib/db/helpers'

const ASSESSMENT_CREDITS = 3

// POST /api/assessments - Build an assessment for a lesson or course
export async function POST(request: NextRequest) {
  try {
    const user = await requireCredits(ASSESSMENT_CREDITS)
    const body = await request.json()
    const { courseId, lessonId, title, objectives = [], questionCount = 10 } = body

    if (!courseId && !lessonId) {
      return NextResponse.json({ error: 'courseId or lessonId is required' }, { status: 400 })
    }

    let topic = title || 'Assessment'
    let resolvedCourse = null
    let resolvedLesson = null

    if (lessonId) {
      resolvedLesson = await lessonOperations.getById(lessonId)
      resolvedCourse = await courseOperations.getById(resolvedLesson.course_id)
    } else if (courseId) {
      resolvedCourse = await courseOperations.getById(courseId)
    }

    if (!resolvedCourse || resolvedCourse.user_id !== user.id) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    topic = title || resolvedLesson?.title || resolvedCourse.title

    const quiz = await bedrockService.generateQuiz(
      topic,
      objectives.length ? objectives : (resolvedLesson?.objectives || []),
      questionCount
    )

    const assessment = await assessmentOperations.create({
      course_id: resolvedCourse.id,
      lesson_id: resolvedLesson?.id || null,
      title: quiz.title,
      overview: quiz.overview,
      questions: quiz.questions,
      total_points: quiz.totalPoints,
      metadata: { questionCount }
    })

    await deductCredits(user.clerk_id, ASSESSMENT_CREDITS)

    return NextResponse.json({ success: true, assessment })
  } catch (error) {
    console.error('Assessment builder error:', error)
    if (error instanceof Error && error.message === 'Insufficient credits') {
      return NextResponse.json({ error: 'Insufficient credits', creditsRequired: ASSESSMENT_CREDITS }, { status: 402 })
    }
    return NextResponse.json({ error: 'Failed to build assessment' }, { status: 500 })
  }
}

// GET /api/assessments?lessonId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')
    if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })
    const list = await assessmentOperations.listByLesson(lessonId)
    return NextResponse.json({ assessments: list })
  } catch (error) {
    console.error('Assessment list error:', error)
    return NextResponse.json({ error: 'Failed to list assessments' }, { status: 500 })
  }
}

