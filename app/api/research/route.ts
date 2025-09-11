import { NextRequest, NextResponse } from 'next/server'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { perplexityService } from '@/lib/ai/perplexity'
import { generationJobOperations } from '@/lib/db/helpers'
import type { GenerationJobInsert } from '@/lib/types/database'

const RESEARCH_CREDITS = 2
const FACT_CHECK_CREDITS = 1

// POST /api/research - Perform research on a topic
export async function POST(request: NextRequest) {
  try {
    // Ensure user exists and has credits
    const user = await requireCredits(RESEARCH_CREDITS)

    // Parse request body
    const body = await request.json()
    const { 
      topic,
      context = '',
      mode = 'pre_generation',
      courseId,
      lessonId
    } = body

    // Validate required fields
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    // Validate mode
    if (!['pre_generation', 'post_generation', 'fact_check'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid research mode' },
        { status: 400 }
      )
    }

    // Create a generation job for tracking
    const jobData: GenerationJobInsert = {
      user_id: user.id,
      course_id: courseId || null,
      type: 'research',
      status: 'processing',
      config: {
        topic,
        context,
        mode,
        lessonId
      },
      result: {}
    }

    const job = await generationJobOperations.create(jobData)

    try {
      // Perform research
      const research = await perplexityService.researchTopic(
        topic,
        context,
        mode as any
      )

      // Complete the job
      await generationJobOperations.completeJob(job.id, {
        content: research.findings,
        sources: research.sources,
        factChecks: research.factChecks,
        suggestions: research.suggestions
      })

      // Deduct credits
      await deductCredits(user.clerk_id, RESEARCH_CREDITS)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        research: {
          findings: research.findings,
          sources: research.sources,
          factChecks: research.factChecks,
          suggestions: research.suggestions
        },
        creditsUsed: RESEARCH_CREDITS,
        creditsRemaining: user.credits_remaining - RESEARCH_CREDITS
      })

    } catch (researchError) {
      // Mark job as failed
      await generationJobOperations.failJob(
        job.id,
        researchError instanceof Error ? researchError.message : 'Research failed'
      )
      throw researchError
    }

  } catch (error) {
    console.error('Research error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired: RESEARCH_CREDITS },
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
      { error: 'Failed to perform research' },
      { status: 500 }
    )
  }
}

// PUT /api/research - Enhance content with research
export async function PUT(request: NextRequest) {
  try {
    // Ensure user exists and has credits
    const user = await requireCredits(RESEARCH_CREDITS)

    // Parse request body
    const body = await request.json()
    const { 
      content,
      topic,
      enhancementType = 'research', // 'research' | 'citations' | 'fact_check'
      courseId,
      lessonId
    } = body

    // Validate required fields
    if (!content || !topic) {
      return NextResponse.json(
        { error: 'Content and topic are required' },
        { status: 400 }
      )
    }

    // Create a generation job for tracking
    const jobData: GenerationJobInsert = {
      user_id: user.id,
      course_id: courseId || null,
      type: 'content_enhancement',
      status: 'processing',
      config: {
        enhancementType,
        topic,
        lessonId
      },
      result: {}
    }

    const job = await generationJobOperations.create(jobData)

    try {
      let enhancedContent = content
      let sources: any[] = []
      let metadata: any = {}

      switch (enhancementType) {
        case 'research':
          // First, research the topic
          const research = await perplexityService.researchTopic(
            topic,
            content.substring(0, 1000), // Use first part of content as context
            'post_generation'
          )
          
          // Then enhance the content with research findings
          enhancedContent = await perplexityService.enhanceContent(
            content,
            research.findings
          )
          
          sources = research.sources
          metadata = {
            suggestionsApplied: research.suggestions?.length || 0,
            sourcesAdded: sources.length
          }
          break

        case 'fact_check':
          // Perform fact-checking
          const factCheckResult = await perplexityService.researchTopic(
            topic,
            content,
            'fact_check'
          )
          
          // Add fact-check annotations to content
          enhancedContent = addFactCheckAnnotations(content, factCheckResult.factChecks || [])
          sources = factCheckResult.sources
          metadata = {
            claimsChecked: factCheckResult.factChecks?.length || 0,
            accuracyScore: calculateAccuracyScore(factCheckResult.factChecks || [])
          }
          break

        case 'citations':
          // Research and add citations
          const citationResearch = await perplexityService.researchTopic(
            topic,
            '',
            'pre_generation'
          )
          
          // Add inline citations
          enhancedContent = addInlineCitations(content, citationResearch.sources)
          sources = citationResearch.sources
          metadata = {
            citationsAdded: sources.length
          }
          break

        default:
          throw new Error('Invalid enhancement type')
      }

      // Complete the job
      await generationJobOperations.completeJob(job.id, {
        originalContent: content,
        enhancedContent,
        sources,
        metadata
      })

      // Deduct credits
      await deductCredits(user.clerk_id, RESEARCH_CREDITS)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        enhancedContent,
        sources,
        metadata,
        creditsUsed: RESEARCH_CREDITS,
        creditsRemaining: user.credits_remaining - RESEARCH_CREDITS
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
    console.error('Content enhancement error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired: RESEARCH_CREDITS },
          { status: 402 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to enhance content' },
      { status: 500 }
    )
  }
}

// GET /api/research/sources - Get credible sources for a topic
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topic = searchParams.get('topic')
    const count = parseInt(searchParams.get('count') || '5')
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    // This endpoint doesn't require credits as it's a simple search
    const user = await requireCredits(0)

    // Search for sources
    const sources = await searchForSources(topic, count)

    return NextResponse.json({
      sources,
      count: sources.length
    })

  } catch (error) {
    console.error('Source search error:', error)
    return NextResponse.json(
      { error: 'Failed to search for sources' },
      { status: 500 }
    )
  }
}

