import { NextRequest, NextResponse } from 'next/server'
import { defaultActivityTemplates } from '@/lib/activities/templates'
import { templateOperations, userOperations } from '@/lib/db/helpers'
import { requireUser } from '@/lib/auth/ensure-user'

// GET /api/activities/templates - List activity templates (default + user + public)
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    
    const [publicTemplates, userTemplates] = await Promise.all([
      templateOperations.getPublic('activity'),
      templateOperations.getUserTemplates(user.id)
    ])

    return NextResponse.json({
      defaults: defaultActivityTemplates,
      public: publicTemplates.filter(t => t.type === 'activity'),
      user: userTemplates.filter(t => t.type === 'activity')
    })
  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity templates' }, { status: 500 })
  }
}

