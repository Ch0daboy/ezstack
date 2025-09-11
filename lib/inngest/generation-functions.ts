import { inngest } from './client'
import { bedrockService } from '@/lib/ai/bedrock'
import { 
  courseOperations, 
  lessonOperations, 
  generationJobOperations,
  userOperations,
  contentVariationOperations,
  contentVersionOperations
} from '@/lib/db/helpers'
import type { CourseUpdate, LessonUpdate } from '@/lib/types/database'

// Process course outline generation
export const processCourseOutline = inngest.createFunction(
  {
    id: 'process-course-outline',
    name: 'Process Course Outline Generation',
    retries: 3,
  },
  { event: 'generation/course.outline.requested' },
  async ({ event, step }) => {
    const { jobId, userId, courseId, config } = event.data

    // Step 1: Start the job
    await step.run('start-job', async () => {
      await generationJobOperations.startJob(jobId)
    })

    // Step 2: Generate the outline
    const outline = await step.run('generate-outline', async () => {
      return await bedrockService.generateCourseOutline(
        config.topic,
        config.targetAudience || 'General learners',
        config.difficulty || 'Intermediate',
        {
          temperature: config.temperature || 0.7,
          systemPrompt: config.systemPrompt
        }
      )
    })

    // Step 3: Update the course
    await step.run('update-course', async () => {
      const courseUpdate: CourseUpdate = {
        outline: {
          modules: outline.modules,
          duration: outline.totalDuration?.toString(),
          target_audience: config.targetAudience,
          learning_objectives: outline.objectives,
          prerequisites: config.prerequisites || []
        },
        status: 'complete'
      }
      await courseOperations.update(courseId, courseUpdate)
    })

    // Step 4: Complete the job
    await step.run('complete-job', async () => {
      await generationJobOperations.completeJob(jobId, {
        content: outline,
        metadata: {
          moduleCount: outline.modules.length,
          totalDuration: outline.totalDuration,
          objectivesCount: outline.objectives.length
        }
      })
    })

    // Step 5: Deduct credits
    await step.run('deduct-credits', async () => {
      const user = await userOperations.getById(userId)
      if (user) {
        await userOperations.updateCredits(
          userId, 
          Math.max(0, user.credits_remaining - 5)
        )
      }
    })

    // Step 6: Send notification
    await step.sendEvent('send-notification', {
      name: 'notification/email.send',
      data: {
        userId,
        type: 'generation_complete',
        subject: 'Course Outline Generated',
        data: {
          courseId,
          jobId,
          moduleCount: outline.modules.length
        }
      }
    })

    return { success: true, jobId, courseId }
  }
)

// Process lesson plan generation
export const processLessonPlan = inngest.createFunction(
  {
    id: 'process-lesson-plan',
    name: 'Process Lesson Plan Generation',
    retries: 3,
  },
  { event: 'generation/lesson.plan.requested' },
  async ({ event, step }) => {
    const { jobId, userId, courseId, lessonId, config } = event.data

    // Step 1: Start the job
    await step.run('start-job', async () => {
      await generationJobOperations.startJob(jobId)
    })

    // Step 2: Get course context
    const course = await step.run('get-course', async () => {
      return await courseOperations.getById(courseId)
    })

    // Step 3: Generate the lesson plan
    const lessonPlan = await step.run('generate-plan', async () => {
      return await bedrockService.generateLessonPlan(
        config.lessonTitle,
        config.moduleContext || `Part of course: ${course.title}`,
        config.objectives || ['Understand key concepts', 'Apply learning practically'],
        {
          temperature: config.temperature || 0.7,
          systemPrompt: config.systemPrompt
        }
      )
    })

    // Step 4: Update the lesson
    await step.run('update-lesson', async () => {
      const lessonUpdate: LessonUpdate = {
        objectives: lessonPlan.objectives,
        lesson_plan: {
          introduction: lessonPlan.introduction,
          main_content: lessonPlan.mainContent,
          conclusion: lessonPlan.summary,
          duration_minutes: lessonPlan.activity?.estimatedMinutes,
          materials_needed: [],
          key_concepts: lessonPlan.mainContent.flatMap(section => section.keyPoints)
        },
        activities: lessonPlan.activity ? [{
          type: lessonPlan.activity.type,
          title: lessonPlan.activity.title,
          description: lessonPlan.activity.instructions,
          instructions: lessonPlan.activity.instructions,
          duration_minutes: lessonPlan.activity.estimatedMinutes,
          resources: lessonPlan.resources || [],
          assessment_criteria: []
        }] : [],
        status: 'complete'
      }
      await lessonOperations.update(lessonId, lessonUpdate)
    })

    // Step 5: Complete the job
    await step.run('complete-job', async () => {
      await generationJobOperations.completeJob(jobId, {
        content: lessonPlan,
        metadata: {
          objectivesCount: lessonPlan.objectives.length,
          sectionsCount: lessonPlan.mainContent.length,
          hasActivity: !!lessonPlan.activity
        }
      })
    })

    // Step 6: Deduct credits
    await step.run('deduct-credits', async () => {
      const user = await userOperations.getById(userId)
      if (user) {
        await userOperations.updateCredits(
          userId, 
          Math.max(0, user.credits_remaining - 3)
        )
      }
    })

    return { success: true, jobId, lessonId }
  }
)

