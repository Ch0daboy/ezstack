import { marked } from 'marked'
import type { Course, Lesson, ContentVariation } from '@/lib/types/database'

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html'

export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  includeActivities?: boolean
  includeImages?: boolean
  includeVariations?: boolean
  template?: string
  styling?: {
    fontSize?: number
    fontFamily?: string
    lineHeight?: number
    margins?: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }
}

export interface ExportResult {
  success: boolean
  format: ExportFormat
  content?: Buffer | string
  filename: string
  mimeType: string
  size?: number
  error?: string
}

class ExportService {
  // Export a complete course
  async exportCourse(
    course: Course & { lessons?: Lesson[] },
    options: ExportOptions
  ): Promise<ExportResult> {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${this.sanitizeFilename(course.title)}_${timestamp}`

    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportCourseToPDF(course, filename, options)
        case 'docx':
          return await this.exportCourseToDOCX(course, filename, options)
        case 'markdown':
          return this.exportCourseToMarkdown(course, filename, options)
        case 'html':
          return this.exportCourseToHTML(course, filename, options)
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }
    } catch (error) {
      return {
        success: false,
        format: options.format,
        filename: `${filename}.${options.format}`,
        mimeType: this.getMimeType(options.format),
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  // Export a single lesson
  async exportLesson(
    lesson: Lesson,
    options: ExportOptions
  ): Promise<ExportResult> {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${this.sanitizeFilename(lesson.title)}_${timestamp}`

    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportLessonToPDF(lesson, filename, options)
        case 'docx':
          return await this.exportLessonToDOCX(lesson, filename, options)
        case 'markdown':
          return this.exportLessonToMarkdown(lesson, filename, options)
        case 'html':
          return this.exportLessonToHTML(lesson, filename, options)
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }
    } catch (error) {
      return {
        success: false,
        format: options.format,
        filename: `${filename}.${options.format}`,
        mimeType: this.getMimeType(options.format),
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  // Export content variation
  async exportContentVariation(
    variation: ContentVariation,
    lessonTitle: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${this.sanitizeFilename(lessonTitle)}_${variation.type}_${timestamp}`

    try {
      const content = this.formatVariationContent(variation)
      
      switch (options.format) {
        case 'pdf':
          return await this.exportContentToPDF(content, filename, options)
        case 'docx':
          return await this.exportContentToDOCX(content, filename, options)
        case 'markdown':
          return this.exportContentToMarkdown(content, filename, options)
        case 'html':
          return this.exportContentToHTML(content, filename, options)
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }
    } catch (error) {
      return {
        success: false,
        format: options.format,
        filename: `${filename}.${options.format}`,
        mimeType: this.getMimeType(options.format),
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  // PDF Export Methods
  private async exportCourseToPDF(
    course: Course & { lessons?: Lesson[] },
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    return {
      success: false,
      format: 'pdf',
      filename: `${filename}.pdf`,
      mimeType: 'application/pdf',
      error: 'PDF export not available - install pdfkit to enable'
    }
    /*
    try {
      // Dynamic import to avoid SSR issues
      const PDFDocument = (await import('pdfkit')).default
    
    const doc = new PDFDocument({
      margins: options.styling?.margins || {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      }
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Add title page
    doc.fontSize(24).text(course.title, { align: 'center' })
    doc.moveDown()
    doc.fontSize(14).text(course.description || '', { align: 'center' })
    doc.addPage()

    // Add table of contents
    doc.fontSize(18).text('Table of Contents', { underline: true })
    doc.moveDown()

    if (course.lessons) {
      course.lessons.forEach((lesson, index) => {
        doc.fontSize(12).text(`${index + 1}. ${lesson.title}`)
      })
    }
    doc.addPage()

    // Add course outline if available
    if (course.outline && Object.keys(course.outline).length > 0) {
      doc.fontSize(18).text('Course Outline', { underline: true })
      doc.moveDown()
      doc.fontSize(12).text(JSON.stringify(course.outline, null, 2))
      doc.addPage()
    }

    // Add lessons
    if (course.lessons) {
      for (const lesson of course.lessons) {
        doc.fontSize(20).text(lesson.title, { underline: true })
        doc.moveDown()

        // Objectives
        if (lesson.objectives.length > 0) {
          doc.fontSize(14).text('Learning Objectives:', { bold: true })
          lesson.objectives.forEach(obj => {
            doc.fontSize(12).text(`• ${obj}`)
          })
          doc.moveDown()
        }

        // Lesson content
        if (lesson.script) {
          doc.fontSize(12).text(lesson.script)
          doc.moveDown()
        }

        // Activities
        if (options.includeActivities && lesson.activities) {
          doc.fontSize(14).text('Activities:', { bold: true })
          lesson.activities.forEach(activity => {
            doc.fontSize(12).text(`${activity.title}: ${activity.description}`)
          })
        }

        doc.addPage()
      }
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      doc.fontSize(14).text('Course Metadata', { underline: true })
      doc.moveDown()
      doc.fontSize(10).text(`Status: ${course.status}`)
      doc.fontSize(10).text(`Created: ${course.created_at}`)
      doc.fontSize(10).text(`Updated: ${course.updated_at}`)
    }

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve({
          success: true,
          format: 'pdf',
          content: buffer,
          filename: `${filename}.pdf`,
          mimeType: 'application/pdf',
          size: buffer.length
        })
      })
    })
    */
  }

  private async exportLessonToPDF(
    lesson: Lesson,
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    return {
      success: false,
      format: 'pdf',
      filename: `${filename}.pdf`,
      mimeType: 'application/pdf',
      error: 'PDF export not available - install pdfkit to enable'
    }
    /*
    const PDFDocument = (await import('pdfkit')).default
    
    const doc = new PDFDocument({
      margins: options.styling?.margins || {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      }
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Title
    doc.fontSize(24).text(lesson.title, { align: 'center' })
    doc.moveDown(2)

    // Objectives
    if (lesson.objectives.length > 0) {
      doc.fontSize(16).text('Learning Objectives', { underline: true })
      doc.moveDown()
      lesson.objectives.forEach(obj => {
        doc.fontSize(12).text(`• ${obj}`)
      })
      doc.moveDown(2)
    }

    // Lesson Plan
    if (lesson.lesson_plan && Object.keys(lesson.lesson_plan).length > 0) {
      doc.fontSize(16).text('Lesson Plan', { underline: true })
      doc.moveDown()
      
      if (lesson.lesson_plan.introduction) {
        doc.fontSize(14).text('Introduction', { bold: true })
        doc.fontSize(12).text(lesson.lesson_plan.introduction)
        doc.moveDown()
      }

      if (lesson.lesson_plan.main_content) {
        doc.fontSize(14).text('Main Content', { bold: true })
        doc.fontSize(12).text(JSON.stringify(lesson.lesson_plan.main_content, null, 2))
        doc.moveDown()
      }

      if (lesson.lesson_plan.conclusion) {
        doc.fontSize(14).text('Conclusion', { bold: true })
        doc.fontSize(12).text(lesson.lesson_plan.conclusion)
        doc.moveDown()
      }
    }

    // Script
    if (lesson.script) {
      doc.addPage()
      doc.fontSize(16).text('Lecture Script', { underline: true })
      doc.moveDown()
      doc.fontSize(12).text(lesson.script)
    }

    // Activities
    if (options.includeActivities && lesson.activities && lesson.activities.length > 0) {
      doc.addPage()
      doc.fontSize(16).text('Activities', { underline: true })
      doc.moveDown()
      
      lesson.activities.forEach((activity, index) => {
        doc.fontSize(14).text(`Activity ${index + 1}: ${activity.title}`, { bold: true })
        doc.fontSize(12).text(activity.description)
        doc.moveDown()
        doc.fontSize(12).text('Instructions:', { bold: true })
        doc.fontSize(11).text(activity.instructions)
        doc.moveDown(2)
      })
    }

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve({
          success: true,
          format: 'pdf',
          content: buffer,
          filename: `${filename}.pdf`,
          mimeType: 'application/pdf',
          size: buffer.length
        })
      })
    })
    */
  }

  private async exportContentToPDF(
    content: string,
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    return {
      success: false,
      format: 'pdf',
      filename: `${filename}.pdf`,
      mimeType: 'application/pdf',
      error: 'PDF export not available - install pdfkit to enable'
    }
    /*
    const PDFDocument = (await import('pdfkit')).default
    
    const doc = new PDFDocument({
      margins: options.styling?.margins || {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      }
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    doc.fontSize(options.styling?.fontSize || 12)
    doc.text(content)
    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve({
          success: true,
          format: 'pdf',
          content: buffer,
          filename: `${filename}.pdf`,
          mimeType: 'application/pdf',
          size: buffer.length
        })
      })
    })
    */
  }

  // DOCX Export Methods
  private async exportCourseToDOCX(
    course: Course & { lessons?: Lesson[] },
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    return {
      success: false,
      format: 'docx',
      filename: `${filename}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      error: 'DOCX export not available - install officegen to enable'
    }
    /*
    // const officegen = (await import('officegen')).default
    const docx = officegen('docx')

    // Title page
    const titlePara = docx.createP({ align: 'center' })
    titlePara.addText(course.title, { font_size: 24, bold: true })
    
    if (course.description) {
      const descPara = docx.createP({ align: 'center' })
      descPara.addText(course.description, { font_size: 14 })
    }

    docx.putPageBreak()

    // Table of contents
    const tocPara = docx.createP()
    tocPara.addText('Table of Contents', { font_size: 18, bold: true })
    
    if (course.lessons) {
      course.lessons.forEach((lesson, index) => {
        const lessonPara = docx.createP()
        lessonPara.addText(`${index + 1}. ${lesson.title}`, { font_size: 12 })
      })
    }

    docx.putPageBreak()

    // Lessons
    if (course.lessons) {
      for (const lesson of course.lessons) {
        const lessonTitle = docx.createP()
        lessonTitle.addText(lesson.title, { font_size: 20, bold: true })
        
        // Objectives
        if (lesson.objectives.length > 0) {
          const objTitle = docx.createP()
          objTitle.addText('Learning Objectives:', { font_size: 14, bold: true })
          
          lesson.objectives.forEach(obj => {
            const objPara = docx.createP()
            objPara.addText(`• ${obj}`, { font_size: 12 })
          })
        }

        // Script
        if (lesson.script) {
          const scriptPara = docx.createP()
          scriptPara.addText(lesson.script, { font_size: 12 })
        }

        docx.putPageBreak()
      }
    }

    // Generate buffer
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      
      docx.on('finalize', (written: number) => {
        const buffer = Buffer.concat(chunks)
        resolve({
          success: true,
          format: 'docx',
          content: buffer,
          filename: `${filename}.docx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: buffer.length
        })
      })

      docx.on('error', (err: Error) => {
        reject(err)
      })

      docx.generate((chunk: Buffer) => {
        chunks.push(chunk)
      })
    })
    */
  }

  private async exportLessonToDOCX(
    lesson: Lesson,
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    return {
      success: false,
      format: 'docx',
      filename: `${filename}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      error: 'DOCX export not available - install officegen to enable'
    }
    /*
    // const officegen = (await import('officegen')).default
    const docx = officegen('docx')

    // Title
    const titlePara = docx.createP({ align: 'center' })
    titlePara.addText(lesson.title, { font_size: 24, bold: true })

    // Objectives
    if (lesson.objectives.length > 0) {
      const objTitle = docx.createP()
      objTitle.addText('Learning Objectives', { font_size: 16, bold: true })
      
      lesson.objectives.forEach(obj => {
        const objPara = docx.createP()
        objPara.addText(`• ${obj}`, { font_size: 12 })
      })
    }

    // Lesson Plan
    if (lesson.lesson_plan && Object.keys(lesson.lesson_plan).length > 0) {
      const planTitle = docx.createP()
      planTitle.addText('Lesson Plan', { font_size: 16, bold: true })
      
      const planPara = docx.createP()
      planPara.addText(JSON.stringify(lesson.lesson_plan, null, 2), { font_size: 12 })
    }

    // Script
    if (lesson.script) {
      docx.putPageBreak()
      const scriptTitle = docx.createP()
      scriptTitle.addText('Lecture Script', { font_size: 16, bold: true })
      
      const scriptPara = docx.createP()
      scriptPara.addText(lesson.script, { font_size: 12 })
    }

    // Generate buffer
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      
      docx.on('finalize', (written: number) => {
        const buffer = Buffer.concat(chunks)
        resolve({
          success: true,
          format: 'docx',
          content: buffer,
          filename: `${filename}.docx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: buffer.length
        })
      })

      docx.on('error', (err: Error) => {
        reject(err)
      })

      docx.generate((chunk: Buffer) => {
        chunks.push(chunk)
      })
    })
    */
  }

  private async exportContentToDOCX(
    content: string,
    filename: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    return {
      success: false,
      format: 'docx',
      filename: `${filename}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      error: 'DOCX export not available - install officegen to enable'
    }
    /*
    // const officegen = (await import('officegen')).default
    const docx = officegen('docx')

    const para = docx.createP()
    para.addText(content, { font_size: options.styling?.fontSize || 12 })

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      
      docx.on('finalize', (written: number) => {
        const buffer = Buffer.concat(chunks)
        resolve({
          success: true,
          format: 'docx',
          content: buffer,
          filename: `${filename}.docx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: buffer.length
        })
      })

      docx.on('error', (err: Error) => {
        reject(err)
      })

      docx.generate((chunk: Buffer) => {
        chunks.push(chunk)
      })
    })
    */
  }

  // Markdown Export Methods
  private exportCourseToMarkdown(
    course: Course & { lessons?: Lesson[] },
    filename: string,
    options: ExportOptions
  ): ExportResult {
    let markdown = `# ${course.title}\n\n`
    
    if (course.description) {
      markdown += `${course.description}\n\n`
    }

    // Table of contents
    markdown += '## Table of Contents\n\n'
    if (course.lessons) {
      course.lessons.forEach((lesson, index) => {
        markdown += `${index + 1}. [${lesson.title}](#lesson-${index + 1})\n`
      })
    }
    markdown += '\n---\n\n'

    // Course outline
    if (course.outline && Object.keys(course.outline).length > 0) {
      markdown += '## Course Outline\n\n'
      markdown += '```json\n'
      markdown += JSON.stringify(course.outline, null, 2)
      markdown += '\n```\n\n'
    }

    // Lessons
    if (course.lessons) {
      course.lessons.forEach((lesson, index) => {
        markdown += `## Lesson ${index + 1}: ${lesson.title}\n\n`
        
        // Objectives
        if (lesson.objectives.length > 0) {
          markdown += '### Learning Objectives\n\n'
          lesson.objectives.forEach(obj => {
            markdown += `- ${obj}\n`
          })
          markdown += '\n'
        }

        // Lesson Plan
        if (lesson.lesson_plan && Object.keys(lesson.lesson_plan).length > 0) {
          markdown += '### Lesson Plan\n\n'
          
          if (lesson.lesson_plan.introduction) {
            markdown += `**Introduction:**\n${lesson.lesson_plan.introduction}\n\n`
          }
          
          if (lesson.lesson_plan.main_content) {
            markdown += '**Main Content:**\n'
            markdown += '```json\n'
            markdown += JSON.stringify(lesson.lesson_plan.main_content, null, 2)
            markdown += '\n```\n\n'
          }
          
          if (lesson.lesson_plan.conclusion) {
            markdown += `**Conclusion:**\n${lesson.lesson_plan.conclusion}\n\n`
          }
        }

        // Script
        if (lesson.script) {
          markdown += '### Lecture Script\n\n'
          markdown += lesson.script + '\n\n'
        }

        // Activities
        if (options.includeActivities && lesson.activities && lesson.activities.length > 0) {
          markdown += '### Activities\n\n'
          lesson.activities.forEach((activity, idx) => {
            markdown += `#### Activity ${idx + 1}: ${activity.title}\n\n`
            markdown += `${activity.description}\n\n`
            markdown += `**Instructions:** ${activity.instructions}\n\n`
          })
        }

        markdown += '---\n\n'
      })
    }

    // Metadata
    if (options.includeMetadata) {
      markdown += '## Metadata\n\n'
      markdown += `- **Status:** ${course.status}\n`
      markdown += `- **Created:** ${course.created_at}\n`
      markdown += `- **Updated:** ${course.updated_at}\n`
    }

    return {
      success: true,
      format: 'markdown',
      content: markdown,
      filename: `${filename}.md`,
      mimeType: 'text/markdown',
      size: Buffer.byteLength(markdown, 'utf8')
    }
  }

  private exportLessonToMarkdown(
    lesson: Lesson,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    let markdown = `# ${lesson.title}\n\n`

    // Objectives
    if (lesson.objectives.length > 0) {
      markdown += '## Learning Objectives\n\n'
      lesson.objectives.forEach(obj => {
        markdown += `- ${obj}\n`
      })
      markdown += '\n'
    }

    // Lesson Plan
    if (lesson.lesson_plan && Object.keys(lesson.lesson_plan).length > 0) {
      markdown += '## Lesson Plan\n\n'
      markdown += '```json\n'
      markdown += JSON.stringify(lesson.lesson_plan, null, 2)
      markdown += '\n```\n\n'
    }

    // Script
    if (lesson.script) {
      markdown += '## Lecture Script\n\n'
      markdown += lesson.script + '\n\n'
    }

    // Activities
    if (options.includeActivities && lesson.activities && lesson.activities.length > 0) {
      markdown += '## Activities\n\n'
      lesson.activities.forEach((activity, index) => {
        markdown += `### Activity ${index + 1}: ${activity.title}\n\n`
        markdown += `${activity.description}\n\n`
        markdown += `**Instructions:** ${activity.instructions}\n\n`
      })
    }

    return {
      success: true,
      format: 'markdown',
      content: markdown,
      filename: `${filename}.md`,
      mimeType: 'text/markdown',
      size: Buffer.byteLength(markdown, 'utf8')
    }
  }

  private exportContentToMarkdown(
    content: string,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    return {
      success: true,
      format: 'markdown',
      content,
      filename: `${filename}.md`,
      mimeType: 'text/markdown',
      size: Buffer.byteLength(content, 'utf8')
    }
  }

  // HTML Export Methods
  private exportCourseToHTML(
    course: Course & { lessons?: Lesson[] },
    filename: string,
    options: ExportOptions
  ): ExportResult {
    const markdown = this.exportCourseToMarkdown(course, filename, options).content as string
    const html = this.wrapInHTMLTemplate(marked(markdown), course.title)
    
    return {
      success: true,
      format: 'html',
      content: html,
      filename: `${filename}.html`,
      mimeType: 'text/html',
      size: Buffer.byteLength(html, 'utf8')
    }
  }

  private exportLessonToHTML(
    lesson: Lesson,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    const markdown = this.exportLessonToMarkdown(lesson, filename, options).content as string
    const html = this.wrapInHTMLTemplate(marked(markdown), lesson.title)
    
    return {
      success: true,
      format: 'html',
      content: html,
      filename: `${filename}.html`,
      mimeType: 'text/html',
      size: Buffer.byteLength(html, 'utf8')
    }
  }

  private exportContentToHTML(
    content: string,
    filename: string,
    options: ExportOptions
  ): ExportResult {
    const html = this.wrapInHTMLTemplate(marked(content), 'Exported Content')
    
    return {
      success: true,
      format: 'html',
      content: html,
      filename: `${filename}.html`,
      mimeType: 'text/html',
      size: Buffer.byteLength(html, 'utf8')
    }
  }

  // Helper Methods
  private formatVariationContent(variation: ContentVariation): string {
    let content = `# ${variation.type.replace('_', ' ').toUpperCase()}\n\n`
    
    if (variation.metadata) {
      const metadata = variation.metadata as any
      if (metadata.title) {
        content = `# ${metadata.title}\n\n`
      }
      if (metadata.metaDescription) {
        content += `*${metadata.metaDescription}*\n\n`
      }
    }
    
    content += variation.content || ''
    
    return content
  }

  private wrapInHTMLTemplate(content: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    h3 { color: #7f8c8d; }
    code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    blockquote { border-left: 4px solid #3498db; margin-left: 0; padding-left: 20px; color: #666; }
    ul, ol { line-height: 1.8; }
    @media print {
      body { max-width: 100%; }
      h1, h2, h3 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase()
      .substring(0, 100)
  }

  private getMimeType(format: ExportFormat): string {
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      markdown: 'text/markdown',
      html: 'text/html'
    }
    return mimeTypes[format] || 'application/octet-stream'
  }
}

export const exportService = new ExportService()
