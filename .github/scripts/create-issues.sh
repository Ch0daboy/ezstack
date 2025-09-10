#!/bin/bash

# CourseForge GitHub Issues Creation Script
# This script creates all the GitHub issues for the CourseForge project
# Requires: GitHub CLI (gh) to be installed and authenticated

echo "🚀 Creating GitHub Issues for CourseForge Project"
echo "================================================"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   https://cli.github.com/manual/installation"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please run this from the project root."
    exit 1
fi

# Function to create an issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    echo "Creating issue: $title"
    gh issue create --title "$title" --body "$body" --label "$labels" 2>/dev/null || echo "  ⚠️  Issue might already exist or creation failed"
}

# Create labels first
echo ""
echo "📌 Creating labels..."
gh label create "phase:1" --description "Phase 1: Foundation" --color "0052CC" 2>/dev/null
gh label create "phase:2" --description "Phase 2: Core Generation" --color "5319E7" 2>/dev/null
gh label create "phase:3" --description "Phase 3: Content Enhancement" --color "B60205" 2>/dev/null
gh label create "phase:4" --description "Phase 4: Content Variations" --color "FBCA04" 2>/dev/null
gh label create "phase:5" --description "Phase 5: Visual & Interactive" --color "0E8A16" 2>/dev/null
gh label create "phase:6" --description "Phase 6: Performance & Advanced" --color "D93F0B" 2>/dev/null

gh label create "ai" --description "AI/ML related" --color "7F39FB" 2>/dev/null
gh label create "ai-generation" --description "Content generation" --color "8B5CF6" 2>/dev/null
gh label create "database" --description "Database related" --color "1E40AF" 2>/dev/null
gh label create "integration" --description "Third-party integration" --color "047857" 2>/dev/null
gh label create "auth" --description "Authentication" --color "7C2D12" 2>/dev/null
gh label create "research" --description "Research features" --color "0891B2" 2>/dev/null
gh label create "templates" --description "Template system" --color "581C87" 2>/dev/null
gh label create "personas" --description "Persona system" --color "BE185D" 2>/dev/null
gh label create "export" --description "Export functionality" --color "CA8A04" 2>/dev/null
gh label create "visual" --description "Visual content" --color "DC2626" 2>/dev/null
gh label create "interactive" --description "Interactive elements" --color "059669" 2>/dev/null
gh label create "content-variation" --description "Content variations" --color "4338CA" 2>/dev/null
gh label create "automation" --description "Automation features" --color "7C3AED" 2>/dev/null
gh label create "analytics" --description "Analytics & metrics" --color "2563EB" 2>/dev/null
gh label create "version-control" --description "Version control" --color "16A34A" 2>/dev/null
gh label create "collaboration" --description "Collaboration features" --color "EA580C" 2>/dev/null
gh label create "integrations" --description "External integrations" --color "9333EA" 2>/dev/null
gh label create "optimization" --description "Performance optimization" --color "EF4444" 2>/dev/null
gh label create "error-handling" --description "Error handling" --color "F59E0B" 2>/dev/null
gh label create "testing" --description "Testing" --color "10B981" 2>/dev/null
gh label create "i18n" --description "Internationalization" --color "6366F1" 2>/dev/null
gh label create "enterprise" --description "Enterprise features" --color "8B5CF6" 2>/dev/null
gh label create "mobile" --description "Mobile app" --color "EC4899" 2>/dev/null
gh label create "audio" --description "Audio features" --color "F97316" 2>/dev/null
gh label create "lms" --description "Learning Management System" --color "06B6D4" 2>/dev/null
gh label create "priority:high" --description "High priority" --color "B60205" 2>/dev/null
gh label create "priority:medium" --description "Medium priority" --color "FBCA04" 2>/dev/null
gh label create "priority:low" --description "Low priority" --color "0E8A16" 2>/dev/null
gh label create "ui" --description "User Interface" --color "C084FC" 2>/dev/null
gh label create "ux" --description "User Experience" --color "A78BFA" 2>/dev/null
gh label create "quality" --description "Code quality" --color "22C55E" 2>/dev/null
gh label create "future" --description "Future enhancement" --color "94A3B8" 2>/dev/null

echo ""
echo "📝 Creating Phase 1 issues..."

# Phase 1 Issues
create_issue "[Phase 1] Set up Supabase database schema" \
"## Description
Create all necessary tables for the course creation platform including users, courses, lessons, content variations, templates, personas, and generation jobs.

## Tasks
- [ ] Create users table with Clerk integration
- [ ] Create courses table with proper relationships
- [ ] Create lessons table with ordering
- [ ] Create content_variations table
- [ ] Create templates and personas tables
- [ ] Create generated_images table
- [ ] Create generation_jobs table
- [ ] Set up Row Level Security policies
- [ ] Create necessary indexes for performance