// Process script generation
export const processScriptGeneration = inngest.createFunction(
  {
    id: 'process-script-generation',
    name: 'Process Script Generation',
    retries: 3,
  },
  { event: 'generation/script.requested' },
  async ({ event, step }) => {
    const { jobId, userId, courseId, lessonId, config } = event.data

    // Step 1: Start the job
    await step.run('start-job', async () => {
      await generationJobOperations.startJob(jobId)
    })

    // Step 2: Get lesson data
    const lesson = await step.run('get-lesson', async () => {
      return await lessonOperations.getById(lessonId)
    })

    // Step 3: Prepare lesson plan
    const lessonPlan = await step.run('prepare-plan', async () => {
      return {
        lectureTitle: lesson.title,
        objectives: lesson.objectives,
        introduction: lesson.lesson_plan?.introduction || '',
        mainContent: lesson.lesson_plan?.main_content || [],
        summary: lesson.lesson_plan?.conclusion || '',
        activity: lesson.activities?.[0] ? {
          type: lesson.activities[0].type as any,
          title: lesson.activities[0].title,
          instructions: lesson.activities[0].instructions,
          estimatedMinutes: lesson.activities[0].duration_minutes || 10
        } : undefined
      }
    })

    // Step 4: Generate the script
    const script = await step.run('generate-script', async () => {
      return await bedrockService.generateLectureScript(
        lessonPlan,
        config.duration || 15,
        config.style || 'conversational',
        {
          temperature: config.temperature || 0.8,
          systemPrompt: config.systemPrompt,
          maxTokens: config.maxTokens || 6000
        }
      )
    })

    // Step 5: Calculate metrics
    const metrics = await step.run('calculate-metrics', async () => {
      const wordCount = script.split(/\s+/).length
      const estimatedSpeakingTime = Math.round(wordCount / 150)
      return { wordCount, estimatedSpeakingTime }
    })

    // Step 6: Update the lesson
    await step.run('update-lesson', async () => {
      const lessonUpdate: LessonUpdate = {
        script,
        status: 'complete'
      }
      await lessonOperations.update(lessonId, lessonUpdate)
    })

    // Step 7: Complete the job
    await step.run('complete-job', async () => {
      await generationJobOperations.completeJob(jobId, {
        content: script,
        metadata: {
          ...metrics,
          targetDuration: config.duration || 15,
          style: config.style || 'conversational'
        }
      })
    })

    // Step 8: Deduct credits
    await step.run('deduct-credits', async () => {
      const user = await userOperations.getById(userId)
      if (user) {
        await userOperations.updateCredits(
          userId, 
          Math.max(0, user.credits_remaining - 4)
        )
      }
    })

    return { success: true, jobId, lessonId, metrics }
  }
)

