import { Suspense } from "react"
import { RoadmapPageClient } from "./RoadmapPageClient"

interface RoadmapPageProps {
  params: Promise<{ id: string }>
}

export const instant = false

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const resolvedParams = await params
  return (
    <Suspense fallback={<div>Loading roadmap...</div>}>
      <RoadmapPageClient assessmentId={resolvedParams.id} />
    </Suspense>
  )
}
