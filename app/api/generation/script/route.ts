import { NextRequest, NextResponse } from 'next/server'
import { lessonOperations, courseOperations, generationJobOperations } from '@/lib/db/helpers'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { bedrockService } from '@/lib/ai/bedrock'
import type { LessonUpdate, GenerationJobInsert } from '@/lib/types/database'

const SCRIPT_GENERATION_CREDITS = 4

export async function POST(request: NextRequest) {
  let jobId: string | undefined

  try {
    // Ensure user exists and has credits
    const user = await requireCredits(SCRIPT_GENERATION_CREDITS)

    // Parse request body
    const body = await request.json()
    const { 
      lessonId,
      duration = 15, // Default 15 minutes
      style = 'conversational',
      preferences = {}
    } = body

    // Validate required fields
    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      )
    }

    // Get the lesson and verify ownership
    const lesson = await lessonOperations.getById(lessonId)
    const course = await courseOperations.getById(lesson.course_id)
    
    if (course.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Check if lesson has a plan
    if (!lesson.lesson_plan || Object.keys(lesson.lesson_plan).length === 0) {
      return NextResponse.json(
        { error: 'Lesson plan must be generated first' },
        { status: 400 }
      )
    }

    // Create a generation job
    const jobData: GenerationJobInsert = {
      user_id: user.id,
      course_id: course.id,
      type: 'lesson_script',
      status: 'pending',
      config: {
        lessonId,
        duration,
        style,
        ...preferences
      },
      result: {}
    }

    const job = await generationJobOperations.create(jobData)
    jobId = job.id

    // Start the job
    await generationJobOperations.startJob(job.id)

    try {
      // Prepare lesson plan for script generation
      const lessonPlan = {
        lectureTitle: lesson.title,
        objectives: lesson.objectives,
        introduction: lesson.lesson_plan.introduction || '',
        mainContent: lesson.lesson_plan.main_content || [],
        summary: lesson.lesson_plan.conclusion || '',
        activity: lesson.activities?.[0] ? {
          type: lesson.activities[0].type as any,
          title: lesson.activities[0].title,
          instructions: lesson.activities[0].instructions,
          estimatedMinutes: lesson.activities[0].duration_minutes || 10
        } : undefined
      }

      // Generate the script
      const script = await bedrockService.generateLectureScript(
        lessonPlan,
        duration,
        style,
        {
          temperature: preferences.temperature || 0.8,
          systemPrompt: preferences.systemPrompt,
          maxTokens: preferences.maxTokens || 6000
        }
      )

      // Count words for metrics
      const wordCount = script.split(/\s+/).length
      const estimatedSpeakingTime = Math.round(wordCount / 150) // 150 words per minute

      // Update the lesson with the generated script
      const lessonUpdate: LessonUpdate = {
        script,
        status: 'complete'
      }

      await lessonOperations.update(lessonId, lessonUpdate)

      // Complete the job
      await generationJobOperations.completeJob(job.id, {
        content: script,
        metadata: {
          wordCount,
          estimatedSpeakingTime,
          targetDuration: duration,
          style
        }
      })

      // Deduct credits
      await deductCredits(user.clerk_id, SCRIPT_GENERATION_CREDITS)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        script,
        metadata: {
          wordCount,
          estimatedSpeakingTime,
          targetDuration: duration
        },
        creditsUsed: SCRIPT_GENERATION_CREDITS,
        creditsRemaining: user.credits_remaining - SCRIPT_GENERATION_CREDITS
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
    console.error('Error generating script:', error)
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired: SCRIPT_GENERATION_CREDITS },
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
        error: 'Failed to generate script',
        jobId,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to regenerate script with different parameters
export async function PUT(request: NextRequest) {
  try {
    // Ensure user exists and has credits
    const user = await requireCredits(SCRIPT_GENERATION_CREDITS)

    // Parse request body
    const body = await request.json()
    const { 
      lessonId,
      regenerate = false,
      newDuration,
      newStyle,
      humanize = false,
      humanizationLevel = 'moderate'
    } = body

    // Validate required fields
    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      )
    }

    // Get the lesson and verify ownership
    const lesson = await lessonOperations.getById(lessonId)
    const course = await courseOperations.getById(lesson.course_id)
    
    if (course.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Check if lesson has a script
    if (!lesson.script) {
      return NextResponse.json(
        { error: 'No script exists to modify' },
        { status: 400 }
      )
    }

    let modifiedScript = lesson.script
    let creditsUsed = 0

    // Humanize existing script if requested
    if (humanize) {
      modifiedScript = await bedrockService.humanizeContent(
        lesson.script,
        'script',
        humanizationLevel as any,
        { temperature: 0.9 }
      )
      creditsUsed = 2 // Humanization costs 2 credits

      // Deduct credits for humanization
      await deductCredits(user.clerk_id, creditsUsed)

      // Update the lesson
      await lessonOperations.update(lessonId, { script: modifiedScript })

      return NextResponse.json({
        success: true,
        message: 'Script humanized successfully',
        script: modifiedScript,
        creditsUsed,
        creditsRemaining: user.credits_remaining - creditsUsed
      })
    }

    // Regenerate with new parameters if requested
    if (regenerate && (newDuration || newStyle)) {
      // This would call the main POST endpoint logic again
      // For now, return a message indicating this feature
      return NextResponse.json({
        message: 'Script regeneration with new parameters queued',
        newDuration,
        newStyle,
        estimatedCredits: SCRIPT_GENERATION_CREDITS
      })
    }

    return NextResponse.json({
      error: 'No modification requested'
    }, { status: 400 })

  } catch (error) {
    console.error('Error modifying script:', error)
    return NextResponse.json(
      { error: 'Failed to modify script' },
      { status: 500 }
    )
  }
}
