// Database Types for CourseForge Platform

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// User Types
export interface User {
  id: string
  clerk_id: string
  subscription_tier: 'free' | 'starter' | 'pro' | 'enterprise'
  credits_remaining: number
  settings: UserSettings
  created_at: string
  updated_at: string
}

export interface UserSettings {
  default_persona_id?: string
  default_template_id?: string
  email_notifications?: boolean
  research_preferences?: ResearchPreferences
}

export interface ResearchPreferences {
  enabled: boolean
  depth: 'basic' | 'moderate' | 'comprehensive'
  fact_checking: boolean
  sources_required: number
}

// Course Types
export interface Course {
  id: string
  user_id: string
  title: string
  topic: string
  description: string | null
  outline: CourseOutline
  settings: CourseSettings
  status: 'draft' | 'generating' | 'complete' | 'error'
  created_at: string
  updated_at: string
}

export interface CourseOutline {
  modules?: Module[]
  duration?: string
  target_audience?: string
  learning_objectives?: string[]
  prerequisites?: string[]
}

export interface Module {
  title: string
  description: string
  lessons: string[]
  order: number
}

export interface CourseSettings {
  research_enabled?: boolean
  humanization_level?: 'none' | 'light' | 'moderate' | 'heavy'
  content_tone?: 'professional' | 'casual' | 'academic' | 'conversational'
  include_quizzes?: boolean
  include_activities?: boolean
  generate_images?: boolean
  persona_id?: string
  template_id?: string
}

// Lesson Types
export interface Lesson {
  id: string
  course_id: string
  order_index: number
  title: string
  objectives: string[]
  lesson_plan: LessonPlan
  script: string | null
  activities: Activity[]
  status: 'draft' | 'generating' | 'complete' | 'error'
  created_at: string
  updated_at: string
}

export interface LessonPlan {
  introduction?: string
  main_content?: Section[]
  conclusion?: string
  duration_minutes?: number
  materials_needed?: string[]
  key_concepts?: string[]
}

export interface Section {
  title: string
  content: string
  duration_minutes?: number
  activities?: string[]
}

export interface Activity {
  type: 'quiz' | 'exercise' | 'discussion' | 'project'
  title: string
  description: string
  instructions: string
  duration_minutes?: number
  resources?: string[]
  assessment_criteria?: string[]
  // Optional quiz-specific fields
  questions?: any[]
  question_types?: string[]
}

// Content Variation Types
export interface ContentVariation {
  id: string
  lesson_id: string
  type: 'ebook_chapter' | 'youtube_script' | 'blog_post'
  content: string | null
  metadata: ContentMetadata
  created_at: string
}

export interface ContentMetadata {
  word_count?: number
  reading_time?: number
  seo_keywords?: string[]
  target_platform?: string
  formatting?: object
}

// Content Versioning
export interface ContentVersion {
  id: string
  content_type: 'course_outline' | 'lecture_script' | 'ebook_chapter' | 'youtube_script' | 'blog_post'
  content_id: string
  version_number: number
  content: Json
  changes_made: string | null
  is_humanized: boolean
  ai_detection_score: number | null
  created_at: string
  created_by: string | null
}

