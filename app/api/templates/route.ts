import { NextRequest, NextResponse } from 'next/server'
import { templateOperations } from '@/lib/db/helpers'
import { requireUser } from '@/lib/auth/ensure-user'
import type { TemplateInsert } from '@/lib/types/database'

// GET /api/templates - Get all templates (public and user's own)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || undefined
    const onlyMine = searchParams.get('onlyMine') === 'true'
    
    // Get user if authenticated
    let userId: string | null = null
    try {
      const user = await requireUser()
      userId = user.id
    } catch {
      // User not authenticated, only show public templates
    }

    let templates
    
    if (onlyMine && userId) {
      // Get only user's templates
      templates = await templateOperations.getUserTemplates(userId)
    } else {
      // Get public templates
      const publicTemplates = await templateOperations.getPublic(type)
      
      // If user is authenticated, also get their private templates
      if (userId && !onlyMine) {
        const userTemplates = await templateOperations.getUserTemplates(userId)
        templates = [...publicTemplates, ...userTemplates]
      } else {
        templates = publicTemplates
      }
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const user = await requireUser()

    // Parse request body
    const body = await request.json()
    const { name, type, structure, is_public = false } = body

    // Validate required fields
    if (!name || !type || !structure) {
      return NextResponse.json(
        { error: 'Name, type, and structure are required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['course', 'lesson', 'activity'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid template type' },
        { status: 400 }
      )
    }

    // Create template data
    const templateData: TemplateInsert = {
      user_id: user.id,
      name,
      type,
      structure,
      is_public
    }

    // Create the template
    const template = await templateOperations.create(templateData)
    
    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized: User not found') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

// PUT /api/templates - Update a template
export async function PUT(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const user = await requireUser()

    // Parse request body
    const body = await request.json()
    const { id, name, structure, is_public } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Get the existing template
    const existingTemplates = await templateOperations.getUserTemplates(user.id)
    const existingTemplate = existingTemplates.find(t => t.id === id)
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (structure !== undefined) updateData.structure = structure
    if (is_public !== undefined) updateData.is_public = is_public

    // Update the template
    const updatedTemplate = await templateOperations.update(id, updateData)
    
    return NextResponse.json({ template: updatedTemplate })
  } catch (error) {
    console.error('Error updating template:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized: User not found') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE /api/templates - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const user = await requireUser()

    // Parse request body
    const body = await request.json()
    const { id } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Get the existing template
    const existingTemplates = await templateOperations.getUserTemplates(user.id)
    const existingTemplate = existingTemplates.find(t => t.id === id)
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Delete the template
    await templateOperations.delete(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized: User not found') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
