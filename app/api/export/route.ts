import { NextRequest, NextResponse } from 'next/server'
import { courseOperations, lessonOperations, contentVariationOperations } from '@/lib/db/helpers'
import { requireUser } from '@/lib/auth/ensure-user'
import { exportService, type ExportFormat, type ExportOptions } from '@/lib/export/export-service'

// POST /api/export - Export content in various formats
export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const user = await requireUser()

    // Parse request body
    const body = await request.json()
    const {
      type, // 'course' | 'lesson' | 'variation'
      id,
      format = 'pdf',
      options = {}
    } = body

    // Validate required fields
    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      )
    }

    // Validate format
    const validFormats: ExportFormat[] = ['pdf', 'docx', 'markdown', 'html']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format' },
        { status: 400 }
      )
    }

    // Prepare export options
    const exportOptions: ExportOptions = {
      format,
      includeMetadata: options.includeMetadata ?? true,
      includeActivities: options.includeActivities ?? true,
      includeImages: options.includeImages ?? false,
      includeVariations: options.includeVariations ?? false,
      template: options.template,
      styling: options.styling
    }

    let result

    switch (type) {
      case 'course':
        // Get course with lessons
        const course = await courseOperations.getWithLessons(id)
        
        // Verify ownership
        if (course.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Course not found' },
            { status: 404 }
          )
        }

        // Export course
        result = await exportService.exportCourse(course, exportOptions)
        break

      case 'lesson':
        // Get lesson
        const lesson = await lessonOperations.getById(id)
        
        // Verify ownership through course
        const lessonCourse = await courseOperations.getById(lesson.course_id)
        if (lessonCourse.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Lesson not found' },
            { status: 404 }
          )
        }

        // Export lesson
        result = await exportService.exportLesson(lesson, exportOptions)
        break

      case 'variation':
        // Get content variation
        const variations = await contentVariationOperations.getByLesson(id)
        
        if (!variations || variations.length === 0) {
          return NextResponse.json(
            { error: 'No variations found for this lesson' },
            { status: 404 }
          )
        }

        // Get the specific variation type if provided
        const variationType = options.variationType
        const variation = variationType 
          ? variations.find(v => v.type === variationType)
          : variations[0]

        if (!variation) {
          return NextResponse.json(
            { error: 'Variation not found' },
            { status: 404 }
          )
        }

        // Get lesson title for filename
        const variationLesson = await lessonOperations.getById(id)
        
        // Export variation
        result = await exportService.exportContentVariation(
          variation,
          variationLesson.title,
          exportOptions
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      )
    }

    // Return the file as a response
    const headers = new Headers()
    headers.set('Content-Type', result.mimeType)
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`)
    headers.set('Content-Length', result.size?.toString() || '0')

    return new NextResponse(result.content, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export content' },
      { status: 500 }
    )
  }
}

// GET /api/export/batch - Get batch export status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Ensure user is authenticated
    const user = await requireUser()

    // Verify course ownership
    const course = await courseOperations.getById(courseId)
    if (course.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Get all variations for the course
    const courseWithLessons = await courseOperations.getWithLessons(courseId)
    const exportInfo = {
      courseId,
      title: course.title,
      lessonsCount: courseWithLessons.lessons?.length || 0,
      availableFormats: ['pdf', 'docx', 'markdown', 'html'],
      estimatedSize: {
        pdf: '~2MB',
        docx: '~1MB',
        markdown: '~500KB',
        html: '~800KB'
      }
    }

    return NextResponse.json(exportInfo)

  } catch (error) {
    console.error('Batch export info error:', error)
    return NextResponse.json(
      { error: 'Failed to get export information' },
      { status: 500 }
    )
  }
}
