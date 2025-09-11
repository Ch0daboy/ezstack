import { NextRequest, NextResponse } from 'next/server'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { lessonOperations, generationJobOperations } from '@/lib/db/helpers'
import { factChecker, type FactCheckResult } from '@/lib/ai/fact-checker'
import { inngest } from '@/lib/inngest/client'
import type { GenerationJobInsert } from '@/lib/types/database'

const FACT_CHECK_CREDITS = {
  basic: 1,
  thorough: 2,
  comprehensive: 3
}

// POST /api/generation/fact-check - Fact-check content
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const {
      content,
      contentId,
      contentType = 'lesson',
      checkDepth = 'thorough',
      includeContext = true,
      topic,
      autoCorrect = false
    } = body

    // Validate check depth
    if (!['basic', 'thorough', 'comprehensive'].includes(checkDepth)) {
      return NextResponse.json(
        { error: 'Invalid check depth' },
        { status: 400 }
      )
    }

    // Calculate credits needed
    const creditsNeeded = FACT_CHECK_CREDITS[checkDepth as keyof typeof FACT_CHECK_CREDITS]
    
    // Ensure user has credits
    const user = await requireCredits(creditsNeeded)

    // Get content if contentId provided
    let contentToCheck = content
    let metadata: {
      lessonId?: string
      lessonTitle?: string
      courseId?: string
    } = {}

    if (contentId && !content) {
      if (contentType === 'lesson') {
        const lesson = await lessonOperations.get(contentId)
        if (!lesson || lesson.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Content not found' },
            { status: 404 }
          )
        }
        contentToCheck = lesson.script || ''
        metadata = {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          courseId: lesson.course_id
        }
      }
    }

    if (!contentToCheck) {
      return NextResponse.json(
        { error: 'No content to fact-check' },
        { status: 400 }
      )
    }

    // Create generation job for tracking
    const job: GenerationJobInsert = {
      user_id: user.id,
      course_id: metadata.courseId,
      type: 'fact_check',
      status: 'processing',
      config: {
        contentType,
        contentId,
        checkDepth,
        includeContext,
        topic,
        autoCorrect,
        ...metadata
      },
      result: {}
    }

    const createdJob = await generationJobOperations.create(job)

    try {
      // Perform fact-checking
      const factCheckResult = await factChecker.checkContent(contentToCheck, {
        topic,
        checkDepth,
        includeContext
      })

      // Process auto-corrections if requested
      let correctedContent: string | undefined
      if (autoCorrect && factCheckResult.problematicClaims > 0) {
        correctedContent = await applyCorrections(
          contentToCheck,
          factCheckResult.results
        )
      }

      // Update job with results
      await generationJobOperations.update(createdJob.id, {
        status: 'completed',
        result: {
          ...factCheckResult,
          correctedContent
        },
        completed_at: new Date().toISOString()
      })

      // Deduct credits
      await deductCredits(user.clerk_id, creditsNeeded)

      // Send event for tracking
      await inngest.send({
        name: 'content.fact_checked',
        data: {
          contentId,
          contentType,
          userId: user.id,
          accuracy: factCheckResult.overallAccuracy,
          problematicClaims: factCheckResult.problematicClaims
        }
      })

      // Prepare response
      const response: any = {
        success: true,
        jobId: createdJob.id,
        ...factCheckResult,
        creditsUsed: creditsNeeded,
        creditsRemaining: user.credits_remaining - creditsNeeded
      }

      if (correctedContent) {
        response.correctedContent = correctedContent
        response.corrections = {
          applied: true,
          count: factCheckResult.problematicClaims
        }
      }

      return NextResponse.json(response)

    } catch (error) {
      // Update job as failed
      await generationJobOperations.update(createdJob.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Fact-checking failed',
        completed_at: new Date().toISOString()
      })
      throw error
    }

  } catch (error) {
    console.error('Fact-checking error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 402 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to fact-check content' },
      { status: 500 }
    )
  }
}

