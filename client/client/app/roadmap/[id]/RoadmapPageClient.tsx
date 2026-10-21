"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Network,
  List,
  Sparkles,
  ArrowLeft,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchRoadmap, RoadmapData, fetchAssessmentResults } from "@/lib/assessment-service"
import { RoadmapGraphView } from "@/components/roadmap/RoadmapGraphView"
import { RoadmapListView } from "@/components/roadmap/RoadmapListView"
import { SkillDetailsSheet } from "@/components/roadmap/SkillDetailsSheet"
import { SkillStatus } from "@/components/roadmap/SkillNodeComponent"

interface RoadmapPageClientProps {
  assessmentId: string
}

// 12 Curated Backend Engineering Skills fallback graph
const CURATED_BACKEND_SKILLS = [
  {
    id: "python-fundamentals",
    label: "Python Core & Data Structures",
    status: "verified" as SkillStatus,
    difficulty: "beginner",
    estimatedHours: 4,
    concepts: ["Types", "Memory", "Generators", "OOP"],
    prerequisites: []
  },
  {
    id: "rest-api-design",
    label: "REST & HTTP Protocols",
    status: "verified" as SkillStatus,
    difficulty: "beginner",
    estimatedHours: 5,
    concepts: ["HTTP Verbs", "Status Codes", "JSON Specs", "Idempotency"],
    prerequisites: ["python-fundamentals"]
  },
  {
    id: "fastapi-framework",
    label: "FastAPI & Async Routing",
    status: "in_progress" as SkillStatus,
    difficulty: "intermediate",
    estimatedHours: 6,
    concepts: ["Pydantic Validation", "Dependency Injection", "ASGI", "OpenAPI"],
    prerequisites: ["python-fundamentals", "rest-api-design"]
  },
  {
    id: "sql-databases",
    label: "PostgreSQL & SQL Schema Design",
    status: "recommended" as SkillStatus,
    difficulty: "intermediate",
    estimatedHours: 8,
    concepts: ["Indexes", "ACID Transactions", "Joins", "Foreign Keys"],
    prerequisites: ["python-fundamentals"]
  },
  {
    id: "orm-prisma",
    label: "ORM & Prisma/SQLAlchemy",
    status: "recommended" as SkillStatus,
    difficulty: "intermediate",
    estimatedHours: 5,
    concepts: ["Migrations", "N+1 Problem", "Relationships", "Query Building"],
    prerequisites: ["sql-databases"]
  },
  {
    id: "jwt-authentication",
    label: "JWT & Security Auth Systems",
    status: "recommended" as SkillStatus,
    difficulty: "intermediate",
    estimatedHours: 6,
    concepts: ["OAuth2", "Hashing", "Refresh Tokens", "RBAC"],
    prerequisites: ["fastapi-framework"]
  },
  {
    id: "asyncio-concurrency",
    label: "AsyncIO & Event Loop",
    status: "recommended" as SkillStatus,
    difficulty: "advanced",
    estimatedHours: 8,
    concepts: ["Tasks", "Futures", "Coroutines", "Non-blocking I/O"],
    prerequisites: ["fastapi-framework"]
  },
  {
    id: "redis-caching",
    label: "Redis Caching & Pub/Sub",
    status: "prerequisite_pending" as SkillStatus,
    difficulty: "intermediate",
    estimatedHours: 4,
    concepts: ["TTL", "LRU Eviction", "In-Memory Store", "Session Store"],
    prerequisites: ["asyncio-concurrency"]
  },
  {
    id: "docker-containers",
    label: "Docker Containerization",
    status: "recommended" as SkillStatus,
    difficulty: "intermediate",
    estimatedHours: 6,
    concepts: ["Dockerfiles", "Multi-Stage Builds", "Compose", "Networking"],
    prerequisites: ["fastapi-framework"]
  },
  {
    id: "system-design",
    label: "System Design & Scalability",
    status: "prerequisite_pending" as SkillStatus,
    difficulty: "advanced",
    estimatedHours: 12,
    concepts: ["Load Balancing", "Horizontal Scaling", "Sharding", "CAP Theorem"],
    prerequisites: ["redis-caching", "docker-containers"]
  },
  {
    id: "microservices",
    label: "Microservices & Message Queues",
    status: "prerequisite_pending" as SkillStatus,
    difficulty: "expert",
    estimatedHours: 10,
    concepts: ["RabbitMQ", "Kafka", "Event-Driven Architecture", "Circuit Breakers"],
    prerequisites: ["system-design"]
  },
  {
    id: "cicd-cloud-deploy",
    label: "CI/CD & Cloud Infrastructure",
    status: "prerequisite_pending" as SkillStatus,
    difficulty: "advanced",
    estimatedHours: 8,
    concepts: ["GitHub Actions", "Kubernetes", "AWS ECS", "Terraform"],
    prerequisites: ["docker-containers"]
  }
]

