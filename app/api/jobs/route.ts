import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/ensure-user'
import { generationJobOperations } from '@/lib/db/helpers'

// GET /api/jobs - list recent jobs for the user
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') || 20)
    const jobs = await generationJobOperations.getUserJobs(user.id, limit)
    const summary = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    }
    return NextResponse.json({ jobs, summary })
  } catch (error) {
    console.error('Jobs list error:', error)
    return NextResponse.json({ error: 'Failed to get jobs' }, { status: 500 })
  }
}

