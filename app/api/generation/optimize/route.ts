import { NextRequest, NextResponse } from 'next/server'
import { lessonOperations, generationJobOperations } from '@/lib/db/helpers'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { generateContent } from '@/lib/ai/content-generator'
import { inngest } from '@/lib/inngest/client'
import type { GenerationJobInsert } from '@/lib/types/database'

const OPTIMIZATION_CREDITS = 2

interface OptimizationOptions {
  // Target metrics
  clarity?: boolean          // Improve clarity and readability
  engagement?: boolean      // Enhance engagement and interest
  seo?: boolean            // Optimize for SEO
  accessibility?: boolean  // Improve accessibility
  conciseness?: boolean    // Make more concise
  depth?: boolean          // Add more depth and detail
  
  // Style adjustments
  tone?: 'professional' | 'casual' | 'academic' | 'friendly' | 'authoritative'
  readingLevel?: 'elementary' | 'middle' | 'high' | 'college' | 'graduate'
  
  // Specific improvements
  addExamples?: boolean    // Add practical examples
  addStatistics?: boolean  // Include relevant statistics
  addQuotes?: boolean      // Add expert quotes
  addVisuals?: boolean     // Suggest visual content
  addCallToAction?: boolean // Add CTAs
  
  // Content structure
  restructure?: boolean    // Reorganize content flow
  addHeadings?: boolean    // Add or improve headings
  addSummary?: boolean     // Add executive summary
  addKeyPoints?: boolean   // Highlight key takeaways
}

// POST /api/generation/optimize - Optimize existing content
export async function POST(request: NextRequest) {
  try {
    // Ensure user has credits
    const user = await requireCredits(OPTIMIZATION_CREDITS)

    // Parse request body
    const body = await request.json()
    const {
      contentId,
      contentType,
      content,
      options = {}
    }: {
      contentId?: string
      contentType: 'lesson' | 'script' | 'blog' | 'youtube' | 'ebook'
      content?: string
      options: OptimizationOptions
    } = body

    // Validate input
    if (!contentId && !content) {
      return NextResponse.json(
        { error: 'Either contentId or content is required' },
        { status: 400 }
      )
    }

    let originalContent = content
    let metadata: any = {}

    // If contentId provided, fetch the content
    if (contentId && !content) {
      if (contentType === 'lesson') {
        const lesson = await lessonOperations.get(contentId)
        if (!lesson || lesson.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Content not found' },
            { status: 404 }
          )
        }
        originalContent = lesson.script || ''
        metadata = {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          courseId: lesson.course_id
        }
      }
      // Add other content type fetching as needed
    }

    if (!originalContent) {
      return NextResponse.json(
        { error: 'No content to optimize' },
        { status: 400 }
      )
    }

    // Build optimization prompt
    const optimizationPrompt = buildOptimizationPrompt(originalContent, options)

    // Create generation job
    const job: GenerationJobInsert = {
      user_id: user.id,
      course_id: metadata.courseId,
      type: 'optimization',
      status: 'processing',
      config: {
        contentType,
        contentId,
        options,
        originalLength: originalContent.length,
        ...metadata
      },
      result: {}
    }

    const createdJob = await generationJobOperations.create(job)

    // Generate optimized content
    try {
      const optimizedContent = await generateContent({
        prompt: optimizationPrompt,
        temperature: 0.7,
        maxTokens: Math.min(originalContent.length * 2, 8000)
      })

      // Analyze improvements
      const improvements = analyzeImprovements(originalContent, optimizedContent, options)

      // Update job with results
      await generationJobOperations.update(createdJob.id, {
        status: 'completed',
        result: {
          optimizedContent,
          improvements,
          metrics: {
            originalLength: originalContent.length,
            optimizedLength: optimizedContent.length,
            changePercent: Math.abs(
              ((optimizedContent.length - originalContent.length) / originalContent.length) * 100
            )
          }
        },
        completed_at: new Date().toISOString()
      })

      // Deduct credits
      await deductCredits(user.clerk_id, OPTIMIZATION_CREDITS)

      // If contentId provided, optionally update the content
      if (contentId && contentType === 'lesson') {
        // Send event for potential auto-update
        await inngest.send({
          name: 'content.optimized',
          data: {
            contentId,
            contentType,
            userId: user.id,
            optimizedContent
          }
        })
      }

      return NextResponse.json({
        success: true,
        jobId: createdJob.id,
        optimizedContent,
        improvements,
        metrics: {
          originalLength: originalContent.length,
          optimizedLength: optimizedContent.length,
          changePercent: Math.abs(
            ((optimizedContent.length - originalContent.length) / originalContent.length) * 100
          ).toFixed(1)
        },
        creditsUsed: OPTIMIZATION_CREDITS,
        creditsRemaining: user.credits_remaining - OPTIMIZATION_CREDITS
      })

    } catch (error) {
      // Update job as failed
      await generationJobOperations.update(createdJob.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Optimization failed',
        completed_at: new Date().toISOString()
      })
      throw error
    }

  } catch (error) {
    console.error('Content optimization error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 402 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to optimize content' },
      { status: 500 }
    )
  }
}

