import { NextRequest, NextResponse } from 'next/server'
import { 
  lessonOperations, 
  courseOperations, 
  generationJobOperations, 
  contentVariationOperations,
  contentVersionOperations
} from '@/lib/db/helpers'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { bedrockService } from '@/lib/ai/bedrock'
import type { GenerationJobInsert, ContentVariationInsert } from '@/lib/types/database'

const VARIATION_CREDITS = 4

// POST /api/generation/content-variation - Generate a single content variation
export async function POST(request: NextRequest) {
  let jobId: string | undefined

  try {
    const user = await requireCredits(VARIATION_CREDITS)

    const body = await request.json()
    const {
      lessonId,
      variationType, // 'youtube_script' | 'blog_post' | 'ebook_chapter'
      options = {}
    } = body

    if (!lessonId || !variationType) {
      return NextResponse.json({ error: 'Lesson ID and variation type are required' }, { status: 400 })
    }

    const lesson = await lessonOperations.getById(lessonId)
    const course = await courseOperations.getById(lesson.course_id)

    if (course.user_id !== user.id) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    if (!lesson.script) {
      return NextResponse.json({ error: 'Lesson must have a script to generate variations' }, { status: 400 })
    }

    // Create a generation job
    const jobData: GenerationJobInsert = {
      user_id: user.id,
      course_id: course.id,
      type: 'content_variation',
      status: 'pending',
      config: {
        lessonId,
        variationType,
        options
      },
      result: {}
    }

    const job = await generationJobOperations.create(jobData)
    jobId = job.id
    await generationJobOperations.startJob(job.id)

    try {
      let variationContent = ''
      let metadata: any = {}

      switch (variationType) {
        case 'youtube_script': {
          const res = await bedrockService.generateYouTubeScript(
            lesson.title,
            lesson.objectives,
            options.duration || 10,
            { temperature: options.temperature || 0.8 }
          )
          variationContent = `# ${res.title}\n\n## Hook (0:00 - 0:15)\n${res.hook}\n\n## Main Content\n${res.mainContent}\n\n## Call to Action\n${res.callToAction}\n\n## Tags\n${res.tags.join(', ')}\n`
          metadata = {
            title: res.title,
            tags: res.tags,
            thumbnailPrompt: res.thumbnailPrompt,
            duration: options.duration || 10
          }
          break
        }
        case 'blog_post': {
          const res = await bedrockService.generateBlogPost(
            lesson.title,
            lesson.objectives,
            options.seoKeywords || [],
            { temperature: options.temperature || 0.7 }
          )
          variationContent = res.content
          metadata = {
            title: res.title,
            metaDescription: res.metaDescription,
            tags: res.tags,
            imagePrompts: res.imagePrompts
          }
          break
        }
        case 'ebook_chapter': {
          const res = await bedrockService.generateEbookChapter(
            lesson.title,
            lesson.objectives,
            options.previousContext || '',
            { temperature: options.temperature || 0.7 }
          )
          variationContent = res.content
          metadata = {
            title: res.title,
            keyTakeaways: res.keyTakeaways,
            exercises: res.exercises
          }
          break
        }
        default:
          return NextResponse.json({ error: 'Invalid variation type' }, { status: 400 })
      }

      // Save variation
      const variationPayload: ContentVariationInsert = {
        lesson_id: lessonId,
        type: variationType,
        content: variationContent,
        metadata
      }
      const variation = await contentVariationOperations.create(variationPayload)

      // Create initial version record
      await contentVersionOperations.create({
        content_type: variationType,
        content_id: variation.id,
        version_number: 1,
        content: { content: variationContent, metadata },
        changes_made: 'Initial generation',
        is_humanized: false,
        ai_detection_score: null,
        created_by: user.id
      } as any)

      // Complete job and deduct credits
      await generationJobOperations.completeJob(job.id, { variationId: variation.id, content: variationContent, metadata })
      await deductCredits(user.clerk_id, VARIATION_CREDITS)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        variation: {
          id: variation.id,
          type: variationType,
          content: variationContent,
          metadata
        },
        creditsUsed: VARIATION_CREDITS,
        creditsRemaining: user.credits_remaining - VARIATION_CREDITS
      })

    } catch (generationError) {
      await generationJobOperations.failJob(job.id, generationError instanceof Error ? generationError.message : 'Generation failed')
      throw generationError
    }

  } catch (error) {
    console.error('Error generating content variation:', error)
    if (error instanceof Error && error.message === 'Insufficient credits') {
      return NextResponse.json({ error: 'Insufficient credits', creditsRequired: VARIATION_CREDITS }, { status: 402 })
    }
    return NextResponse.json({ error: 'Failed to generate content variation', jobId }, { status: 500 })
  }
}

