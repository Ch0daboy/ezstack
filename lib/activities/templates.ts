export type ActivityTemplate = {
  id: string
  name: string
  description: string
  type: 'quiz' | 'exercise' | 'discussion' | 'project'
  structure: any
}

export const defaultActivityTemplates: ActivityTemplate[] = [
  {
    id: 'quiz-basic-mcq',
    name: 'Basic MCQ Quiz',
    description: 'A 10-question multiple choice quiz with explanations.',
    type: 'quiz',
    structure: {
      questionCount: 10,
      types: ['multiple_choice'],
      scoring: '1-point each'
    }
  },
  {
    id: 'reflection-3-2-1',
    name: '3-2-1 Reflection',
    description: 'Students write 3 things learned, 2 interesting facts, 1 question.',
    type: 'discussion',
    structure: {
      prompts: [
        'List 3 things you learned',
        'List 2 things you found interesting',
        'Write 1 question you still have'
      ]
    }
  },
  {
    id: 'project-mini-capstone',
    name: 'Mini Capstone',
    description: 'A small project applying core concepts in a practical build.',
    type: 'project',
    structure: {
      deliverables: ['Proposal', 'Implementation', 'Reflection'],
      rubric: ['Completeness', 'Correctness', 'Clarity']
    }
  }
]

