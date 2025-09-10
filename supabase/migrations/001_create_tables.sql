-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced with Clerk)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT UNIQUE,
  credits_remaining INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  target_audience TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  course_outline JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'published')),
  settings JSONB DEFAULT '{
    "auto_generate_ebook": false,
    "auto_generate_youtube": false,
    "auto_generate_blog": false,
    "research_mode": "none",
    "humanize_content": false,
    "image_generation": true
  }'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lectures/Chapters table
CREATE TABLE IF NOT EXISTS public.lectures (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  lesson_plan JSONB,
  script TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'reviewed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, order_index)
);

-- Lesson Activities table
CREATE TABLE IF NOT EXISTS public.lesson_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('quiz', 'reflection', 'exercise', 'discussion')),
  title TEXT NOT NULL,
  instructions TEXT,
  content JSONB NOT NULL, -- Stores questions, answers, etc.
  estimated_minutes INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ebooks table
CREATE TABLE IF NOT EXISTS public.ebooks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT,
  cover_image_url TEXT,
  content JSONB, -- Structured content with chapters
  format TEXT DEFAULT 'markdown' CHECK (format IN ('markdown', 'html', 'pdf')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- YouTube Scripts table
CREATE TABLE IF NOT EXISTS public.youtube_scripts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hook TEXT,
  main_content TEXT NOT NULL,
  call_to_action TEXT,
  tags TEXT[],
  thumbnail_prompt TEXT,
  estimated_duration_seconds INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blog Posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  meta_description TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  tags TEXT[],
  seo_keywords TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- Generated Images table
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT CHECK (image_type IN ('course_cover', 'lecture_illustration', 'ebook_cover', 'blog_featured', 'youtube_thumbnail')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research Results table (for Perplexity API results)
CREATE TABLE IF NOT EXISTS public.research_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE,
  research_type TEXT NOT NULL CHECK (research_type IN ('pre_generation', 'post_generation', 'fact_check')),
  query TEXT NOT NULL,
  results JSONB NOT NULL,
  sources JSONB,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Versions table (for tracking edits and humanization)
CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('course_outline', 'lecture_script', 'ebook_chapter', 'youtube_script', 'blog_post')),
  content_id UUID NOT NULL, -- References the specific content item
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  changes_made TEXT,
  is_humanized BOOLEAN DEFAULT false,
  ai_detection_score FLOAT, -- Optional score from AI detection
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Generation Queue table (for async processing)
CREATE TABLE IF NOT EXISTS public.generation_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('course_outline', 'lecture_script', 'ebook', 'youtube_script', 'blog_post', 'image', 'research', 'humanize')),
  job_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5,
  error_message TEXT,
  result JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  default_ai_model TEXT DEFAULT 'gpt-4',
  default_image_model TEXT DEFAULT 'dall-e-3',
  writing_style TEXT DEFAULT 'professional',
  content_tone TEXT DEFAULT 'educational',
  language TEXT DEFAULT 'en',
  research_depth TEXT DEFAULT 'moderate' CHECK (research_depth IN ('light', 'moderate', 'comprehensive')),
  humanization_level TEXT DEFAULT 'moderate' CHECK (humanization_level IN ('light', 'moderate', 'heavy')),
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_courses_user_id ON public.courses(user_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_lectures_course_id ON public.lectures(course_id);
CREATE INDEX idx_lectures_status ON public.lectures(status);
CREATE INDEX idx_ebooks_course_id ON public.ebooks(course_id);
CREATE INDEX idx_youtube_scripts_lecture_id ON public.youtube_scripts(lecture_id);
CREATE INDEX idx_youtube_scripts_course_id ON public.youtube_scripts(course_id);
CREATE INDEX idx_blog_posts_lecture_id ON public.blog_posts(lecture_id);
CREATE INDEX idx_blog_posts_course_id ON public.blog_posts(course_id);
CREATE INDEX idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX idx_generation_queue_user_id ON public.generation_queue(user_id);
CREATE INDEX idx_generation_queue_status ON public.generation_queue(status);
CREATE INDEX idx_content_versions_content_type_id ON public.content_versions(content_type, content_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid()::text = clerk_id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can CRUD own courses" ON public.courses FOR ALL USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text));
CREATE POLICY "Users can CRUD own lectures" ON public.lectures FOR ALL USING (course_id IN (SELECT id FROM public.courses WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text)));
CREATE POLICY "Users can CRUD own lesson activities" ON public.lesson_activities FOR ALL USING (lecture_id IN (SELECT id FROM public.lectures WHERE course_id IN (SELECT id FROM public.courses WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text))));
CREATE POLICY "Users can CRUD own ebooks" ON public.ebooks FOR ALL USING (course_id IN (SELECT id FROM public.courses WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text)));
CREATE POLICY "Users can CRUD own youtube scripts" ON public.youtube_scripts FOR ALL USING (course_id IN (SELECT id FROM public.courses WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text)));
CREATE POLICY "Users can CRUD own blog posts" ON public.blog_posts FOR ALL USING (course_id IN (SELECT id FROM public.courses WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text)));
CREATE POLICY "Users can CRUD own images" ON public.generated_images FOR ALL USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text));
CREATE POLICY "Users can CRUD own research" ON public.research_results FOR ALL USING (course_id IN (SELECT id FROM public.courses WHERE user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text)));
CREATE POLICY "Users can view own content versions" ON public.content_versions FOR SELECT USING (created_by IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text));
CREATE POLICY "Users can CRUD own generation queue" ON public.generation_queue FOR ALL USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text));
CREATE POLICY "Users can CRUD own preferences" ON public.user_preferences FOR ALL USING (user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.uid()::text));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lectures_updated_at BEFORE UPDATE ON public.lectures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ebooks_updated_at BEFORE UPDATE ON public.ebooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_youtube_scripts_updated_at BEFORE UPDATE ON public.youtube_scripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
