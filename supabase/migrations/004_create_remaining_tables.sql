-- Create content_variations table
CREATE TABLE IF NOT EXISTS public.content_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ebook_chapter', 'youtube_script', 'blog_post')),
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_variations_lesson_id ON public.content_variations(lesson_id);
CREATE INDEX idx_content_variations_type ON public.content_variations(type);

-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- null for system templates
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('course', 'lesson', 'activity')),
  structure JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_user_id ON public.templates(user_id);
CREATE INDEX idx_templates_type ON public.templates(type);
CREATE INDEX idx_templates_public ON public.templates(is_public) WHERE is_public = true;

-- Create personas table
CREATE TABLE IF NOT EXISTS public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- null for system personas
  name TEXT NOT NULL,
  voice_characteristics JSONB DEFAULT '{}',
  writing_style TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personas_user_id ON public.personas(user_id);
CREATE INDEX idx_personas_public ON public.personas(is_public) WHERE is_public = true;

-- Create generated_images table
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_images_lesson_id ON public.generated_images(lesson_id);

-- Create generation_jobs table
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  config JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_course_id ON public.generation_jobs(course_id);
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX idx_generation_jobs_created_at ON public.generation_jobs(created_at DESC);

-- Enable RLS for content_variations
ALTER TABLE public.content_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content variations" ON public.content_variations
  FOR SELECT USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON l.course_id = c.id
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own content variations" ON public.content_variations
  FOR INSERT WITH CHECK (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON l.course_id = c.id
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own content variations" ON public.content_variations
  FOR UPDATE USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON l.course_id = c.id
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own content variations" ON public.content_variations
  FOR DELETE USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON l.course_id = c.id
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Enable RLS for templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public and own templates" ON public.templates
  FOR SELECT USING (
    is_public = true OR 
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own templates" ON public.templates
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own templates" ON public.templates
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own templates" ON public.templates
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- Enable RLS for personas
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public and own personas" ON public.personas
  FOR SELECT USING (
    is_public = true OR 
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own personas" ON public.personas
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own personas" ON public.personas
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own personas" ON public.personas
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- Enable RLS for generated_images
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated images" ON public.generated_images
  FOR SELECT USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON l.course_id = c.id
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own generated images" ON public.generated_images
  FOR INSERT WITH CHECK (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON l.course_id = c.id
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own generated images" ON public.generated_images
  FOR DELETE USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON l.course_id = c.id
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Enable RLS for generation_jobs
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation jobs" ON public.generation_jobs
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own generation jobs" ON public.generation_jobs
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own generation jobs" ON public.generation_jobs
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- Add update triggers for tables with updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant access to authenticated users
GRANT ALL ON public.content_variations TO authenticated;
GRANT ALL ON public.templates TO authenticated;
GRANT ALL ON public.personas TO authenticated;
GRANT ALL ON public.generated_images TO authenticated;
GRANT ALL ON public.generation_jobs TO authenticated;
GRANT ALL ON public.content_variations TO service_role;
GRANT ALL ON public.templates TO service_role;
GRANT ALL ON public.personas TO service_role;
GRANT ALL ON public.generated_images TO service_role;
GRANT ALL ON public.generation_jobs TO service_role;
