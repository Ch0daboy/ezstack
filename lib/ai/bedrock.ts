import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface CourseOutline {
  title: string;
  description: string;
  objectives: string[];
  modules: {
    title: string;
    description: string;
    lectures: {
      title: string;
      objectives: string[];
      duration: number;
    }[];
  }[];
  totalDuration: number;
}

export interface LessonPlan {
  lectureTitle: string;
  objectives: string[];
  introduction: string;
  mainContent: {
    section: string;
    content: string;
    keyPoints: string[];
  }[];
  activity: {
    type: 'quiz' | 'reflection' | 'exercise' | 'discussion';
    title: string;
    instructions: string;
    questions?: {
      question: string;
      options?: string[];
      correctAnswer?: string | number;
      explanation?: string;
    }[];
    estimatedMinutes: number;
  };
  summary: string;
  resources: string[];
}

export class BedrockService {
  // Simple in-memory cache for AI text responses (best-effort, ephemeral)
  private cache = new Map<string, { value: string; expiresAt: number }>()
  private CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
  private CACHE_MAX = 50

  private async invokeClaudeModel(
    prompt: string,
    systemPrompt: string = '',
    options: GenerationOptions = {}
  ): Promise<string> {
    const modelId = options.model || process.env.DEFAULT_AI_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0';
    
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const input: InvokeModelCommandInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    };

    try {
      // Cache key based on model + payload
      const cacheKey = `claude:${modelId}:${input.body}`
      const now = Date.now()
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expiresAt > now) {
        return cached.value
      }

      const command = new InvokeModelCommand(input);
      const response = await bedrockClient.send(command);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const text = responseBody.content?.[0]?.text || ''

