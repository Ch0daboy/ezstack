import { PerplexityService } from './perplexity'

export interface FactCheckResult {
  claim: string
  verdict: 'true' | 'false' | 'partially-true' | 'unverifiable' | 'misleading'
  confidence: number // 0-1
  evidence: string[]
  sources: Array<{
    title: string
    url: string
    credibility: number // 0-1
    excerpt: string
  }>
  corrections?: string
  context?: string
}

export interface ContentFactCheck {
  overallAccuracy: number // 0-100
  totalClaims: number
  verifiedClaims: number
  problematicClaims: number
  results: FactCheckResult[]
  summary: string
  suggestions: string[]
}

export class FactChecker {
  private perplexity: PerplexityService

  constructor(apiKey?: string) {
    this.perplexity = new PerplexityService(apiKey)
  }

  /**
   * Fact-check an entire piece of content
   */
  async checkContent(content: string, options?: {
    topic?: string
    checkDepth?: 'basic' | 'thorough' | 'comprehensive'
    includeContext?: boolean
  }): Promise<ContentFactCheck> {
    const checkDepth = options?.checkDepth || 'thorough'
    
    // Extract claims from content
    const claims = await this.extractClaims(content, checkDepth)
    
    // Fact-check each claim
    const results: FactCheckResult[] = []
    for (const claim of claims) {
      const result = await this.checkClaim(claim, {
        topic: options?.topic,
        includeContext: options?.includeContext
      })
      results.push(result)
    }

    // Calculate metrics
    const verifiedClaims = results.filter(r => 
      r.verdict === 'true' && r.confidence > 0.7
    ).length
    
    const problematicClaims = results.filter(r => 
      ['false', 'misleading'].includes(r.verdict) || 
      (r.verdict === 'partially-true' && r.confidence > 0.7)
    ).length

    const overallAccuracy = results.length > 0 
      ? Math.round((verifiedClaims / results.length) * 100)
      : 100

    // Generate summary and suggestions
    const summary = this.generateSummary(results)
    const suggestions = this.generateSuggestions(results)

    return {
      overallAccuracy,
      totalClaims: claims.length,
      verifiedClaims,
      problematicClaims,
      results,
      summary,
      suggestions
    }
  }

  /**
   * Check a single claim
   */
  async checkClaim(claim: string, options?: {
    topic?: string
    includeContext?: boolean
  }): Promise<FactCheckResult> {
    try {
      // Research the claim
      const research = await this.perplexity.search({
        query: `fact check: ${claim}`,
        maxResults: 5,
        includeImages: false
      })

      // Analyze evidence
      const analysis = await this.analyzeEvidence(claim, research.results)
      
      // Get additional context if requested
      let context: string | undefined
      if (options?.includeContext) {
        context = await this.getClaimContext(claim, options.topic)
      }

      return {
        claim,
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        evidence: analysis.evidence,
        sources: research.results.map(r => ({
          title: r.title,
          url: r.url,
          credibility: this.assessSourceCredibility(r.url),
          excerpt: r.snippet
        })),
        corrections: analysis.corrections,
        context
      }
    } catch (error) {
      console.error('Fact-check error:', error)
      return {
        claim,
        verdict: 'unverifiable',
        confidence: 0,
        evidence: [],
        sources: [],
        corrections: 'Unable to verify this claim at this time'
      }
    }
  }

  /**
   * Extract factual claims from content
   */
  private async extractClaims(content: string, depth: string): Promise<string[]> {
    // Split content into sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || []
    
    // Filter for factual claims based on depth
    const claims: string[] = []
    const factualPatterns = [
      /\d+%/,  // Percentages
      /\$[\d,]+/,  // Money amounts
      /\d{4}/,  // Years
      /according to/i,
      /research shows/i,
      /studies indicate/i,
      /data suggests/i,
      /statistics show/i,
      /survey found/i,
      /report states/i,
      /is|are|was|were.*\d+/,  // Numerical facts
      /increase|decrease|grew|fell.*\d+/,  // Trends with numbers
    ]

    for (const sentence of sentences) {
      const trimmed = sentence.trim()
      
      // Check if sentence contains factual indicators
      const containsFactualIndicator = factualPatterns.some(pattern => 
        pattern.test(trimmed)
      )

      if (containsFactualIndicator) {
        claims.push(trimmed)
      } else if (depth === 'comprehensive') {
        // In comprehensive mode, check more sentences
        if (this.looksLikeFactualClaim(trimmed)) {
          claims.push(trimmed)
        }
      }
    }

    // Limit claims based on depth
    const limits = {
      basic: 5,
      thorough: 15,
      comprehensive: 30
    }

    return claims.slice(0, limits[depth as keyof typeof limits] || 15)
  }

