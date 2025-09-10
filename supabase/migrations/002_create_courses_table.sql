-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  outline JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}', -- includes research preferences
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'complete', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_courses_user_id ON public.courses(user_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_created_at ON public.courses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own courses
CREATE POLICY "Users can view own courses" ON public.courses
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- Users can create their own courses
CREATE POLICY "Users can create own courses" ON public.courses
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- Users can update their own courses
CREATE POLICY "Users can update own courses" ON public.courses
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- Users can delete their own courses
CREATE POLICY "Users can delete own courses" ON public.courses
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = auth.uid()::text
    )
  );

-- Trigger to automatically update updated_at
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant access to authenticated users
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