// Helper functions
function addFactCheckAnnotations(
  content: string, 
  factChecks: Array<{
    claim: string
    verdict: string
    explanation: string
  }>
): string {
  let annotatedContent = content

  factChecks.forEach(check => {
    const claimIndex = content.toLowerCase().indexOf(check.claim.toLowerCase())
    if (claimIndex !== -1) {
      const annotation = ` [${check.verdict.toUpperCase()}: ${check.explanation}]`
      annotatedContent = 
        annotatedContent.slice(0, claimIndex + check.claim.length) +
        annotation +
        annotatedContent.slice(claimIndex + check.claim.length)
    }
  })

  return annotatedContent
}

function calculateAccuracyScore(
  factChecks: Array<{ verdict: string }>
): number {
  if (factChecks.length === 0) return 1

  const accurate = factChecks.filter(
    check => check.verdict === 'accurate'
  ).length
  
  return accurate / factChecks.length
}

function addInlineCitations(
  content: string,
  sources: Array<{ title: string; url: string }>
): string {
  let citedContent = content
  const citations: string[] = []

  // Add citations at the end of sentences that relate to sources
  sources.forEach((source, index) => {
    const citation = `[${index + 1}]`
    citations.push(`${citation} ${source.title}. ${source.url}`)
    
    // Simple heuristic: add citation after sentences containing key words from title
    const keywords = source.title.split(' ').filter(word => word.length > 4)
    const sentences = citedContent.split('. ')
    
    const updatedSentences = sentences.map(sentence => {
      const sentenceLower = sentence.toLowerCase()
      const hasKeyword = keywords.some(keyword => 
        sentenceLower.includes(keyword.toLowerCase())
      )
      
      if (hasKeyword && !sentence.includes('[')) {
        return `${sentence}${citation}`
      }
      return sentence
    })
    
    citedContent = updatedSentences.join('. ')
  })

  // Add bibliography at the end
  if (citations.length > 0) {
    citedContent += '\n\nReferences:\n' + citations.join('\n')
  }

  return citedContent
}

async function searchForSources(
  topic: string,
  count: number
): Promise<Array<{
  title: string
  url: string
  snippet: string
  credibility: 'high' | 'medium' | 'low'
}>> {
  // Simulate source search - in production, use actual search API
  // This would integrate with academic databases, Google Scholar, etc.
  
  const mockSources = [
    {
      title: `Comprehensive Guide to ${topic}`,
      url: `https://academic.example.edu/${topic.replace(/\s+/g, '-')}`,
      snippet: `An in-depth exploration of ${topic} covering fundamental concepts and recent developments...`,
      credibility: 'high' as const
    },
    {
      title: `${topic}: Current Research and Trends`,
      url: `https://journal.example.org/articles/${topic.replace(/\s+/g, '-')}`,
      snippet: `Recent studies have shown significant advances in ${topic}, particularly in practical applications...`,
      credibility: 'high' as const
    },
    {
      title: `Understanding ${topic} - Expert Perspectives`,
      url: `https://expert.example.com/${topic.replace(/\s+/g, '-')}`,
      snippet: `Industry experts discuss the importance of ${topic} and its impact on modern practices...`,
      credibility: 'medium' as const
    }
  ]

  return mockSources.slice(0, count)
}
