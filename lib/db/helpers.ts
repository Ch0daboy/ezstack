import { createBrowserClient } from '@/lib/supabase/client'
import { createServerClient } from '@/lib/supabase/server'
import type {
  User, UserInsert, UserUpdate,
  Course, CourseInsert, CourseUpdate,
  Lesson, LessonInsert, LessonUpdate,
  ContentVariation, ContentVariationInsert,
  Template, TemplateInsert, TemplateUpdate,
  Persona, PersonaInsert, PersonaUpdate,
  GeneratedImage, GeneratedImageInsert,
  GenerationJob, GenerationJobInsert, GenerationJobUpdate
} from '@/lib/types/database'

// User Operations
export const userOperations = {
  async getById(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as User
  },

  async getByClerkId(clerkId: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single()
    
    if (error) throw error
    return data as User
  },

  async create(user: UserInsert, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()
    
    if (error) throw error
    return data as User
  },

  async update(id: string, updates: UserUpdate, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as User
  },

  async updateCredits(id: string, credits: number, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('users')
      .update({ credits_remaining: credits })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as User
  }
}

// Course Operations
export const courseOperations = {
  async getAll(userId: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Course[]
  },

  async getById(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Course
  },

  async create(course: CourseInsert, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('courses')
      .insert(course)
      .select()
      .single()
    
    if (error) throw error
    return data as Course
  },

  async update(id: string, updates: CourseUpdate, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Course
  },

  async delete(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  async getWithLessons(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        lessons (*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Course & { lessons: Lesson[] }
  }
}

// Lesson Operations
export const lessonOperations = {
  async getByCourse(courseId: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })
    
    if (error) throw error
    return data as Lesson[]
  },

  async getById(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Lesson
  },

  async create(lesson: LessonInsert, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('lessons')
      .insert(lesson)
      .select()
      .single()
    
    if (error) throw error
    return data as Lesson
  },

  async createBatch(lessons: LessonInsert[], isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('lessons')
      .insert(lessons)
      .select()
    
    if (error) throw error
    return data as Lesson[]
  },

  async update(id: string, updates: LessonUpdate, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Lesson
  },

  async delete(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  async reorder(courseId: string, lessonOrders: { id: string, order_index: number }[], isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    
    const updates = lessonOrders.map(({ id, order_index }) => 
      supabase
        .from('lessons')
        .update({ order_index })
        .eq('id', id)
        .eq('course_id', courseId)
    )
    
    const results = await Promise.all(updates)
    const hasError = results.some(r => r.error)
    
    if (hasError) throw new Error('Failed to reorder lessons')
    return true
  }
}

// Content Variation Operations
export const contentVariationOperations = {
  async getByLesson(lessonId: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('content_variations')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as ContentVariation[]
  },

  async create(variation: ContentVariationInsert, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('content_variations')
      .insert(variation)
      .select()
      .single()
    
    if (error) throw error
    return data as ContentVariation
  },

  async delete(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { error } = await supabase
      .from('content_variations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

// Template Operations
export const templateOperations = {
  async getPublic(type?: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    let query = supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
    
    if (type) {
      query = query.eq('type', type)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Template[]
  },

  async getUserTemplates(userId: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Template[]
  },

  async create(template: TemplateInsert, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('templates')
      .insert(template)
      .select()
      .single()
    
    if (error) throw error
    return data as Template
  },

  async update(id: string, updates: TemplateUpdate, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Template
  },

  async delete(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

// Persona Operations
export const personaOperations = {
  async getPublic(isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Persona[]
  },

  async getUserPersonas(userId: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Persona[]
  },

  async create(persona: PersonaInsert, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('personas')
      .insert(persona)
      .select()
      .single()
    
    if (error) throw error
    return data as Persona
  },

  async update(id: string, updates: PersonaUpdate, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('personas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Persona
  },

  async delete(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

// Generated Image Operations
export const generatedImageOperations = {
  async getByLesson(lessonId: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('generated_images')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as GeneratedImage[]
  },

  async create(image: GeneratedImageInsert, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('generated_images')
      .insert(image)
      .select()
      .single()
    
    if (error) throw error
    return data as GeneratedImage
  },

  async delete(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { error } = await supabase
      .from('generated_images')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

// Generation Job Operations
export const generationJobOperations = {
  async getUserJobs(userId: string, limit = 10, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as GenerationJob[]
  },

  async getById(id: string, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as GenerationJob
  },

  async create(job: GenerationJobInsert, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('generation_jobs')
      .insert(job)
      .select()
      .single()
    
    if (error) throw error
    return data as GenerationJob
  },

  async update(id: string, updates: GenerationJobUpdate, isServer = true) {
    const supabase = isServer ? await createServerClient() : createBrowserClient()
    const { data, error } = await supabase
      .from('generation_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as GenerationJob
  },

  async startJob(id: string, isServer = true) {
    return generationJobOperations.update(id, {
      status: 'processing',
      started_at: new Date().toISOString()
    }, isServer)
  },

  async completeJob(id: string, result: any, isServer = true) {
    return generationJobOperations.update(id, {
      status: 'completed',
      result,
      completed_at: new Date().toISOString()
    }, isServer)
  },

  async failJob(id: string, error: string, isServer = true) {
    return generationJobOperations.update(id, {
      status: 'failed',
      error_message: error,
      completed_at: new Date().toISOString()
    }, isServer)
  }
}
