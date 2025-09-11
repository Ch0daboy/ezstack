import { NextRequest, NextResponse } from 'next/server'
import { courseOperations, generationJobOperations } from '@/lib/db/helpers'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { inngest } from '@/lib/inngest/client'
import type { GenerationJobInsert } from '@/lib/types/database'

const BATCH_GENERATION_CREDITS_PER_ITEM = 3

// POST /api/generation/batch - Batch generate content variations
export async function POST(request: NextRequest) {
  try {
    // Ensure user exists
    const user = await requireCredits(1) // Check initial credits

    // Parse request body
    const body = await request.json()
    const {
      courseId,
      variations = ['youtube_script', 'blog_post', 'ebook_chapter'],
      options = {}
    } = body

    // Validate required fields
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Get course with lessons
    const course = await courseOperations.getWithLessons(courseId)
    
    // Verify ownership
    if (course.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Filter lessons that have scripts
    const lessonsWithScripts = course.lessons?.filter(l => l.script) || []
    
    if (lessonsWithScripts.length === 0) {
      return NextResponse.json(
        { error: 'No lessons with scripts found' },
        { status: 400 }
      )
    }

    // Calculate total credits needed
    const totalJobs = lessonsWithScripts.length * variations.length
    const totalCredits = totalJobs * BATCH_GENERATION_CREDITS_PER_ITEM

    // Check if user has enough credits
    if (user.credits_remaining < totalCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          creditsRequired: totalCredits,
          creditsAvailable: user.credits_remaining,
          jobsCount: totalJobs
        },
        { status: 402 }
      )
    }

    // Create generation jobs
    const jobs: GenerationJobInsert[] = []
    
    for (const lesson of lessonsWithScripts) {
      for (const variationType of variations) {
        jobs.push({
          user_id: user.id,
          course_id: courseId,
          type: 'batch_variation',
          status: 'pending',
          config: {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            variationType,
            batchId: `batch_${Date.now()}`,
            options
          },
          result: {}
        })
      }
    }

    // Create all jobs in database
    const createdJobs = await Promise.all(
      jobs.map(job => generationJobOperations.create(job))
    )

    // Send to Inngest for processing
    await inngest.send({
      name: 'generation/batch.requested',
      data: {
        jobIds: createdJobs.map(j => j.id),
        type: 'content_variation',
        userId: user.id
      }
    })

    // Deduct credits upfront
    await deductCredits(user.clerk_id, totalCredits)

    return NextResponse.json({
      success: true,
      message: `Batch generation started for ${totalJobs} variations`,
      jobs: createdJobs.map(j => ({
        id: j.id,
        type: j.config.variationType,
        lessonId: j.config.lessonId,
        status: j.status
      })),
      totalJobs,
      creditsUsed: totalCredits,
      creditsRemaining: user.credits_remaining - totalCredits,
      estimatedTime: totalJobs * 30 // 30 seconds per job estimate
    })

  } catch (error) {
    console.error('Batch generation error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 402 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to start batch generation' },
      { status: 500 }
    )
  }
}

// GET /api/generation/batch - Get batch generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')
    const courseId = searchParams.get('courseId')
    
    if (!batchId && !courseId) {
      return NextResponse.json(
        { error: 'Batch ID or Course ID is required' },
        { status: 400 }
      )
    }

    // Ensure user is authenticated
    const user = await requireCredits(0)

    // Get jobs based on criteria
    let jobs
    if (batchId) {
      // Get all jobs for a specific batch
      const allUserJobs = await generationJobOperations.getUserJobs(user.id, 100)
      jobs = allUserJobs.filter(j => j.config.batchId === batchId)
    } else if (courseId) {
      // Get all batch jobs for a course
      const allUserJobs = await generationJobOperations.getUserJobs(user.id, 100)
      jobs = allUserJobs.filter(
        j => j.course_id === courseId && j.type === 'batch_variation'
      )
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        jobs: [],
        summary: {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0
        }
      })
    }

    // Calculate summary
    const summary = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length
    }

    // Format job details
    const jobDetails = jobs.map(job => ({
      id: job.id,
      status: job.status,
      type: job.config.variationType,
      lessonId: job.config.lessonId,
      lessonTitle: job.config.lessonTitle,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      error: job.error_message
    }))

    return NextResponse.json({
      jobs: jobDetails,
      summary,
      percentComplete: Math.round((summary.completed / summary.total) * 100)
    })

  } catch (error) {
    console.error('Batch status error:', error)
    return NextResponse.json(
      { error: 'Failed to get batch status' },
      { status: 500 }
    )
  }
}
