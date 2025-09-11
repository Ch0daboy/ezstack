import { NextRequest, NextResponse } from 'next/server'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { bedrockService } from '@/lib/ai/bedrock'
import { lessonOperations, courseOperations } from '@/lib/db/helpers'
import type { LessonUpdate } from '@/lib/types/database'

const QUIZ_GENERATION_CREDITS = 3

// POST /api/generation/quiz - Generate a quiz for a lesson
export async function POST(request: NextRequest) {
  try {
    const user = await requireCredits(QUIZ_GENERATION_CREDITS)

    const body = await request.json()
    const {
      lessonId,
      questionCount = 10,
      objectives = [],
      title
    } = body

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 })
    }

    const lesson = await lessonOperations.getById(lessonId)
    const course = await courseOperations.getById(lesson.course_id)
    if (course.user_id !== user.id) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const quiz = await bedrockService.generateQuiz(
      title || lesson.title,
      objectives.length ? objectives : lesson.objectives,
      questionCount
    )

    // Append as an activity on the lesson
    const activities = Array.isArray(lesson.activities) ? [...lesson.activities] : []
    activities.push({
      type: 'quiz',
      title: quiz.title,
      description: quiz.overview,
      instructions: 'Answer all questions. Refer to course materials as needed.',
      duration_minutes: Math.max(10, Math.round(quiz.questions.length * 2)),
      resources: [],
      assessment_criteria: ['Accuracy', 'Completeness'],
      questions: quiz.questions,
      question_types: Array.from(new Set(quiz.questions.map((q: any) => q.type)))
    })

    const updates: LessonUpdate = { activities }
    await lessonOperations.update(lessonId, updates)

    await deductCredits(user.clerk_id, QUIZ_GENERATION_CREDITS)

    return NextResponse.json({
      success: true,
      quiz,
      creditsUsed: QUIZ_GENERATION_CREDITS,
      creditsRemaining: user.credits_remaining - QUIZ_GENERATION_CREDITS
    })

  } catch (error) {
    console.error('Quiz generation error:', error)
    if (error instanceof Error && error.message === 'Insufficient credits') {
      return NextResponse.json({ error: 'Insufficient credits', creditsRequired: QUIZ_GENERATION_CREDITS }, { status: 402 })
    }
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }
}

