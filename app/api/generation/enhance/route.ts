import { NextRequest, NextResponse } from 'next/server'
import { lessonOperations, contentVariationOperations, generationJobOperations } from '@/lib/db/helpers'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { bedrockService } from '@/lib/ai/bedrock'
import { perplexityService } from '@/lib/ai/perplexity'
import type { GenerationJobInsert, ContentVariationInsert } from '@/lib/types/database'

const ENHANCEMENT_CREDITS = 3
const VARIATION_CREDITS = 4

// POST /api/generation/enhance - Enhance existing content
export async function POST(request: NextRequest) {
  let jobId: string | undefined

  try {
    // Ensure user exists and has credits
    const user = await requireCredits(ENHANCEMENT_CREDITS)

    // Parse request body
    const body = await request.json()
    const { 
      lessonId,
      content,
      enhancementType, // 'humanize' | 'research' | 'simplify' | 'expand'
      options = {}
    } = body

    // Validate required fields
    if (!content || !enhancementType) {
      return NextResponse.json(
        { error: 'Content and enhancement type are required' },
        { status: 400 }
      )
    }

    // If lessonId provided, verify ownership
    let lesson = null
    if (lessonId) {
      lesson = await lessonOperations.getById(lessonId)
      // Verify ownership through course
      // This is simplified - in production, add proper ownership check
    }

    // Create a generation job
    const jobData: GenerationJobInsert = {
      user_id: user.id,
      course_id: null,
      type: 'content_enhancement',
      status: 'pending',
      config: {
        lessonId,
        enhancementType,
        options
      },
      result: {}
    }

    const job = await generationJobOperations.create(jobData)
    jobId = job.id

    // Start the job
    await generationJobOperations.startJob(job.id)

    try {
      let enhancedContent = content
      let metadata: any = {}

      switch (enhancementType) {
        case 'humanize':
          enhancedContent = await bedrockService.humanizeContent(
            content,
            options.contentType || 'script',
            options.level || 'moderate',
            {
              temperature: options.temperature || 0.9
            }
          )
          metadata = {
            type: 'humanization',
            level: options.level || 'moderate',
            originalLength: content.length,
            enhancedLength: enhancedContent.length
          }
          break

        case 'research':
          // Get research on the topic
          const topic = options.topic || (lesson ? lesson.title : 'General topic')
          const research = await perplexityService.researchTopic(
            topic,
            content.substring(0, 500),
            'post_generation'
          )
          
          // Enhance content with research
          enhancedContent = await perplexityService.enhanceContent(
            content,
            research.findings
          )
          
          metadata = {
            type: 'research_enhancement',
            sources: research.sources,
            factsAdded: research.suggestions?.length || 0
          }
          break

        case 'simplify':
          // Simplify content for better understanding
          enhancedContent = await simplifyContent(content, options)
          metadata = {
            type: 'simplification',
            readingLevel: options.targetLevel || 'intermediate',
            originalComplexity: analyzeComplexity(content),
            simplifiedComplexity: analyzeComplexity(enhancedContent)
          }
          break

        case 'expand':
          // Expand content with more details
          enhancedContent = await expandContent(content, options)
          metadata = {
            type: 'expansion',
            originalWords: content.split(/\s+/).length,
            expandedWords: enhancedContent.split(/\s+/).length,
            expansionRatio: enhancedContent.length / content.length
          }
          break

        default:
          throw new Error('Invalid enhancement type')
      }

      // Update lesson if provided
      if (lessonId && lesson) {
        await lessonOperations.update(lessonId, {
          script: enhancedContent
        })
      }

      // Complete the job
      await generationJobOperations.completeJob(job.id, {
        originalContent: content,
        enhancedContent,
        metadata
      })

      // Deduct credits
      await deductCredits(user.clerk_id, ENHANCEMENT_CREDITS)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        enhancedContent,
        metadata,
        creditsUsed: ENHANCEMENT_CREDITS,
        creditsRemaining: user.credits_remaining - ENHANCEMENT_CREDITS
      })

    } catch (enhancementError) {
      // Mark job as failed
      await generationJobOperations.failJob(
        job.id, 
        enhancementError instanceof Error ? enhancementError.message : 'Enhancement failed'
      )
      throw enhancementError
    }

  } catch (error) {
    console.error('Error enhancing content:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired: ENHANCEMENT_CREDITS },
          { status: 402 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to enhance content',
        jobId,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/generation/enhance - Generate content variations
export async function PUT(request: NextRequest) {
  let jobId: string | undefined

  try {
    // Ensure user exists and has credits
    const user = await requireCredits(VARIATION_CREDITS)

    // Parse request body
    const body = await request.json()
    const { 
      lessonId,
      variationType, // 'youtube_script' | 'blog_post' | 'ebook_chapter'
      options = {}
    } = body

    // Validate required fields
    if (!lessonId || !variationType) {
      return NextResponse.json(
        { error: 'Lesson ID and variation type are required' },
        { status: 400 }
      )
    }

    // Get the lesson
    const lesson = await lessonOperations.getById(lessonId)
    
    if (!lesson.script) {
      return NextResponse.json(
        { error: 'Lesson must have a script to generate variations' },
        { status: 400 }
      )
    }

    // Create a generation job
    const jobData: GenerationJobInsert = {
      user_id: user.id,
      course_id: lesson.course_id,
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

    // Start the job
    await generationJobOperations.startJob(job.id)

    try {
      let variationContent = ''
      let metadata: any = {}

      switch (variationType) {
        case 'youtube_script':
          const youtubeResult = await bedrockService.generateYouTubeScript(
            lesson.title,
            lesson.objectives,
            options.duration || 10,
            {
              temperature: options.temperature || 0.8
            }
          )
          
          variationContent = formatYouTubeScript(youtubeResult)
          metadata = {
            title: youtubeResult.title,
            tags: youtubeResult.tags,
            thumbnailPrompt: youtubeResult.thumbnailPrompt,
            duration: options.duration || 10
          }
          break

        case 'blog_post':
          const blogResult = await bedrockService.generateBlogPost(
            lesson.title,
            lesson.objectives,
            options.seoKeywords || [],
            {
              temperature: options.temperature || 0.7
            }
          )
          
          variationContent = blogResult.content
          metadata = {
            title: blogResult.title,
            metaDescription: blogResult.metaDescription,
            tags: blogResult.tags,
            imagePrompts: blogResult.imagePrompts
          }
          break

        case 'ebook_chapter':
          const ebookResult = await bedrockService.generateEbookChapter(
            lesson.title,
            lesson.objectives,
            options.previousContext || '',
            {
              temperature: options.temperature || 0.7
            }
          )
          
          variationContent = ebookResult.content
          metadata = {
            title: ebookResult.title,
            keyTakeaways: ebookResult.keyTakeaways,
            exercises: ebookResult.exercises
          }
          break

        default:
          throw new Error('Invalid variation type')
      }

      // Save content variation
      const variationData: ContentVariationInsert = {
        lesson_id: lessonId,
        type: variationType as any,
        content: variationContent,
        metadata
      }

      const variation = await contentVariationOperations.create(variationData)

      // Complete the job
      await generationJobOperations.completeJob(job.id, {
        variationId: variation.id,
        content: variationContent,
        metadata
      })

      // Deduct credits
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
      // Mark job as failed
      await generationJobOperations.failJob(
        job.id, 
        generationError instanceof Error ? generationError.message : 'Generation failed'
      )
      throw generationError
    }

  } catch (error) {
    console.error('Error generating variation:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired: VARIATION_CREDITS },
          { status: 402 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate variation',
        jobId,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions
async function simplifyContent(content: string, options: any): Promise<string> {
  const prompt = `Simplify this content for ${options.targetLevel || 'intermediate'} level readers:

${content}

Guidelines:
1. Use simpler vocabulary
2. Shorten complex sentences
3. Add explanations for technical terms
4. Maintain all key information
5. Keep the same structure and flow`

  const response = await bedrockService.generateLectureScript(
    {
      lectureTitle: 'Simplified Content',
      objectives: [],
      introduction: '',
      mainContent: [],
      summary: content
    },
    5,
    'simple',
    { temperature: 0.7 }
  )

  return response
}

async function expandContent(content: string, options: any): Promise<string> {
  const prompt = `Expand this content with more details, examples, and explanations:

${content}

Guidelines:
1. Add relevant examples
2. Include more detailed explanations
3. Provide additional context
4. Add transitional phrases
5. Maintain the original structure
Target expansion: ${options.expansionFactor || 1.5}x the original length`

  const response = await bedrockService.generateLectureScript(
    {
      lectureTitle: 'Expanded Content',
      objectives: [],
      introduction: '',
      mainContent: [],
      summary: content
    },
    15,
    'detailed',
    { temperature: 0.8 }
  )

  return response
}

function analyzeComplexity(content: string): {
  avgSentenceLength: number
  avgWordLength: number
  complexityScore: number
} {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim())
  const words = content.split(/\s+/).filter(w => w.length > 0)
  
  const avgSentenceLength = sentences.length > 0 
    ? words.length / sentences.length 
    : 0
    
  const avgWordLength = words.length > 0
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length
    : 0

  // Simple complexity score (0-100)
  const complexityScore = Math.min(
    100,
    (avgSentenceLength * 2) + (avgWordLength * 10)
  )

  return {
    avgSentenceLength,
    avgWordLength,
    complexityScore
  }
}

function formatYouTubeScript(result: any): string {
  return `# ${result.title}

## Hook (0:00 - 0:15)
${result.hook}

## Main Content
${result.mainContent}

## Call to Action
${result.callToAction}

## Tags
${result.tags.join(', ')}
`
}