  /**
   * Check if a sentence looks like a factual claim
   */
  private looksLikeFactualClaim(sentence: string): boolean {
    // Avoid questions and commands
    if (sentence.includes('?') || sentence.startsWith('Please') || sentence.startsWith('Let')) {
      return false
    }

    // Look for definitive statements
    const definitiveWords = [
      'is', 'are', 'was', 'were', 'has', 'have', 'had',
      'will', 'would', 'should', 'must', 'can', 'cannot',
      'always', 'never', 'every', 'all', 'none', 'most'
    ]

    const words = sentence.toLowerCase().split(/\s+/)
    return definitiveWords.some(word => words.includes(word))
  }

  /**
   * Analyze evidence to determine verdict
   */
  private async analyzeEvidence(claim: string, sources: any[]): Promise<{
    verdict: FactCheckResult['verdict']
    confidence: number
    evidence: string[]
    corrections?: string
  }> {
    if (sources.length === 0) {
      return {
        verdict: 'unverifiable',
        confidence: 0,
        evidence: []
      }
    }

    // Analyze source agreement
    const supporting = sources.filter(s => 
      s.snippet.toLowerCase().includes('true') ||
      s.snippet.toLowerCase().includes('correct') ||
      s.snippet.toLowerCase().includes('confirmed')
    ).length

    const contradicting = sources.filter(s => 
      s.snippet.toLowerCase().includes('false') ||
      s.snippet.toLowerCase().includes('incorrect') ||
      s.snippet.toLowerCase().includes('myth') ||
      s.snippet.toLowerCase().includes('debunked')
    ).length

    const partial = sources.filter(s => 
      s.snippet.toLowerCase().includes('partially') ||
      s.snippet.toLowerCase().includes('partly') ||
      s.snippet.toLowerCase().includes('somewhat')
    ).length

    // Determine verdict based on evidence
    let verdict: FactCheckResult['verdict']
    let confidence: number
    let corrections: string | undefined

    if (contradicting > supporting && contradicting >= 2) {
      verdict = 'false'
      confidence = contradicting / sources.length
      corrections = this.extractCorrection(sources)
    } else if (supporting > contradicting && supporting >= 2) {
      verdict = 'true'
      confidence = supporting / sources.length
    } else if (partial >= 2 || (partial > 0 && supporting > 0)) {
      verdict = 'partially-true'
      confidence = 0.5 + (partial / sources.length) * 0.3
      corrections = this.extractNuance(sources)
    } else if (sources.some(s => s.snippet.toLowerCase().includes('misleading'))) {
      verdict = 'misleading'
      confidence = 0.7
      corrections = this.extractContext(sources)
    } else {
      verdict = 'unverifiable'
      confidence = 0.3
    }

    // Extract evidence snippets
    const evidence = sources
      .slice(0, 3)
      .map(s => s.snippet)
      .filter(Boolean)

    return {
      verdict,
      confidence,
      evidence,
      corrections
    }
  }

  /**
   * Extract correction from sources
   */
  private extractCorrection(sources: any[]): string {
    const correctionSource = sources.find(s => 
      s.snippet.toLowerCase().includes('actually') ||
      s.snippet.toLowerCase().includes('correct') ||
      s.snippet.toLowerCase().includes('fact')
    )
    
    if (correctionSource) {
      return correctionSource.snippet
    }
    
    return 'This claim appears to be incorrect based on available evidence.'
  }

  /**
   * Extract nuanced information
   */
  private extractNuance(sources: any[]): string {
    const nuanceSource = sources.find(s => 
      s.snippet.toLowerCase().includes('however') ||
      s.snippet.toLowerCase().includes('but') ||
      s.snippet.toLowerCase().includes('although')
    )
    
    if (nuanceSource) {
      return nuanceSource.snippet
    }
    
    return 'This claim requires additional context or qualification.'
  }

  /**
   * Extract contextual information
   */
  private extractContext(sources: any[]): string {
    const contextSource = sources.find(s => 
      s.snippet.toLowerCase().includes('context') ||
      s.snippet.toLowerCase().includes('misleading') ||
      s.snippet.toLowerCase().includes('important')
    )
    
    if (contextSource) {
      return contextSource.snippet
    }
    
    return 'This claim may be misleading without proper context.'
  }

