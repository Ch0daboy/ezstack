import { NextRequest, NextResponse } from 'next/server'
import { personaOperations } from '@/lib/db/helpers'
import { requireUser } from '@/lib/auth/ensure-user'
import type { PersonaInsert } from '@/lib/types/database'

// GET /api/personas - Get all personas (public and user's own)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const onlyMine = searchParams.get('onlyMine') === 'true'
    
    // Get user if authenticated
    let userId: string | null = null
    try {
      const user = await requireUser()
      userId = user.id
    } catch {
      // User not authenticated, only show public personas
    }

    let personas
    
    if (onlyMine && userId) {
      // Get only user's personas
      personas = await personaOperations.getUserPersonas(userId)
    } else {
      // Get public personas
      const publicPersonas = await personaOperations.getPublic()
      
      // If user is authenticated, also get their private personas
      if (userId && !onlyMine) {
        const userPersonas = await personaOperations.getUserPersonas(userId)
        personas = [...publicPersonas, ...userPersonas]
      } else {
        personas = publicPersonas
      }
    }

    return NextResponse.json({ personas })
  } catch (error) {
    console.error('Error fetching personas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personas' },
      { status: 500 }
    )
  }
}

// POST /api/personas - Create a new persona
export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const user = await requireUser()

    // Parse request body
    const body = await request.json()
    const { 
      name, 
      voice_characteristics, 
      writing_style,
      is_public = false 
    } = body

    // Validate required fields
    if (!name || !voice_characteristics) {
      return NextResponse.json(
        { error: 'Name and voice characteristics are required' },
        { status: 400 }
      )
    }

    // Validate voice characteristics structure
    const requiredVoiceFields = [
      'tone', 'vocabulary_level', 'sentence_complexity',
      'personality_traits', 'teaching_style', 'humor_level', 'formality'
    ]
    
    const hasAllFields = requiredVoiceFields.every(
      field => voice_characteristics[field] !== undefined
    )
    
    if (!hasAllFields) {
      return NextResponse.json(
        { error: 'Invalid voice characteristics structure' },
        { status: 400 }
      )
    }

    // Create persona data
    const personaData: PersonaInsert = {
      user_id: user.id,
      name,
      voice_characteristics,
      writing_style: writing_style || null,
      is_public
    }

    // Create the persona
    const persona = await personaOperations.create(personaData)
    
    return NextResponse.json({ persona }, { status: 201 })
  } catch (error) {
    console.error('Error creating persona:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized: User not found') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create persona' },
      { status: 500 }
    )
  }
}

// PUT /api/personas - Update a persona
export async function PUT(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const user = await requireUser()

    // Parse request body
    const body = await request.json()
    const { 
      id, 
      name, 
      voice_characteristics, 
      writing_style,
      is_public 
    } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Persona ID is required' },
        { status: 400 }
      )
    }

    // Get the existing persona
    const existingPersonas = await personaOperations.getUserPersonas(user.id)
    const existingPersona = existingPersonas.find(p => p.id === id)
    
    if (!existingPersona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (voice_characteristics !== undefined) updateData.voice_characteristics = voice_characteristics
    if (writing_style !== undefined) updateData.writing_style = writing_style
    if (is_public !== undefined) updateData.is_public = is_public

    // Update the persona
    const updatedPersona = await personaOperations.update(id, updateData)
    
    return NextResponse.json({ persona: updatedPersona })
  } catch (error) {
    console.error('Error updating persona:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized: User not found') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update persona' },
      { status: 500 }
    )
  }
}

// DELETE /api/personas - Delete a persona
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
        { error: 'Persona ID is required' },
        { status: 400 }
      )
    }

    // Get the existing persona
    const existingPersonas = await personaOperations.getUserPersonas(user.id)
    const existingPersona = existingPersonas.find(p => p.id === id)
    
    if (!existingPersona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      )
    }

    // Delete the persona
    await personaOperations.delete(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting persona:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized: User not found') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete persona' },
      { status: 500 }
    )
  }
}
