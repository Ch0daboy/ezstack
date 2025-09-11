import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { sendWelcomeEmail, processPayment } from "@/lib/inngest/functions"
import { 
  processCourseOutline,
  processLessonPlan,
  processScriptGeneration,
  processBatchGeneration,
  retryFailedGeneration
} from "@/lib/inngest/generation-functions"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendWelcomeEmail,
    processPayment,
    processCourseOutline,
    processLessonPlan,
    processScriptGeneration,
    processBatchGeneration,
    retryFailedGeneration,
  ],
})