// GET /api/generation/fact-check - Get fact-check status or results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const contentId = searchParams.get('contentId')
    
    if (!jobId && !contentId) {
      return NextResponse.json(
        { error: 'Job ID or Content ID is required' },
        { status: 400 }
      )
    }

    // Ensure user is authenticated
    const user = await requireCredits(0)

    if (jobId) {
      // Get specific job
      const job = await generationJobOperations.get(jobId)
      
      if (!job || job.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      if (job.type !== 'fact_check') {
        return NextResponse.json(
          { error: 'Invalid job type' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        config: job.config,
        result: job.result,
        error: job.error_message
      })
    }

    if (contentId) {
      // Get all fact-check jobs for content
      const allUserJobs = await generationJobOperations.getUserJobs(user.id, 50)
      const factCheckJobs = allUserJobs.filter(
        j => j.type === 'fact_check' && 
        j.config.contentId === contentId
      )

      if (factCheckJobs.length === 0) {
        return NextResponse.json({
          message: 'No fact-checks found for this content',
          jobs: []
        })
      }

      // Sort by creation date (most recent first)
      factCheckJobs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Get the most recent completed job
      const latestCompleted = factCheckJobs.find(j => j.status === 'completed')

      return NextResponse.json({
        jobs: factCheckJobs.map(j => ({
          id: j.id,
          status: j.status,
          checkDepth: j.config.checkDepth,
          createdAt: j.created_at,
          completedAt: j.completed_at,
          accuracy: j.result?.overallAccuracy
        })),
        latest: latestCompleted ? {
          ...latestCompleted.result,
          jobId: latestCompleted.id,
          checkDepth: latestCompleted.config.checkDepth,
          completedAt: latestCompleted.completed_at
        } : null
      })
    }

  } catch (error) {
    console.error('Fact-check retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve fact-check results' },
      { status: 500 }
    )
  }
}

// DELETE /api/generation/fact-check - Clear fact-check history
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    
    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    // Ensure user is authenticated
    const user = await requireCredits(0)

    // Get all fact-check jobs for content
    const allUserJobs = await generationJobOperations.getUserJobs(user.id, 100)
    const factCheckJobs = allUserJobs.filter(
      j => j.type === 'fact_check' && 
      j.config.contentId === contentId
    )

    if (factCheckJobs.length === 0) {
      return NextResponse.json({
        message: 'No fact-check history to clear',
        deleted: 0
      })
    }

    // Delete jobs (mark as deleted in database)
    let deletedCount = 0
    for (const job of factCheckJobs) {
      try {
        await generationJobOperations.update(job.id, {
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete job ${job.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} fact-check records`,
      deleted: deletedCount
    })

  } catch (error) {
    console.error('Fact-check deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to clear fact-check history' },
      { status: 500 }
    )
  }
}

/**
 * Apply corrections to content based on fact-check results
 */
async function applyCorrections(
  content: string,
  results: FactCheckResult[]
): Promise<string> {
  let correctedContent = content

  // Process each problematic claim
  for (const result of results) {
    if (result.verdict === 'false' && result.corrections) {
      // Replace false claims with corrections
      const claim = result.claim
      const correction = result.corrections
      
      // Try to find and replace the claim in the content
      if (correctedContent.includes(claim)) {
        correctedContent = correctedContent.replace(claim, correction)
      } else {
        // If exact match not found, try partial match
        const claimWords = claim.split(' ').slice(0, 10).join(' ')
        if (correctedContent.includes(claimWords)) {
          // Add correction as a note
          correctedContent = correctedContent.replace(
            claimWords,
            `${claimWords} [Correction: ${correction}]`
          )
        }
      }
    } else if (result.verdict === 'misleading' && result.context) {
      // Add context for misleading claims
      const claim = result.claim
      if (correctedContent.includes(claim)) {
        correctedContent = correctedContent.replace(
          claim,
          `${claim} [Context: ${result.context}]`
        )
      }
    } else if (result.verdict === 'partially-true' && result.corrections) {
      // Add nuance for partially true claims
      const claim = result.claim
      if (correctedContent.includes(claim)) {
        correctedContent = correctedContent.replace(
          claim,
          `${claim} [Note: ${result.corrections}]`
        )
      }
    }
  }

  // Add fact-check summary at the end if significant changes were made
  if (correctedContent !== content) {
    const changedClaims = results.filter(r => 
      ['false', 'misleading', 'partially-true'].includes(r.verdict)
    ).length

    correctedContent += `\n\n---\n*This content has been fact-checked. ${changedClaims} claim(s) were corrected or clarified.*`
  }

  return correctedContent
}