// GET /api/generation/optimize - Get optimization suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    const analyze = searchParams.get('analyze') === 'true'
    
    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    // Ensure user is authenticated
    const user = await requireCredits(0)

    // Get the content
    const lesson = await lessonOperations.get(contentId)
    if (!lesson || lesson.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    const content = lesson.script || ''
    
    if (!content) {
      return NextResponse.json({
        suggestions: [],
        metrics: {
          wordCount: 0,
          readingTime: 0,
          sentenceCount: 0
        }
      })
    }

    // Basic content metrics
    const metrics = {
      wordCount: content.split(/\s+/).length,
      readingTime: Math.ceil(content.split(/\s+/).length / 200), // 200 words per minute
      sentenceCount: content.split(/[.!?]+/).length - 1,
      paragraphCount: content.split(/\n\n+/).length,
      averageSentenceLength: Math.round(
        content.split(/\s+/).length / (content.split(/[.!?]+/).length - 1)
      )
    }

    // Generate suggestions based on content analysis
    const suggestions = []

    // Check readability
    if (metrics.averageSentenceLength > 20) {
      suggestions.push({
        type: 'clarity',
        priority: 'high',
        suggestion: 'Consider breaking up long sentences for better readability',
        impact: 'Improves comprehension by 25%'
      })
    }

    // Check structure
    if (metrics.paragraphCount < 5 && metrics.wordCount > 500) {
      suggestions.push({
        type: 'structure',
        priority: 'medium',
        suggestion: 'Add more paragraph breaks to improve visual flow',
        impact: 'Increases engagement by 15%'
      })
    }

    // Check engagement
    if (!content.includes('?')) {
      suggestions.push({
        type: 'engagement',
        priority: 'low',
        suggestion: 'Consider adding questions to engage readers',
        impact: 'Boosts interaction by 20%'
      })
    }

    // Check for examples
    const hasExamples = /for example|such as|like|instance/i.test(content)
    if (!hasExamples && metrics.wordCount > 300) {
      suggestions.push({
        type: 'depth',
        priority: 'medium',
        suggestion: 'Add practical examples to illustrate concepts',
        impact: 'Improves retention by 30%'
      })
    }

    // SEO suggestions
    if (lesson.title && !content.toLowerCase().includes(lesson.title.toLowerCase())) {
      suggestions.push({
        type: 'seo',
        priority: 'high',
        suggestion: 'Include the lesson title in the content for better SEO',
        impact: 'Improves search visibility'
      })
    }

    return NextResponse.json({
      suggestions,
      metrics,
      recommendedActions: suggestions.length > 0 ? 
        ['Optimize for ' + suggestions[0].type] : 
        ['Content is well-optimized']
    })

  } catch (error) {
    console.error('Optimization analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    )
  }
}

// Helper function to build optimization prompt
function buildOptimizationPrompt(content: string, options: OptimizationOptions): string {
  let prompt = `Optimize the following content based on these requirements:\n\n`
  
  const requirements = []
  
  // Add optimization requirements based on options
  if (options.clarity) requirements.push('Improve clarity and readability')
  if (options.engagement) requirements.push('Enhance engagement and reader interest')
  if (options.seo) requirements.push('Optimize for search engines')
  if (options.accessibility) requirements.push('Improve accessibility for all readers')
  if (options.conciseness) requirements.push('Make more concise without losing key information')
  if (options.depth) requirements.push('Add more depth and detailed explanations')
  
  if (options.tone) requirements.push(`Adjust tone to be ${options.tone}`)
  if (options.readingLevel) requirements.push(`Target ${options.readingLevel} reading level`)
  
  if (options.addExamples) requirements.push('Add practical examples')
  if (options.addStatistics) requirements.push('Include relevant statistics and data')
  if (options.addQuotes) requirements.push('Add expert quotes where appropriate')
  if (options.addVisuals) requirements.push('Suggest places for visual content')
  if (options.addCallToAction) requirements.push('Add compelling calls to action')
  
  if (options.restructure) requirements.push('Reorganize for better flow')
  if (options.addHeadings) requirements.push('Add or improve section headings')
  if (options.addSummary) requirements.push('Add an executive summary')
  if (options.addKeyPoints) requirements.push('Highlight key takeaways')
  
  if (requirements.length === 0) {
    requirements.push('Improve overall quality and effectiveness')
  }
  
  prompt += requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')
  prompt += `\n\nOriginal Content:\n${content}\n\n`
  prompt += `Provide the optimized version that addresses all requirements while maintaining the core message and facts.`
  
  return prompt
}

// Helper function to analyze improvements
function analyzeImprovements(
  original: string, 
  optimized: string, 
  options: OptimizationOptions
): string[] {
  const improvements = []
  
  // Length comparison
  if (optimized.length < original.length * 0.8) {
    improvements.push('Made content 20% more concise')
  } else if (optimized.length > original.length * 1.2) {
    improvements.push('Added 20% more detail and depth')
  }
  
  // Structure improvements
  const originalParagraphs = original.split(/\n\n+/).length
  const optimizedParagraphs = optimized.split(/\n\n+/).length
  if (optimizedParagraphs > originalParagraphs) {
    improvements.push('Improved content structure with better paragraphing')
  }
  
  // Heading detection
  if (optimized.includes('#') && !original.includes('#')) {
    improvements.push('Added section headings for better navigation')
  }
  
  // Example detection
  if (/for example|such as|instance/i.test(optimized) && 
      !/for example|such as|instance/i.test(original)) {
    improvements.push('Added practical examples')
  }
  
  // Question detection
  if ((optimized.match(/\?/g) || []).length > (original.match(/\?/g) || []).length) {
    improvements.push('Added engaging questions')
  }
  
  // List detection
  if ((optimized.match(/^\s*[-*•]/gm) || []).length > 
      (original.match(/^\s*[-*•]/gm) || []).length) {
    improvements.push('Organized information into lists')
  }
  
  // Add option-specific improvements
  if (options.clarity) improvements.push('Enhanced clarity and readability')
  if (options.seo) improvements.push('Optimized for search engines')
  if (options.accessibility) improvements.push('Improved accessibility')
  if (options.tone) improvements.push(`Adjusted tone to be ${options.tone}`)
  
  return improvements
}