export function RoadmapPageClient({ assessmentId }: RoadmapPageClientProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<"graph" | "list">("graph")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [roadmap, setRoadmap] = React.useState<RoadmapData | null>(null)
  const [assessmentGoal, setAssessmentGoal] = React.useState<string>("Backend Engineering")
  
  // Drawer Sheet State
  const [selectedNode, setSelectedNode] = React.useState<any | null>(null)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)

  React.useEffect(() => {
    async function loadRoadmapData() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchRoadmap(assessmentId)
        setRoadmap(data)
        if (data.goal) {
          setAssessmentGoal(data.goal)
        }
      } catch (err: any) {
        console.warn("Could not fetch backend roadmap, trying results or falling back:", err?.message)
        // Try fetching assessment results to extract goal/title
        try {
          const results = await fetchAssessmentResults(assessmentId)
          if (results) {
            setAssessmentGoal(results.evaluation?.skill || "Backend Engineering Roadmap")
          }
        } catch {
          // Ignore
        }
      } finally {
        setLoading(false)
      }
    }

    if (assessmentId) {
      loadRoadmapData()
    }
  }, [assessmentId])

  // Merge backend data or map to graph schema
  const processedNodes = React.useMemo(() => {
    if (!roadmap || !roadmap.steps || roadmap.steps.length === 0) {
      return CURATED_BACKEND_SKILLS
    }

    const gapMap = new Map(roadmap.skill_gaps.map((g) => [g.skill_name.toLowerCase(), g]))
    const stepMap = new Map(roadmap.steps.map((s) => [s.skill_name.toLowerCase(), s]))

    return roadmap.steps.map((step, idx) => {
      const lowerName = step.skill_name.toLowerCase()
      const gap = gapMap.get(lowerName)

      let status: SkillStatus = "recommended"
      if (step.is_completed) {
        status = "verified"
      } else if (gap) {
        if (gap.gap_type === "missing") {
          status = idx === 0 ? "in_progress" : "recommended"
        } else if (gap.gap_type === "weak") {
          status = "in_progress"
        } else if (gap.priority === "high" && idx > 2) {
          status = "prerequisite_pending"
        }
      } else if (idx === 0) {
        status = "in_progress"
      }

      // Generate prereq links topologically from previous step or curated list
      const prereqs: string[] = []
      if (idx > 0) {
        prereqs.push(roadmap.steps[idx - 1].skill_name.toLowerCase().replace(/[^a-z0-9]/g, "-"))
      }

      const id = step.skill_name.toLowerCase().replace(/[^a-z0-9]/g, "-")

      return {
        id,
        label: step.skill_name,
        status,
        difficulty: idx < 3 ? "beginner" : idx < 7 ? "intermediate" : "advanced",
        estimatedHours: step.estimated_hours || 4,
        concepts: step.concepts || [],
        gapType: gap?.gap_type,
        priority: gap?.priority || "medium",
        prerequisites: prereqs,
        stepData: step,
        gapData: gap,
      }
    })
  }, [roadmap])

  const handleNodeSelect = (nodeData: any) => {
    setSelectedNode(nodeData)
    setIsSheetOpen(true)
  }

  const handleOpenTask = (skillName: string) => {
    // Route to task workspace page
    router.push(`/task/${assessmentId}?skill=${encodeURIComponent(skillName)}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/assessment/${assessmentId}/results`)}
              className="text-xs text-zinc-400 hover:text-zinc-100 -ml-2 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Gap Assessment Report
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                  Personalized Learning Roadmap
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  AI-Curated Skill Path for <strong className="text-zinc-200">{roadmap?.goal || assessmentGoal}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* View Switcher Controls */}
          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl shrink-0 self-start md:self-center">
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "graph"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Network className="w-4 h-4" />
              <span>Interactive Graph</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <List className="w-4 h-4" />
              <span>Linear List View</span>
            </button>
          </div>
        </div>

        {/* Legend Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-zinc-300">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Skill Status Legend:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Mastered</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended Gap</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Prereq Pending</span>
            </div>
          </div>
          {roadmap && (
            <div className="text-zinc-400 font-medium">
              Total Est. Time: <strong className="text-zinc-200">{roadmap.total_estimated_hours} Hours</strong>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="w-full h-[600px] rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-8 flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Sparkles className="w-5 h-5 text-indigo-400 absolute" />
            </div>
            <p className="text-sm font-medium text-zinc-300 animate-pulse">
              Synthesizing Skill Graph & Prerequisite Dependencies...
            </p>
          </div>
        ) : error ? (
          <div className="w-full p-8 rounded-2xl bg-red-950/20 border border-red-900/40 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-100">Could not generate roadmap</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-zinc-800 hover:bg-zinc-700 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry Roadmap Generation
            </Button>
          </div>
        ) : (
          <div>
            {viewMode === "graph" ? (
              <RoadmapGraphView nodesData={processedNodes} onNodeSelect={handleNodeSelect} />
            ) : (
              <RoadmapListView
                nodesData={processedNodes}
                onNodeSelect={handleNodeSelect}
                onOpenTask={handleOpenTask}
              />
            )}
          </div>
        )}

        {/* Skill Details Sliding Drawer Sheet */}
        <SkillDetailsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          skillData={selectedNode}
          onOpenTask={handleOpenTask}
        />
      </div>
    </div>
  )
}
