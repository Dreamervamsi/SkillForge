import { RoadmapPageClient } from "./RoadmapPageClient"

interface RoadmapPageProps {
  params: Promise<{ id: string }>
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const resolvedParams = await params
  return <RoadmapPageClient assessmentId={resolvedParams.id} />
}