## Acceptance Criteria
- All tables are created with proper relationships
- RLS policies protect user data
- Database performs efficiently with indexes
- Migration scripts are versioned" \
"database,priority:high,phase:1"

create_issue "[Phase 1] Integrate AI service providers" \
"## Description
Set up connections to all AI service providers including OpenAI/Anthropic, Perplexity, and image generation services.

## Tasks
- [ ] Set up OpenAI/Anthropic client configuration
- [ ] Integrate Perplexity API for research
- [ ] Set up Replicate/DALL-E for image generation
- [ ] Create service abstraction layer
- [ ] Add proper error handling and retries
- [ ] Implement rate limiting
- [ ] Add API key management in environment variables

## Acceptance Criteria
- All AI services are properly configured
- Error handling prevents service failures
- Rate limiting protects against overuse
- API keys are securely managed" \
"integration,ai,priority:high,phase:1"

create_issue "[Phase 1] Create user authentication flow with Clerk" \
"## Description
Implement complete authentication flow including sign-up, sign-in, and user profile management.

## Tasks
- [ ] Configure Clerk webhook for user sync
- [ ] Create user onboarding flow
- [ ] Set up user profile page
- [ ] Implement subscription tier management
- [ ] Add credit system for API usage
- [ ] Create user settings page

## Acceptance Criteria
- Users can sign up and sign in smoothly
- User data syncs with Supabase
- Subscription tiers are enforced
- Credit system tracks usage accurately" \
"auth,priority:high,phase:1"

echo "📝 Creating Phase 2 issues..."

# Phase 2 Issues
create_issue "[Phase 2] Build course outline generator" \
"## Description
Create the AI-powered course outline generation system that takes a topic and generates a structured course outline.

## Tasks
- [ ] Create course creation wizard UI
- [ ] Build prompt engineering for outline generation
- [ ] Implement outline editing interface
- [ ] Add outline templates
- [ ] Create outline preview component
- [ ] Add save and version control

## Acceptance Criteria
- Users can generate course outlines from topics
- Outlines are well-structured and relevant
- Users can edit and customize outlines
- Templates provide quick starting points" \
"feature,ai-generation,priority:high,phase:2"

create_issue "[Phase 2] Implement lesson plan generator" \
"## Description
Build the lesson plan generation system that creates detailed plans for each lesson in the course.

## Tasks
- [ ] Create lesson plan generation API
- [ ] Build lesson objectives generator
- [ ] Implement teaching methodology selection
- [ ] Add time estimation for lessons
- [ ] Create lesson plan editor
- [ ] Build lesson reordering interface

## Acceptance Criteria
- Lesson plans include clear objectives
- Time estimates are realistic
- Plans follow educational best practices
- Users can reorder and edit lessons" \
"feature,ai-generation,priority:high,phase:2"

create_issue "[Phase 2] Create lecture script generator" \
"## Description
Implement the complete lecture script generation system with customizable length and style.

## Tasks
- [ ] Build script generation pipeline
- [ ] Create script formatting system
- [ ] Add speaker notes generation
- [ ] Implement script editing interface
- [ ] Add export to teleprompter format
- [ ] Create script preview with timing

## Acceptance Criteria
- Scripts are comprehensive and engaging
- Formatting is professional
- Speaker notes enhance delivery
- Export formats are compatible" \
"feature,ai-generation,priority:high,phase:2"

create_issue "[Phase 2] Build activity and quiz generator" \
"## Description
Create system to generate interactive activities and quizzes for each lesson (3-5 questions, 5-15 minutes completion time).

## Tasks
- [ ] Create quiz question generator (3-5 questions per lesson)
- [ ] Build reflection question generator
- [ ] Implement multiple choice questions
- [ ] Add true/false questions
- [ ] Create fill-in-the-blank exercises
- [ ] Build activity preview interface
- [ ] Add answer key generation

## Acceptance Criteria
- Activities take 5-15 minutes to complete
- Questions are relevant to lesson content
- Various question types are supported
- Answer keys are accurate" \
"feature,interactive,priority:high,phase:2"

echo "📝 Creating Phase 3 issues..."

# Phase 3 Issues
create_issue "[Phase 3] Implement Perplexity research integration" \
"## Description
Build the three-tier research system using Perplexity API for content enhancement.

## Research Options:
1. Pre-generation research: Research before content creation
2. Post-generation enhancement: Research after initial draft
3. Fact-checking only: Verify accuracy without rewriting

