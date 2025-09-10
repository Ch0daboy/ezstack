# CourseForge - AI-Powered Course & Content Creation Platform

## 🎯 Project Vision
Transform content creators' ideas into comprehensive online courses, ebooks, and marketing content using AI-powered generation with fact-checking and humanization capabilities.

## 🏗️ Architecture Overview

### Core Features
1. **Multi-Stage Course Generation**
   - Course outline creation
   - Lesson plan development
   - Complete lecture script generation
   - Interactive activities & quizzes

2. **Content Diversification**
   - Automatic ebook generation
   - YouTube script creation
   - Blog post generation
   - Supplementary image generation

3. **Content Enhancement**
   - Perplexity API integration for research
   - Fact-checking capabilities
   - Content humanization
   - Template & persona system

## 📊 Database Schema

### Core Tables
```sql
-- Users (extends Clerk auth)
users
  - id (uuid, primary key)
  - clerk_id (text, unique)
  - subscription_tier (text)
  - credits_remaining (integer)
  - settings (jsonb)

-- Courses
courses
  - id (uuid, primary key)
  - user_id (uuid, foreign key)
  - title (text)
  - topic (text)
  - description (text)
  - outline (jsonb)
  - settings (jsonb) -- includes research preferences
  - status (text) -- draft, generating, complete
  - created_at (timestamp)
  - updated_at (timestamp)

-- Lessons
lessons
  - id (uuid, primary key)
  - course_id (uuid, foreign key)
  - order_index (integer)
  - title (text)
  - objectives (text[])
  - lesson_plan (jsonb)
  - script (text)
  - activities (jsonb)
  - status (text)

-- Content Variations
content_variations
  - id (uuid, primary key)
  - lesson_id (uuid, foreign key)
  - type (text) -- ebook_chapter, youtube_script, blog_post
  - content (text)
  - metadata (jsonb)
  - created_at (timestamp)

-- Templates
templates
  - id (uuid, primary key)
  - user_id (uuid, nullable) -- null for system templates
  - name (text)
  - type (text) -- course, lesson, activity
  - structure (jsonb)
  - is_public (boolean)

-- Personas
personas
  - id (uuid, primary key)
  - user_id (uuid, nullable)
  - name (text)
  - voice_characteristics (jsonb)
  - writing_style (text)
  - is_public (boolean)

-- Generated Images
generated_images
  - id (uuid, primary key)
  - lesson_id (uuid, foreign key)
  - prompt (text)
  - url (text)
  - alt_text (text)
  - created_at (timestamp)

-- Generation Jobs
generation_jobs
  - id (uuid, primary key)
  - user_id (uuid, foreign key)
  - course_id (uuid, foreign key)
  - type (text)
  - status (text)
  - config (jsonb)
  - result (jsonb)
  - created_at (timestamp)
  - completed_at (timestamp)
```

## 🛠️ Tech Stack Extensions

### New Dependencies Needed
- **AI/ML APIs**
  - Amazon Bedrock for content generation
  - Perplexity for research & fact-checking
  - Bedrock/Stable Diffusion for image generation
  
- **Document Processing**
  - @react-pdf/renderer for PDF generation
  - mammoth for DOCX export
  - markdown-pdf for markdown conversion
  
- **Content Enhancement**
  - natural for NLP processing
  - compromise for text analysis
  - reading-time for content metrics

- **UI Components**
  - @tiptap/react for rich text editing
  - react-markdown for markdown preview
  - react-beautiful-dnd for drag-drop reordering
  - recharts for analytics visualization

## 🚀 Development Phases

### Phase 1: Foundation (Weeks 1-2)
- Database schema setup
- Basic CRUD operations
- AI service integrations
- Authentication flow

### Phase 2: Core Generation (Weeks 3-4)
- Course outline generation
- Lesson plan creation
- Basic script generation
- Template system

### Phase 3: Content Enhancement (Weeks 5-6)
- Perplexity research integration
- Fact-checking pipeline
- Content humanization
- Persona implementation

### Phase 4: Content Variations (Weeks 7-8)
- Ebook generation
- YouTube script creation
- Blog post generation
- Export functionality

### Phase 5: Interactive Elements (Weeks 9-10)
- Quiz generation
- Activity creation
- Image generation
- Progress tracking

### Phase 6: Polish & Optimization (Weeks 11-12)
- Performance optimization
- UI/UX refinements
- Advanced features
- Testing & deployment

## 🎯 Key Features Breakdown

### 1. Research Integration Options
- **Pre-generation Research**: Gather facts before writing
- **Post-generation Enhancement**: Improve initial draft with research
- **Fact-checking Only**: Verify accuracy without rewriting

### 2. Content Humanization
- Vary sentence structure
- Add personal anecdotes placeholders
- Include conversational elements
- Implement natural transitions

### 3. Template System
- Pre-built course structures
- Customizable lesson formats
- Activity templates
- Export templates

### 4. Persona System
- Tone of voice presets
- Writing style configurations
- Industry-specific personas
- Custom persona creation

### 5. Advanced Features
- Collaborative editing
- Version control for content
- A/B testing for scripts
- Analytics dashboard
- SEO optimization
- Multi-language support
- Content scheduling
- Webhook integrations

## 📈 Success Metrics
- Course completion rate
- Content generation speed
- User satisfaction scores
- Content quality ratings
- Platform engagement metrics

## 🔒 Security & Compliance
- Row-level security for all user data
- API rate limiting
- Content moderation
- GDPR compliance
- Secure API key management

## 💰 Monetization Strategy
- Tiered subscription plans
- Credit-based system for generation
- Premium templates marketplace
- Enterprise API access

## 🗺️ Future Roadmap
- Video generation capabilities
- AI voice narration
- Interactive course player
- Student management system
- Certificate generation
- Payment processing for course sales
- Mobile app development
- Community features
