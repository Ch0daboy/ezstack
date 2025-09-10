-- Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  objectives TEXT[] DEFAULT ARRAY[]::TEXT[],
  lesson_plan JSONB DEFAULT '{}',
  script TEXT,
  activities JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'complete', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique order per course
  UNIQUE(course_id, order_index)
);

-- Create indexes for performance
CREATE INDEX idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX idx_lessons_order ON public.lessons(course_id, order_index);
CREATE INDEX idx_lessons_status ON public.lessons(status);

-- Enable Row Level Security
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view lessons from their own courses
CREATE POLICY "Users can view own lessons" ON public.lessons
  FOR SELECT USING (
    course_id IN (
      SELECT c.id FROM public.courses c
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Users can create lessons for their own courses
CREATE POLICY "Users can create own lessons" ON public.lessons
  FOR INSERT WITH CHECK (
    course_id IN (
      SELECT c.id FROM public.courses c
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Users can update lessons from their own courses
CREATE POLICY "Users can update own lessons" ON public.lessons
  FOR UPDATE USING (
    course_id IN (
      SELECT c.id FROM public.courses c
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Users can delete lessons from their own courses
CREATE POLICY "Users can delete own lessons" ON public.lessons
  FOR DELETE USING (
    course_id IN (
      SELECT c.id FROM public.courses c
      JOIN public.users u ON c.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Trigger to automatically update updated_at
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant access to authenticated users
GRANT ALL ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
