import { createClient as createSupabase } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function LessonPreviewPage({ params }: { params: { lessonId: string } }) {
  const supabase = await createSupabase()

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', params.lessonId)
    .single()

  if (error || !lesson) return notFound()

  const activities = Array.isArray(lesson.activities) ? lesson.activities : []
  const quiz = activities.find((a: any) => a.type === 'quiz')

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Preview: {lesson.title}</h1>
        <p className="text-gray-600 mt-2">Interactive preview mode</p>
      </header>

      {lesson.script && (
        <section className="prose dark:prose-invert">
          <h2>Lecture Script</h2>
          <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded">{lesson.script}</pre>
        </section>
      )}

      {quiz && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Quiz: {quiz.title}</h2>
          <p className="text-sm text-gray-600 mb-4">{quiz.description}</p>
          <div className="space-y-4">
            {quiz.questions?.slice(0, 5).map((q: any, idx: number) => (
              <div key={q.id || idx} className="border rounded p-4">
                <p className="font-medium">Q{idx + 1}. {q.question}</p>
                {Array.isArray(q.options) && (
                  <ul className="list-disc pl-6 mt-2 text-sm">
                    {q.options.map((opt: string, i: number) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

