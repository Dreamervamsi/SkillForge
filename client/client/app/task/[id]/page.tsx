import { Suspense } from "react"
import { TaskWorkspaceClient } from "./TaskWorkspaceClient"

interface TaskWorkspacePageProps {
  params: Promise<{ id: string }>
}

export const instant = false

export default async function TaskWorkspacePage({ params }: TaskWorkspacePageProps) {
  const resolvedParams = await params
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
        <div className="text-xs text-zinc-400 animate-pulse">Loading Task Workspace...</div>
      </div>
    }>
      <TaskWorkspaceClient assessmentId={resolvedParams.id} />
    </Suspense>
  )
}