// Batch process multiple generation jobs
export const processBatchGeneration = inngest.createFunction(
  {
    id: 'process-batch-generation',
    name: 'Process Batch Generation',
    concurrency: {
      limit: 5, // Process max 5 jobs concurrently
    },
  },
  { event: 'generation/batch.requested' },
  async ({ event, step }) => {
    const { jobIds, type, userId } = event.data

    const results = []

    // Process each job
    for (const jobId of jobIds) {
      const result = await step.run(`process-job-${jobId}`, async () => {
        try {
          const job = await generationJobOperations.getById(jobId)
          
          // Trigger appropriate generation event based on type
          await inngest.send({
            name: `generation/${type}.requested`,
            data: {
              jobId: job.id,
              userId: job.user_id,
              courseId: job.course_id,
              lessonId: job.config.lessonId,
              config: job.config
            }
          })

          return { jobId, status: 'queued' }
        } catch (error) {
          console.error(`Failed to process job ${jobId}:`, error)
          return { jobId, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
        }
      })
      
      results.push(result)
    }

    // Send summary notification
    await step.sendEvent('send-batch-complete', {
      name: 'notification/email.send',
      data: {
        userId,
        type: 'batch_generation_complete',
        subject: 'Batch Generation Complete',
        data: {
          totalJobs: jobIds.length,
          successful: results.filter(r => r.status === 'queued').length,
          failed: results.filter(r => r.status === 'failed').length
        }
      }
    })

    return { results }
  }
)

// Retry failed generation jobs
export const retryFailedGeneration = inngest.createFunction(
  {
    id: 'retry-failed-generation',
    name: 'Retry Failed Generation',
  },
  { event: 'generation/retry.requested' },
  async ({ event, step }) => {
    const { jobId } = event.data

    // Get the failed job
    const job = await step.run('get-job', async () => {
      return await generationJobOperations.getById(jobId)
    })

    if (job.status !== 'failed') {
      return { error: 'Job is not in failed state' }
    }

    // Reset job status
    await step.run('reset-job', async () => {
      await generationJobOperations.update(jobId, {
        status: 'pending',
        error_message: null
      })
    })

    // Trigger generation based on job type
    await step.sendEvent('trigger-generation', {
      name: `generation/${job.type.replace('_', '.')}.requested`,
      data: {
        jobId: job.id,
        userId: job.user_id,
        courseId: job.course_id,
        lessonId: job.config.lessonId,
        config: job.config
      }
    })

    return { success: true, jobId }
  }
)

// Process content variation generation (YouTube, Blog, Ebook)
export const processContentVariation = inngest.createFunction(
  {
    id: 'process-content-variation',
    name: 'Process Content Variation Generation',
    retries: 3,
  },
  { event: 'generation/content_variation.requested' },
  async ({ event, step }) => {
    const { jobId, userId, courseId, lessonId, config } = event.data as any

    // Step 1: Start the job
    await step.run('start-job', async () => {
      await generationJobOperations.startJob(jobId)
    })

    // Step 2: Get lesson data
    const lesson = await step.run('get-lesson', async () => {
      return await lessonOperations.getById(lessonId)
    })

    if (!lesson.script) {
      throw new Error('Lesson must have a script to generate variations')
    }

    // Step 3: Generate variation
    const { variationType, options = {} } = config

    const { content, metadata } = await step.run('generate-variation', async () => {
      switch (variationType) {
        case 'youtube_script': {
          const yt = await bedrockService.generateYouTubeScript(
            lesson.title,
            lesson.objectives,
            options.duration || 10,
            { temperature: options.temperature || 0.8 }
          )
          return {
            content: `# ${yt.title}\n\n## Hook (0:00 - 0:15)\n${yt.hook}\n\n## Main Content\n${yt.mainContent}\n\n## Call to Action\n${yt.callToAction}\n\n## Tags\n${yt.tags.join(', ')}\n`,
            metadata: {
              title: yt.title,
              tags: yt.tags,
              thumbnailPrompt: yt.thumbnailPrompt,
              duration: options.duration || 10,
            },
          }
        }
        case 'blog_post': {
          const blog = await bedrockService.generateBlogPost(
            lesson.title,
            lesson.objectives,
            options.seoKeywords || [],
            { temperature: options.temperature || 0.7 }
          )
          return {
            content: blog.content,
            metadata: {
              title: blog.title,
              metaDescription: blog.metaDescription,
              tags: blog.tags,
              imagePrompts: blog.imagePrompts,
            },
          }
        }
        case 'ebook_chapter': {
          const ebook = await bedrockService.generateEbookChapter(
            lesson.title,
            lesson.objectives,
            options.previousContext || '',
            { temperature: options.temperature || 0.7 }
          )
          return {
            content: ebook.content,
            metadata: {
              title: ebook.title,
              keyTakeaways: ebook.keyTakeaways,
              exercises: ebook.exercises,
            },
          }
        }
        default:
          throw new Error('Invalid variation type')
      }
    })

    // Step 4: Save variation
    const variation = await step.run('save-variation', async () => {
      return await contentVariationOperations.create({
        lesson_id: lessonId,
        type: config.variationType,
        content,
        metadata,
      })
    })

    // Step 5: Create version record (v1)
    await step.run('create-version', async () => {
      await contentVersionOperations.create({
        content_type: config.variationType,
        content_id: variation.id,
        version_number: 1,
        content: { content, metadata },
        changes_made: 'Initial generation',
        is_humanized: false,
        ai_detection_score: null,
        created_by: userId,
      } as any)
    })

    // Step 6: Complete the job
    await step.run('complete-job', async () => {
      await generationJobOperations.completeJob(jobId, {
        variationId: variation.id,
        content,
        metadata,
      })
    })

    return { success: true, jobId, variationId: variation.id }
  }
)