  /**
   * Assess source credibility
   */
  private assessSourceCredibility(url: string): number {
    const domain = new URL(url).hostname.toLowerCase()
    
    // High credibility sources
    const highCredibility = [
      'gov', 'edu', 'org',
      'reuters.com', 'apnews.com', 'bbc.com', 'npr.org',
      'nature.com', 'science.org', 'nejm.org', 'thelancet.com',
      'who.int', 'cdc.gov', 'nih.gov', 'fda.gov'
    ]
    
    // Medium credibility sources
    const mediumCredibility = [
      'wikipedia.org', 'britannica.com',
      'nytimes.com', 'washingtonpost.com', 'wsj.com',
      'economist.com', 'ft.com', 'bloomberg.com'
    ]
    
    // Low credibility indicators
    const lowCredibility = [
      'blog', 'wordpress', 'medium.com', 'substack',
      'facebook', 'twitter', 'reddit', 'quora'
    ]

    // Check credibility
    if (highCredibility.some(source => domain.includes(source))) {
      return 0.9
    } else if (mediumCredibility.some(source => domain.includes(source))) {
      return 0.7
    } else if (lowCredibility.some(source => domain.includes(source))) {
      return 0.3
    } else {
      return 0.5 // Default medium credibility
    }
  }

  /**
   * Get additional context for a claim
   */
  private async getClaimContext(claim: string, topic?: string): Promise<string> {
    try {
      const contextQuery = topic 
        ? `${claim} in the context of ${topic}`
        : `background and context: ${claim}`
      
      const research = await this.perplexity.search({
        query: contextQuery,
        maxResults: 2
      })

      if (research.results.length > 0) {
        return research.results[0].snippet
      }
    } catch (error) {
      console.error('Context retrieval error:', error)
    }
    
    return ''
  }

  /**
   * Generate summary of fact-check results
   */
  private generateSummary(results: FactCheckResult[]): string {
    const verified = results.filter(r => r.verdict === 'true').length
    const false_ = results.filter(r => r.verdict === 'false').length
    const partial = results.filter(r => r.verdict === 'partially-true').length
    const unverifiable = results.filter(r => r.verdict === 'unverifiable').length

    const parts: string[] = []
    
    if (verified > 0) {
      parts.push(`${verified} claim${verified > 1 ? 's' : ''} verified as accurate`)
    }
    if (false_ > 0) {
      parts.push(`${false_} claim${false_ > 1 ? 's' : ''} found to be false`)
    }
    if (partial > 0) {
      parts.push(`${partial} claim${partial > 1 ? 's' : ''} partially true`)
    }
    if (unverifiable > 0) {
      parts.push(`${unverifiable} claim${unverifiable > 1 ? 's' : ''} could not be verified`)
    }

    if (parts.length === 0) {
      return 'No factual claims were identified for verification.'
    }

    return parts.join(', ') + '.'
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(results: FactCheckResult[]): string[] {
    const suggestions: string[] = []

    // Check for false claims
    const falseClaims = results.filter(r => r.verdict === 'false')
    if (falseClaims.length > 0) {
      suggestions.push(`Correct ${falseClaims.length} false claim${falseClaims.length > 1 ? 's' : ''} identified in the content`)
      falseClaims.forEach(claim => {
        if (claim.corrections) {
          suggestions.push(`Replace: "${claim.claim.substring(0, 50)}..." with accurate information`)
        }
      })
    }

    // Check for misleading claims
    const misleading = results.filter(r => r.verdict === 'misleading')
    if (misleading.length > 0) {
      suggestions.push('Add context to clarify potentially misleading statements')
    }

    // Check for unverifiable claims
    const unverifiable = results.filter(r => r.verdict === 'unverifiable')
    if (unverifiable.length > 0) {
      suggestions.push('Consider adding citations for claims that cannot be independently verified')
    }

    // Check for low confidence results
    const lowConfidence = results.filter(r => r.confidence < 0.5)
    if (lowConfidence.length > 0) {
      suggestions.push('Review and strengthen claims with low verification confidence')
    }

    // Check source credibility
    const lowCredibilitySources = results.filter(r => 
      r.sources.some(s => s.credibility < 0.5)
    )
    if (lowCredibilitySources.length > 0) {
      suggestions.push('Consider using more authoritative sources for factual claims')
    }

    if (suggestions.length === 0 && results.length > 0) {
      const avgConfidence = results.reduce((acc, r) => acc + r.confidence, 0) / results.length
      if (avgConfidence > 0.8) {
        suggestions.push('Content appears to be factually accurate')
      } else {
        suggestions.push('Consider adding more citations to strengthen credibility')
      }
    }

    return suggestions
  }
}

// Export singleton instance
export const factChecker = new FactChecker()
