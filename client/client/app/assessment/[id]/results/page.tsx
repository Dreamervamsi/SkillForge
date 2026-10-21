import { Suspense } from "react"
import { AssessmentResultsClient } from "./AssessmentResultsClient"
import { Loader2 } from "lucide-react"

interface ResultsPageProps {
  params: Promise<{ id: string }>
}

export const instant = false

function ResultsContent({ assessmentId }: { assessmentId: string }) {
  return <AssessmentResultsClient assessmentId={assessmentId} />
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const resolvedParams = await params
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
            <Loader2 className="size-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              Loading Results...
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Preparing your assessment report.
            </p>
          </div>
        </div>
      </div>
    }>
      <ResultsContent assessmentId={resolvedParams.id} />
    </Suspense>
  )
}