      // Maintain cache size
      if (this.cache.size >= this.CACHE_MAX) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) this.cache.delete(firstKey)
      }
      this.cache.set(cacheKey, { value: text, expiresAt: now + this.CACHE_TTL_MS })

      return text;
    } catch (error) {
      console.error('Bedrock invocation error:', error);
      throw error;
    }
  }

  async generateQuiz(
    topic: string,
    learningObjectives: string[] = [],
    questionCount: number = 10,
    options: GenerationOptions = {}
  ): Promise<{
    title: string
    overview: string
    questions: Array<{
      id: string
      type: 'multiple_choice' | 'true_false' | 'short_answer' | 'matching' | 'fill_blank'
      question: string
      options?: string[]
      correctAnswer?: string | number | string[]
      explanation?: string
      points?: number
      difficulty?: 'easy' | 'medium' | 'hard'
    }>
    totalPoints: number
  }> {
    const systemPrompt = options.systemPrompt || `You are an expert assessment designer creating fair, clear quizzes that align to learning objectives. Always output valid JSON.`

    const prompt = `Create a quiz for the topic: ${topic}
Learning Objectives: ${learningObjectives.join(', ') || 'General understanding'}
Number of Questions: ${questionCount}

Include a mix of question types: multiple_choice, true_false, short_answer, matching or fill_blank. Make questions clear and unambiguous, with concise explanations.

Return ONLY valid JSON with this structure:
{
  "title": "string",
  "overview": "string",
  "questions": [{
    "id": "string",
    "type": "multiple_choice|true_false|short_answer|matching|fill_blank",
    "question": "string",
    "options": ["string"],
    "correctAnswer": "string|number|string[]",
    "explanation": "string",
    "points": 1,
    "difficulty": "easy|medium|hard"
  }],
  "totalPoints": number
}`

    const response = await this.invokeClaudeModel(prompt, systemPrompt, {
      ...options,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 3000,
    })

    try {
      return JSON.parse(response)
    } catch (error) {
      const match = response.match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
      throw new Error('Failed to generate valid quiz JSON')
    }
  }

  async generateCourseOutline(
    topic: string,
    targetAudience: string,
    difficulty: string,
    options: GenerationOptions = {}
  ): Promise<CourseOutline> {
    const systemPrompt = options.systemPrompt || `You are an expert course designer specializing in creating comprehensive, engaging online courses. Create detailed course outlines that are well-structured and pedagogically sound. Always respond with valid JSON.`;
    
    const prompt = `Create a comprehensive course outline for the following:
Topic: ${topic}
Target Audience: ${targetAudience}
Difficulty Level: ${difficulty}

The outline should include:
1. Course title and description
2. Learning objectives (3-5 main objectives)
3. Modules (4-8 modules)
4. For each module:
   - Module title and description
   - Lectures (3-5 per module)
   - For each lecture: title, objectives, and estimated duration (in minutes)

Return ONLY a valid JSON object with this structure:
{
  "title": "string",
  "description": "string",
  "objectives": ["string"],
  "modules": [{
    "title": "string",
    "description": "string",
    "lectures": [{
      "title": "string",
      "objectives": ["string"],
      "duration": number
    }]
  }],
  "totalDuration": number
}`;

    const response = await this.invokeClaudeModel(prompt, systemPrompt, options);
    
    try {
      return JSON.parse(response) as CourseOutline;
    } catch (error) {
      console.error('Failed to parse course outline JSON:', error);
      // Attempt to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as CourseOutline;
      }
      throw new Error('Failed to generate valid course outline');
    }
  }

  async generateLessonPlan(
    lectureTitle: string,
    courseContext: string,
    objectives: string[],
    options: GenerationOptions = {}
  ): Promise<LessonPlan> {
    const systemPrompt = options.systemPrompt || `You are an expert instructional designer creating detailed lesson plans for online courses. Focus on clear explanations, engaging content, and interactive activities. Always respond with valid JSON.`;
    
    const prompt = `Create a detailed lesson plan for:
Lecture Title: ${lectureTitle}
Course Context: ${courseContext}
Learning Objectives: ${objectives.join(', ')}

The lesson plan should include:
1. Clear learning objectives
2. Engaging introduction (2-3 paragraphs)
3. Main content divided into logical sections with key points
4. An interactive activity (quiz, reflection, exercise, or discussion) that takes 5-15 minutes
5. Summary of key takeaways
6. Additional resources for further learning

Return ONLY a valid JSON object with this structure:
{
  "lectureTitle": "string",
  "objectives": ["string"],
  "introduction": "string",
  "mainContent": [{
    "section": "string",
    "content": "string",
    "keyPoints": ["string"]
  }],
  "activity": {
    "type": "quiz|reflection|exercise|discussion",
    "title": "string",
    "instructions": "string",
    "questions": [{
      "question": "string",
      "options": ["string"],
      "correctAnswer": "string or number",
      "explanation": "string"
    }],
    "estimatedMinutes": number
  },
  "summary": "string",
  "resources": ["string"]
}`;

    const response = await this.invokeClaudeModel(prompt, systemPrompt, options);
    
    try {
      return JSON.parse(response) as LessonPlan;
    } catch (error) {
      console.error('Failed to parse lesson plan JSON:', error);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as LessonPlan;
      }
      throw new Error('Failed to generate valid lesson plan');
    }
  }

  async generateLectureScript(
    lessonPlan: LessonPlan,
    duration: number,
    style: string = 'conversational',
    options: GenerationOptions = {}
  ): Promise<string> {
    const systemPrompt = options.systemPrompt || `You are an expert educator creating engaging lecture scripts for online courses. Write in a ${style} style that is clear, engaging, and educational.`;
    
    const wordsPerMinute = 150; // Average speaking pace
    const targetWords = duration * wordsPerMinute;
    
    const prompt = `Create a complete lecture script based on this lesson plan:
Title: ${lessonPlan.lectureTitle}
Objectives: ${lessonPlan.objectives.join(', ')}
Target Duration: ${duration} minutes (approximately ${targetWords} words)
Style: ${style}

Introduction: ${lessonPlan.introduction}

Main Content Sections:
${lessonPlan.mainContent.map(section => `
- ${section.section}
  Content: ${section.content}
  Key Points: ${section.keyPoints.join(', ')}
`).join('')}

Summary: ${lessonPlan.summary}

Write a natural, flowing script that:
1. Starts with a hook to engage learners
2. Clearly explains concepts with examples
3. Uses transitions between sections
4. Includes moments for reflection or interaction
5. Ends with a strong summary and call to action

The script should be exactly what the instructor would say, word for word.`;

    return await this.invokeClaudeModel(prompt, systemPrompt, {
      ...options,
      temperature: options.temperature || 0.8,
    });
  }

  async generateYouTubeScript(
    topic: string,
    mainPoints: string[],
    duration: number = 10,
    options: GenerationOptions = {}
  ): Promise<{
    title: string;
    hook: string;
    mainContent: string;
    callToAction: string;
    tags: string[];
    thumbnailPrompt: string;
  }> {
    const systemPrompt = options.systemPrompt || `You are a successful YouTube educator creating engaging, viral educational content. Focus on hooks, retention, and clear value delivery. Always respond with valid JSON.`;
    
    const prompt = `Create a YouTube video script for:
Topic: ${topic}
Main Points: ${mainPoints.join(', ')}
Target Duration: ${duration} minutes

Create:
1. Catchy title (under 60 characters)
2. Hook (first 15 seconds - grab attention immediately)
3. Main content (structured for high retention)
4. Strong call to action
5. Relevant tags (10-15 tags)
6. Thumbnail image prompt for AI generation

Return ONLY valid JSON with this structure:
{
  "title": "string",
  "hook": "string",
  "mainContent": "string",
  "callToAction": "string",
  "tags": ["string"],
  "thumbnailPrompt": "string"
}`;

    const response = await this.invokeClaudeModel(prompt, systemPrompt, {
      ...options,
      temperature: options.temperature || 0.8,
    });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse YouTube script JSON:', error);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Failed to generate valid YouTube script');
    }
  }

  async generateBlogPost(
    topic: string,
    outline: string[],
    seoKeywords: string[],
    options: GenerationOptions = {}
  ): Promise<{
    title: string;
    metaDescription: string;
    content: string;
    tags: string[];
    imagePrompts: string[];
  }> {
    const systemPrompt = options.systemPrompt || `You are an expert content writer creating SEO-optimized, engaging blog posts. Write comprehensive, valuable content that ranks well and provides genuine value. Always respond with valid JSON.`;
    
    const prompt = `Create a comprehensive blog post for:
Topic: ${topic}
Outline: ${outline.join(', ')}
SEO Keywords: ${seoKeywords.join(', ')}

Create:
1. SEO-optimized title (under 60 characters)
2. Meta description (under 160 characters)
3. Full blog content (1500-2500 words) with:
   - Engaging introduction
   - Well-structured sections with headers
   - Practical examples and actionable advice
   - Natural keyword integration
   - Strong conclusion
4. Relevant tags
5. Image prompts for 2-3 supporting images

Return ONLY valid JSON with this structure:
{
  "title": "string",
  "metaDescription": "string",
  "content": "string (in Markdown format)",
  "tags": ["string"],
  "imagePrompts": ["string"]
}`;

    const response = await this.invokeClaudeModel(prompt, systemPrompt, options);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse blog post JSON:', error);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Failed to generate valid blog post');
    }
  }

  async generateEbookChapter(
    chapterTitle: string,
    chapterOutline: string[],
    previousContext: string,
    options: GenerationOptions = {}
  ): Promise<{
    title: string;
    content: string;
    keyTakeaways: string[];
    exercises: string[];
  }> {
    const systemPrompt = options.systemPrompt || `You are an expert author writing comprehensive, educational ebook chapters. Create in-depth content that teaches concepts thoroughly with clear explanations and practical applications. Always respond with valid JSON.`;
    
    const prompt = `Write a complete ebook chapter for:
Chapter Title: ${chapterTitle}
Chapter Outline: ${chapterOutline.join(', ')}
Previous Context: ${previousContext}

Create:
1. Chapter title
2. Full chapter content (2000-3500 words) including:
   - Introduction linking to previous content
   - Detailed explanations of concepts
   - Real-world examples and case studies
   - Step-by-step instructions where applicable
   - Visual descriptions for potential diagrams
3. Key takeaways (5-7 points)
4. Chapter exercises (3-5 practical exercises)

Return ONLY valid JSON with this structure:
{
  "title": "string",
  "content": "string (in Markdown format)",
  "keyTakeaways": ["string"],
  "exercises": ["string"]
}`;

    const response = await this.invokeClaudeModel(prompt, systemPrompt, options);
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse ebook chapter JSON:', error);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Failed to generate valid ebook chapter');
    }
  }

  async humanizeContent(
    content: string,
    contentType: 'script' | 'blog' | 'ebook',
    level: 'light' | 'moderate' | 'heavy' = 'moderate',
    options: GenerationOptions = {}
  ): Promise<string> {
    const systemPrompts = {
      light: `You are rewriting content to sound more natural and human while maintaining accuracy. Make subtle changes to vary sentence structure and add occasional conversational elements.`,
      moderate: `You are transforming AI-generated content to sound genuinely human. Add personal touches, varied vocabulary, natural transitions, and occasional imperfections that humans make in writing.`,
      heavy: `You are completely rewriting content to be indistinguishable from human writing. Include personal anecdotes, varied sentence lengths, colloquialisms, natural digressions, and the occasional minor grammatical quirk that humans naturally include.`
    };
    
    const contentGuidelines = {
      script: 'Include natural speech patterns, filler words occasionally, and conversational transitions.',
      blog: 'Add personal opinions, rhetorical questions, and a unique voice with personality.',
      ebook: 'Include author insights, personal experiences where relevant, and a consistent authorial voice.'
    };
    
    const prompt = `Humanize this ${contentType} content at a ${level} level:

${content}

Guidelines: ${contentGuidelines[contentType]}

Maintain all factual information while making it sound naturally human-written. Do not add false information or claims.`;

    return await this.invokeClaudeModel(prompt, systemPrompts[level], {
      ...options,
      temperature: 0.9,
    });
  }

  async generateImage(prompt: string, style: string = 'realistic'): Promise<string> {
    const modelId = process.env.DEFAULT_IMAGE_MODEL || 'stability.stable-diffusion-xl-v1';
    
    const enhancedPrompt = `${prompt}, ${style} style, high quality, professional, detailed`;
    
    const payload = {
      text_prompts: [
        {
          text: enhancedPrompt,
          weight: 1,
        },
      ],
      cfg_scale: 7,
      steps: 50,
      seed: Math.floor(Math.random() * 1000000),
      height: 1024,
      width: 1024,
      samples: 1,
    };

    const input: InvokeModelCommandInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    };

    try {
      const command = new InvokeModelCommand(input);
      const response = await bedrockClient.send(command);
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // The response contains base64 encoded image
      if (responseBody.artifacts && responseBody.artifacts[0]) {
        const base64Image = responseBody.artifacts[0].base64;
        // Convert to data URL or upload to storage
        return `data:image/png;base64,${base64Image}`;
      }
      
      throw new Error('No image generated');
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  }

  async batchGenerate<T>(
    items: Array<() => Promise<T>>,
    concurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(fn => fn()));
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + concurrency < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export const bedrockService = new BedrockService();
