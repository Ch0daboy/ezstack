import { NextRequest, NextResponse } from 'next/server'
import { courseOperations, lessonOperations, generationJobOperations } from '@/lib/db/helpers'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { bedrockService } from '@/lib/ai/bedrock'
import type { LessonUpdate, GenerationJobInsert } from '@/lib/types/database'

const LESSON_PLAN_GENERATION_CREDITS = 3

export async function POST(request: NextRequest) {
  let jobId: string | undefined

  try {
    // Ensure user exists and has credits
    const user = await requireCredits(LESSON_PLAN_GENERATION_CREDITS)

    // Parse request body
    const body = await request.json()
    const { 
      courseId,
      lessonId,
      lessonTitle,
      objectives = [],
      moduleContext = '',
      preferences = {}
    } = body

    // Validate required fields
    if (!courseId || !lessonId || !lessonTitle) {
      return NextResponse.json(
        { error: 'Course ID, lesson ID, and lesson title are required' },
        { status: 400 }
      )
    }

    // Verify the course belongs to the user
    const course = await courseOperations.getById(courseId)
    if (course.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Verify the lesson belongs to the course
    const lesson = await lessonOperations.getById(lessonId)
    if (lesson.course_id !== courseId) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Create a generation job
    const jobData: GenerationJobInsert = {
      user_id: user.id,
      course_id: courseId,
      type: 'lesson_plan',
      status: 'pending',
      config: {
        lessonId,
        lessonTitle,
        objectives,
        moduleContext,
        ...preferences
      },
      result: {}
    }

    const job = await generationJobOperations.create(jobData)
    jobId = job.id

    // Start the job
    await generationJobOperations.startJob(job.id)

    try {
      // Generate the lesson plan
      const lessonPlan = await bedrockService.generateLessonPlan(
        lessonTitle,
        moduleContext || `Part of course: ${course.title}`,
        objectives.length > 0 ? objectives : ['Understand key concepts', 'Apply learning practically'],
        {
          temperature: preferences.temperature || 0.7,
          systemPrompt: preferences.systemPrompt
        }
      )

      // Update the lesson with the generated plan
      const lessonUpdate: LessonUpdate = {
        objectives: lessonPlan.objectives,
        lesson_plan: {
          introduction: lessonPlan.introduction,
          main_content: lessonPlan.mainContent,
          conclusion: lessonPlan.summary,
          duration_minutes: lessonPlan.activity?.estimatedMinutes,
          materials_needed: [],
          key_concepts: lessonPlan.mainContent.flatMap(section => section.keyPoints)
        },
        activities: lessonPlan.activity ? [{
          type: lessonPlan.activity.type,
          title: lessonPlan.activity.title,
          description: lessonPlan.activity.instructions,
          instructions: lessonPlan.activity.instructions,
          duration_minutes: lessonPlan.activity.estimatedMinutes,
          resources: lessonPlan.resources || [],
          assessment_criteria: []
        }] : [],
        status: 'complete'
      }

      await lessonOperations.update(lessonId, lessonUpdate)

      // Complete the job
      await generationJobOperations.completeJob(job.id, {
        content: lessonPlan,
        metadata: {
          objectivesCount: lessonPlan.objectives.length,
          sectionsCount: lessonPlan.mainContent.length,
          hasActivity: !!lessonPlan.activity,
          estimatedMinutes: lessonPlan.activity?.estimatedMinutes
        }
      })

      // Deduct credits
      await deductCredits(user.clerk_id, LESSON_PLAN_GENERATION_CREDITS)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        lessonPlan,
        creditsUsed: LESSON_PLAN_GENERATION_CREDITS,
        creditsRemaining: user.credits_remaining - LESSON_PLAN_GENERATION_CREDITS
      })

    } catch (generationError) {
      // Mark job as failed
      await generationJobOperations.failJob(
        job.id, 
        generationError instanceof Error ? generationError.message : 'Generation failed'
      )
      throw generationError
    }

  } catch (error) {
    console.error('Error generating lesson plan:', error)
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired: LESSON_PLAN_GENERATION_CREDITS },
          { status: 402 }
        )
      }
      if (error.message === 'Unauthorized: User not found') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate lesson plan',
        jobId,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint to batch generate lesson plans for a course
export async function PUT(request: NextRequest) {
  try {
    // Ensure user exists and has credits
    const user = await requireCredits(1) // Will check actual credits needed below

    // Parse request body
    const body = await request.json()
    const { courseId, generateAll = false } = body

    // Validate required fields
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Verify the course belongs to the user
    const course = await courseOperations.getWithLessons(courseId)
    if (course.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Get lessons that need generation
    const lessonsToGenerate = generateAll 
      ? course.lessons 
      : course.lessons.filter(l => l.status === 'draft' || !l.lesson_plan)

    if (lessonsToGenerate.length === 0) {
      return NextResponse.json({
        message: 'No lessons need generation',
        lessonsCount: 0
      })
    }

    // Calculate total credits needed
    const totalCredits = lessonsToGenerate.length * LESSON_PLAN_GENERATION_CREDITS
    
    // Check if user has enough credits
    if (user.credits_remaining < totalCredits) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits', 
          creditsRequired: totalCredits,
          creditsAvailable: user.credits_remaining,
          lessonsCount: lessonsToGenerate.length
        },
        { status: 402 }
      )
    }

    // Create generation jobs for each lesson
    const jobs = await Promise.all(
      lessonsToGenerate.map(async (lesson) => {
        const jobData: GenerationJobInsert = {
          user_id: user.id,
          course_id: courseId,
          type: 'lesson_plan',
          status: 'pending',
          config: {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            objectives: lesson.objectives,
            batchJob: true
          },
          result: {}
        }
        return generationJobOperations.create(jobData)
      })
    )

    // Start batch generation in background (would use Inngest in production)
    // For now, we'll return the job IDs for tracking
    const jobIds = jobs.map(j => j.id)

    return NextResponse.json({
      success: true,
      message: `Queued ${lessonsToGenerate.length} lessons for generation`,
      jobIds,
      estimatedCredits: totalCredits,
      estimatedTime: lessonsToGenerate.length * 30 // 30 seconds per lesson estimate
    })

  } catch (error) {
    console.error('Error batch generating lesson plans:', error)
    return NextResponse.json(
      { error: 'Failed to batch generate lesson plans' },
      { status: 500 }
    )
  }
}
