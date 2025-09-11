import { NextRequest, NextResponse } from 'next/server'
import { courseOperations, generationJobOperations } from '@/lib/db/helpers'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { bedrockService } from '@/lib/ai/bedrock'
import type { CourseUpdate, GenerationJobInsert } from '@/lib/types/database'

const OUTLINE_GENERATION_CREDITS = 5

export async function POST(request: NextRequest) {
  let jobId: string | undefined

  try {
    // Ensure user exists and has credits
    const user = await requireCredits(OUTLINE_GENERATION_CREDITS)

    // Parse request body
    const body = await request.json()
    const { 
      courseId,
      topic,
      targetAudience = 'General learners',
      difficulty = 'Intermediate',
      preferences = {}
    } = body

    // Validate required fields
    if (!courseId || !topic) {
      return NextResponse.json(
        { error: 'Course ID and topic are required' },
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

    // Create a generation job
    const jobData: GenerationJobInsert = {
      user_id: user.id,
      course_id: courseId,
      type: 'course_outline',
      status: 'pending',
      config: {
        topic,
        targetAudience,
        difficulty,
        ...preferences
      },
      result: {}
    }

    const job = await generationJobOperations.create(jobData)
    jobId = job.id

    // Start the job
    await generationJobOperations.startJob(job.id)

    try {
      // Generate the course outline
      const outline = await bedrockService.generateCourseOutline(
        topic,
        targetAudience,
        difficulty,
        {
          temperature: preferences.temperature || 0.7,
          systemPrompt: preferences.systemPrompt
        }
      )

      // Update the course with the generated outline
      const courseUpdate: CourseUpdate = {
        outline: {
          modules: outline.modules,
          duration: outline.totalDuration?.toString(),
          target_audience: targetAudience,
          learning_objectives: outline.objectives,
          prerequisites: preferences.prerequisites || []
        },
        status: 'complete'
      }

      await courseOperations.update(courseId, courseUpdate)

      // Complete the job
      await generationJobOperations.completeJob(job.id, {
        content: outline,
        metadata: {
          moduleCount: outline.modules.length,
          totalDuration: outline.totalDuration,
          objectivesCount: outline.objectives.length
        }
      })

      // Deduct credits
      await deductCredits(user.clerk_id, OUTLINE_GENERATION_CREDITS)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        outline,
        creditsUsed: OUTLINE_GENERATION_CREDITS,
        creditsRemaining: user.credits_remaining - OUTLINE_GENERATION_CREDITS
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
    console.error('Error generating course outline:', error)
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired: OUTLINE_GENERATION_CREDITS },
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
        error: 'Failed to generate course outline',
        jobId,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = await generationJobOperations.getById(jobId)

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        type: job.type,
        result: job.result,
        error: job.error_message,
        createdAt: job.created_at,
        completedAt: job.completed_at
      }
    })
  } catch (error) {
    console.error('Error fetching job status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}
