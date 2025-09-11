import { bedrockService, type GenerationOptions } from './bedrock'

export interface ContentGenerationOptions extends GenerationOptions {
  prompt: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export async function generateContent(options: ContentGenerationOptions): Promise<string> {
  const { prompt, systemPrompt = '', ...restOptions } = options
  
  // Use the bedrock service's internal method through the public interface
  // Since invokeClaudeModel is private, we'll create a simple content generation wrapper
  try {
    // For now, use the humanizeContent method as a proxy to the Claude model
    // This is a temporary solution - ideally we'd expose a general generateContent method in BedrockService
    const result = await bedrockService.humanizeContent(
      prompt,
      'blog', // Default content type
      'moderate', // Default level
      {
        systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        ...restOptions
      }
    )
    
    return result
  } catch (error) {
    console.error('Content generation error:', error)
    throw new Error('Failed to generate content')
  }
}