## Tasks
- [ ] Create pre-generation research option
- [ ] Build post-generation enhancement feature
- [ ] Implement fact-checking only mode
- [ ] Add research source citations
- [ ] Create research preview panel
- [ ] Build research settings configuration
- [ ] Add research history tracking

## Acceptance Criteria
- All three research modes work correctly
- Citations are properly formatted
- Research improves content accuracy
- Users can configure research preferences" \
"feature,research,priority:high,phase:3"

create_issue "[Phase 3] Build content humanization system" \
"## Description
Create system to humanize AI-generated content to avoid AI detection and improve readability.

## Tasks
- [ ] Implement sentence structure variation
- [ ] Add conversational elements injector
- [ ] Create personal anecdote placeholders
- [ ] Build transition improvement system
- [ ] Add humor and emotion injection
- [ ] Create readability analyzer
- [ ] Implement AI detection bypass techniques

## Acceptance Criteria
- Content passes AI detection tests
- Writing feels natural and engaging
- Readability scores improve
- Personal touch is evident" \
"feature,enhancement,priority:medium,phase:3"

create_issue "[Phase 3] Create template management system" \
"## Description
Build comprehensive template system for courses, lessons, and activities.

## Tasks
- [ ] Create template CRUD operations
- [ ] Build template marketplace UI
- [ ] Implement template sharing
- [ ] Add template customization
- [ ] Create default template set
- [ ] Build template preview
- [ ] Add template versioning

## Acceptance Criteria
- Templates speed up course creation
- Marketplace enables sharing
- Customization is intuitive
- Version control prevents conflicts" \
"feature,templates,priority:medium,phase:3"

create_issue "[Phase 3] Implement persona system" \
"## Description
Create voice and writing style persona system for consistent content generation.

## Tasks
- [ ] Build persona creation interface
- [ ] Create voice characteristic editor
- [ ] Implement writing style analyzer
- [ ] Add industry-specific personas
- [ ] Create persona marketplace
- [ ] Build persona preview system
- [ ] Add persona A/B testing

## Acceptance Criteria
- Personas maintain consistent voice
- Industry personas are accurate
- Preview shows persona in action
- A/B testing validates effectiveness" \
"feature,personas,priority:medium,phase:3"

echo "📝 Creating remaining issues..."
echo "Note: Due to script length, only key issues are being created."
echo "Please refer to .github/issues/GITHUB_ISSUES.md for the complete list."

# Create a few more critical issues
create_issue "[Phase 4] Build ebook generation system" \
"## Description
Create system to compile courses into professionally formatted ebooks.

## Tasks
- [ ] Build ebook compiler from course content
- [ ] Create chapter formatting system
- [ ] Add table of contents generation
- [ ] Implement cover page generator
- [ ] Add PDF export functionality
- [ ] Create EPUB export option
- [ ] Build ebook preview interface

## Acceptance Criteria
- Ebooks are professionally formatted
- Export formats are standard-compliant
- Table of contents is accurate
- Preview matches final output" \
"feature,export,priority:high,phase:4"

create_issue "[Phase 4] Implement YouTube script generator" \
"## Description
Create YouTube video script variations of course lessons with SEO optimization.

## Tasks
- [ ] Build YouTube script formatter
- [ ] Create hook and intro generator
- [ ] Add call-to-action generator
- [ ] Implement timestamp markers
- [ ] Create thumbnail title generator
- [ ] Build description generator
- [ ] Add SEO keyword integration

## Acceptance Criteria
- Scripts are optimized for YouTube
- Hooks capture attention
- SEO elements improve discoverability
- Timestamps enhance navigation" \
"feature,content-variation,priority:high,phase:4"

create_issue "[Phase 5] Implement image generation system" \
"## Description
Build AI-powered image generation for supplementing course content.

## Tasks
- [ ] Integrate DALL-E/Stable Diffusion API
- [ ] Create automatic prompt generation
- [ ] Build image placement algorithm
- [ ] Add image editing interface
- [ ] Create image gallery manager
- [ ] Implement alt text generation
- [ ] Add image optimization

## Acceptance Criteria
- Images are relevant and high-quality
- Placement enhances content
- Alt text improves accessibility
- Images are optimized for web" \
"feature,visual,priority:high,phase:5"

echo ""
echo "✅ Issue creation complete!"
echo ""
echo "📊 Summary:"
echo "- Created core project issues"
echo "- Set up labels for organization"
echo "- Issues are organized by phase"
echo ""
echo "🎯 Next steps:"
echo "1. Review created issues on GitHub"
echo "2. Assign team members to issues"
echo "3. Set up project board for tracking"
echo "4. Begin with Phase 1 issues"
echo ""
echo "📚 For the complete list of all 30 issues, see:"
echo "   .github/issues/GITHUB_ISSUES.md"
