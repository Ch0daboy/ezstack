interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ResearchResult {
  query: string;
  findings: string;
  sources: {
    title: string;
    url: string;
    snippet: string;
  }[];
  factChecks?: {
    claim: string;
    verdict: 'accurate' | 'inaccurate' | 'partially_accurate' | 'unverifiable';
    explanation: string;
  }[];
  suggestions?: string[];
}

export type ResearchMode = 'pre_generation' | 'post_generation' | 'fact_check';

export class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Perplexity API key not configured');
    }
  }

  private async makeRequest(messages: PerplexityMessage[], model: string = 'llama-3.1-sonar-large-128k-online'): Promise<PerplexityResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 2000,
        return_citations: true,
        return_images: false,
        search_domain_filter: ['perplexity.ai'],
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    return response.json();
  }

  async researchTopic(
    topic: string,
    context: string,
    mode: ResearchMode = 'pre_generation'
  ): Promise<ResearchResult> {
    const prompts: Record<ResearchMode, string> = {
      pre_generation: `Research the topic "${topic}" comprehensively. 
        Context: ${context}
        
        Provide:
        1. Current trends and best practices
        2. Key concepts and terminology
        3. Common challenges and solutions
        4. Industry standards and recommendations
        5. Recent developments and innovations
        
        Focus on accurate, up-to-date information from credible sources.`,
        
      post_generation: `Review and enhance the following content about "${topic}":
        Context: ${context}
        
        Provide:
        1. Additional relevant information that could strengthen the content
        2. Current statistics or data to support claims
        3. Recent case studies or examples
        4. Expert opinions or research findings
        5. Suggestions for improvement
        
        Focus on adding value and depth to the existing content.`,
        
      fact_check: `Fact-check the following content about "${topic}":
        Content: ${context}
        
        For each major claim or statement:
        1. Verify its accuracy
        2. Provide supporting or contradicting evidence
        3. Note any outdated information
        4. Suggest corrections if needed
        5. Rate accuracy: accurate, partially accurate, or inaccurate
        
        Be thorough and cite reliable sources.`
    };

    try {
      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: 'You are a research assistant providing accurate, well-sourced information for educational content creation. Always cite sources and provide comprehensive analysis.',
        },
        {
          role: 'user',
          content: prompts[mode],
        },
      ];

      const response = await this.makeRequest(messages);
      const content = response.choices[0].message.content;

      // Parse the response to extract findings and sources
      const result: ResearchResult = {
        query: topic,
        findings: content,
        sources: this.extractSources(content),
      };

      if (mode === 'fact_check') {
        result.factChecks = this.extractFactChecks(content);
      }

      if (mode === 'post_generation') {
        result.suggestions = this.extractSuggestions(content);
      }

      return result;
    } catch (error) {
      console.error('Perplexity research error:', error);
      throw error;
    }
  }

  async enhanceContent(
    content: string,
    researchFindings: string
  ): Promise<string> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are an expert content editor. Enhance the provided content with research findings while maintaining the original voice and structure.',
      },
      {
        role: 'user',
        content: `Enhance this content with the following research findings:
        
        Original Content:
        ${content}
        
        Research Findings:
        ${researchFindings}
        
        Instructions:
        1. Integrate relevant facts and statistics naturally
        2. Add credible examples and case studies
        3. Update any outdated information
        4. Maintain the original tone and structure
        5. Cite sources where appropriate
        
        Return the enhanced content only, not explanations.`,
      },
    ];

    try {
      const response = await this.makeRequest(messages);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Content enhancement error:', error);
      return content; // Return original if enhancement fails
    }
  }

  async validateFactualAccuracy(
    content: string,
    topic: string
  ): Promise<{
    isAccurate: boolean;
    issues: string[];
    corrections: string[];
  }> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are a fact-checker validating educational content for accuracy. Be thorough and precise.',
      },
      {
        role: 'user',
        content: `Fact-check this ${topic} content for accuracy:
        
        ${content}
        
        Return a JSON object with:
        - isAccurate: boolean (false if any significant errors found)
        - issues: array of factual issues found
        - corrections: array of suggested corrections
        
        Focus on factual accuracy, not style or opinions.`,
      },
    ];

    try {
      const response = await this.makeRequest(messages);
      const result = JSON.parse(response.choices[0].message.content);
      return result;
    } catch (error) {
      console.error('Fact validation error:', error);
      return {
        isAccurate: true,
        issues: [],
        corrections: [],
      };
    }
  }

  async generateResearchQueries(
    topic: string,
    subtopics: string[]
  ): Promise<string[]> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'Generate specific research queries for comprehensive topic coverage.',
      },
      {
        role: 'user',
        content: `Generate 5-10 specific research queries for creating content about:
        Topic: ${topic}
        Subtopics: ${subtopics.join(', ')}
        
        Return a JSON array of query strings that would help gather comprehensive information.`,
      },
    ];

    try {
      const response = await this.makeRequest(messages);
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Query generation error:', error);
      return [topic, ...subtopics];
    }
  }

  private extractSources(content: string): ResearchResult['sources'] {
    // Extract URLs and create source objects
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    
    return urls.map(url => ({
      title: url.split('/').pop() || 'Source',
      url,
      snippet: '', // Would need more sophisticated parsing for actual snippets
    }));
  }

  private extractFactChecks(content: string): ResearchResult['factChecks'] {
    // Parse fact-checking results from content
    // This is a simplified version - real implementation would need better parsing
    const factChecks: ResearchResult['factChecks'] = [];
    
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('accurate') || line.includes('inaccurate')) {
        factChecks.push({
          claim: line.substring(0, 50),
          verdict: line.includes('inaccurate') ? 'inaccurate' : 
                   line.includes('partially') ? 'partially_accurate' : 'accurate',
          explanation: line,
        });
      }
    }
    
    return factChecks;
  }

  private extractSuggestions(content: string): string[] {
    // Extract suggestions from content
    const suggestions: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^\d+\.|^-|^•/) && line.length > 20) {
        suggestions.push(line.replace(/^\d+\.|^-|^•/, '').trim());
      }
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  async batchResearch(
    topics: string[],
    mode: ResearchMode = 'pre_generation'
  ): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];
    
    // Process in batches to avoid rate limiting
    for (const topic of topics) {
      try {
        const result = await this.researchTopic(topic, '', mode);
        results.push(result);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Research failed for topic: ${topic}`, error);
        results.push({
          query: topic,
          findings: 'Research failed',
          sources: [],
        });
      }
    }
    
    return results;
  }

  async search(options: {
    query: string;
    maxResults?: number;
    includeImages?: boolean;
  }): Promise<{
    results: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
  }> {
    try {
      const result = await this.researchTopic(options.query, '', 'fact_check');
      return {
        results: result.sources.slice(0, options.maxResults || 5).map(source => ({
          title: source.title,
          url: source.url,
          snippet: source.snippet || result.findings.substring(0, 200)
        }))
      };
    } catch (error) {
      console.error('Search error:', error);
      return { results: [] };
    }
  }
}

export const perplexityService = new PerplexityService();
