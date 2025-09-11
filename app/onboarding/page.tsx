'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const next = () => setStep((s) => Math.min(3, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Welcome to CourseForge</h1>
      <p className="text-gray-600">Let’s get you set up in a few quick steps.</p>

      <div className="border rounded p-6 space-y-4">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold">Step 1: Create a Course</h2>
            <p className="text-sm text-gray-600">Start by creating a course and giving it a title and topic.</p>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold">Step 2: Generate Content</h2>
            <p className="text-sm text-gray-600">Generate lesson plans, scripts, and variations using AI.</p>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold">Step 3: Share & Export</h2>
            <p className="text-sm text-gray-600">Export to PDF/DOCX/HTML and share previews for feedback.</p>
          </div>
        )}

        <div className="flex justify-between">
          <button onClick={prev} className="px-3 py-2 border rounded" disabled={step===1}>Back</button>
          {step < 3 ? (
            <button onClick={next} className="px-3 py-2 bg-blue-600 text-white rounded">Next</button>
          ) : (
            <button onClick={() => router.push('/dashboard')} className="px-3 py-2 bg-green-600 text-white rounded">Go to Dashboard</button>
          )}
        </div>
      </div>
    </div>
  )
}