// Template Types
export interface Template {
  id: string
  user_id: string | null
  name: string
  type: 'course' | 'lesson' | 'activity'
  structure: TemplateStructure
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface TemplateStructure {
  sections: TemplateSection[]
  default_settings?: object
  variables?: TemplateVariable[]
}

export interface TemplateSection {
  id: string
  title: string
  type: string
  required: boolean
  default_content?: string
  instructions?: string
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'boolean' | 'select'
  label: string
  default_value?: any
  options?: string[]
}

// Persona Types
export interface Persona {
  id: string
  user_id: string | null
  name: string
  voice_characteristics: VoiceCharacteristics
  writing_style: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface VoiceCharacteristics {
  tone: string[]
  vocabulary_level: 'simple' | 'intermediate' | 'advanced' | 'technical'
  sentence_complexity: 'simple' | 'moderate' | 'complex'
  personality_traits: string[]
  teaching_style: string
  humor_level: 'none' | 'occasional' | 'frequent'
  formality: 'very_formal' | 'formal' | 'neutral' | 'casual' | 'very_casual'
}

// Generated Image Types
export interface GeneratedImage {
  id: string
  lesson_id: string
  prompt: string
  url: string
  alt_text: string | null
  created_at: string
}

// Student Progress Types
export interface StudentProgress {
  id: string
  user_id: string
  course_id: string
  lesson_id: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percent: number
  last_viewed_at: string
  created_at: string
  updated_at: string
}

// Assessments
export interface Assessment {
  id: string
  course_id: string | null
  lesson_id: string | null
  title: string
  overview: string | null
  questions: any[]
  total_points: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Generation Job Types
export interface GenerationJob {
  id: string
  user_id: string
  course_id: string | null
  type: GenerationJobType
  status: 'pending' | 'processing' | 'completed' | 'failed'
  config: GenerationConfig
  result: GenerationResult
  error_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export type GenerationJobType = 
  | 'course_outline'
  | 'lesson_plan'
  | 'lesson_script'
  | 'quiz'
  | 'activity'
  | 'ebook_chapter'
  | 'youtube_script'
  | 'blog_post'
  | 'image'

export interface GenerationConfig {
  prompt?: string
  model?: string
  temperature?: number
  max_tokens?: number
  research_config?: ResearchConfig
  humanization_config?: HumanizationConfig
  persona_id?: string
  template_id?: string
}

export interface ResearchConfig {
  enabled: boolean
  sources: string[]
  depth: 'basic' | 'moderate' | 'comprehensive'
  fact_check: boolean
}

export interface HumanizationConfig {
  level: 'light' | 'moderate' | 'heavy'
  add_anecdotes: boolean
  vary_sentence_structure: boolean
  include_conversational_elements: boolean
}

export interface GenerationResult {
  content?: string
  metadata?: object
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  research_results?: ResearchResult[]
}

export interface ResearchResult {
  source: string
  relevance_score: number
  facts_extracted: string[]
  citations: string[]
}

// Database Insert/Update Types (without auto-generated fields)
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>
export type UserUpdate = Partial<UserInsert>

export type CourseInsert = Omit<Course, 'id' | 'created_at' | 'updated_at'>
export type CourseUpdate = Partial<CourseInsert>

export type LessonInsert = Omit<Lesson, 'id' | 'created_at' | 'updated_at'>
export type LessonUpdate = Partial<LessonInsert>

export type ContentVariationInsert = Omit<ContentVariation, 'id' | 'created_at'>
export type ContentVariationUpdate = Partial<ContentVariationInsert>

export type ContentVersionInsert = Omit<ContentVersion, 'id' | 'created_at' | 'created_by'>
export type ContentVersionUpdate = Partial<Omit<ContentVersion, 'id' | 'created_at' | 'created_by'>>

export type TemplateInsert = Omit<Template, 'id' | 'created_at' | 'updated_at'>
export type TemplateUpdate = Partial<TemplateInsert>

export type PersonaInsert = Omit<Persona, 'id' | 'created_at' | 'updated_at'>
export type PersonaUpdate = Partial<PersonaInsert>

export type GeneratedImageInsert = Omit<GeneratedImage, 'id' | 'created_at'>
export type StudentProgressInsert = Omit<StudentProgress, 'id' | 'created_at' | 'updated_at' | 'last_viewed_at'> & { last_viewed_at?: string }
export type StudentProgressUpdate = Partial<Omit<StudentProgress, 'id' | 'user_id' | 'course_id'>>
export type AssessmentInsert = Omit<Assessment, 'id' | 'created_at' | 'updated_at'>
export type AssessmentUpdate = Partial<AssessmentInsert>

export type GenerationJobInsert = Omit<GenerationJob, 'id' | 'created_at' | 'started_at' | 'completed_at'>
export type GenerationJobUpdate = Partial<Omit<GenerationJob, 'id' | 'created_at' | 'user_id'>>
