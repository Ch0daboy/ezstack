import { NextRequest, NextResponse } from 'next/server'
import { requireCredits, deductCredits } from '@/lib/auth/ensure-user'
import { bedrockService } from '@/lib/ai/bedrock'
import { generatedImageOperations, lessonOperations, courseOperations } from '@/lib/db/helpers'

const IMAGE_CREDITS = 2

// POST /api/images - Generate and save an image for a lesson
export async function POST(request: NextRequest) {
  try {
    const user = await requireCredits(IMAGE_CREDITS)
    const body = await request.json()
    const { lessonId, prompt, style = 'realistic' } = body

    if (!lessonId || !prompt) {
      return NextResponse.json({ error: 'Lesson ID and prompt are required' }, { status: 400 })
    }

    const lesson = await lessonOperations.getById(lessonId)
    const course = await courseOperations.getById(lesson.course_id)
    if (course.user_id !== user.id) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const imageDataUrl = await bedrockService.generateImage(prompt, style)

    const image = await generatedImageOperations.create({
      lesson_id: lessonId,
      prompt,
      url: imageDataUrl,
      alt_text: `${lesson.title} - generated image`
    })

    await deductCredits(user.clerk_id, IMAGE_CREDITS)

    return NextResponse.json({ success: true, image, creditsUsed: IMAGE_CREDITS, creditsRemaining: user.credits_remaining - IMAGE_CREDITS })
  } catch (error) {
    console.error('Image generation error:', error)
    if (error instanceof Error && error.message === 'Insufficient credits') {
      return NextResponse.json({ error: 'Insufficient credits', creditsRequired: IMAGE_CREDITS }, { status: 402 })
    }
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}

