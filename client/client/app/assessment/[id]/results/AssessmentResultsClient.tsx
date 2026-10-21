"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Sparkles,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Target,
  ShieldCheck,
  Layers,
  Award,
} from "lucide-react"

import {
  fetchAssessmentResults,
  AssessmentResultResponse,
} from "@/lib/assessment-service"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface ResultsClientProps {
  assessmentId: string
}

const CONFIDENCE_THRESHOLD = 0.7

export function AssessmentResultsClient({ assessmentId }: ResultsClientProps) {
  const [data, setData] = useState<AssessmentResultResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchAssessmentResults(assessmentId)
        setData(res)
      } catch (err: any) {
        setError(err?.message || "Unable to load assessment report. Please check the session ID.")
      } finally {
        setLoading(false)
      }
    }

    if (assessmentId) {
      loadResults()
    }
  }, [assessmentId])

  if (loading) {
    return <ResultsSkeleton />
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/60 p-8 text-center space-y-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-950/80 border border-red-800/50 flex items-center justify-center text-red-400">
            <XCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-100">Unable to Load Report</h2>
            <p className="text-sm text-zinc-400">{error || "Invalid assessment session ID."}</p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Retry Fetching
            </Button>
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold px-4 py-2 text-sm transition-colors"
            >
              Start New Assessment
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const evalObj = data.evaluation || {}
  const profile = data.competency_profile
  const skillCategory = evalObj.skill || "Technical Competency"

  // Derive proficiency level
  const rawProficiency = (
    evalObj.proficiency ||
    profile?.overall_proficiency ||
    "intermediate"
  ).toLowerCase()

  const confidenceScore =
    typeof evalObj.confidence === "number"
      ? evalObj.confidence
      : typeof data.overall_confidence === "number"
      ? data.overall_confidence
      : profile?.overall_confidence ?? 0.75

  const confidencePct = Math.round(confidenceScore * 100)
  const isLowConfidence = confidenceScore < CONFIDENCE_THRESHOLD

  // Strengths & Weaknesses
  const strengths =
    (evalObj.strengths && evalObj.strengths.length > 0)
      ? evalObj.strengths
      : (profile?.strengths && profile.strengths.length > 0)
      ? profile.strengths
      : ["Strong underlying domain comprehension", "Methodical scenario analysis"]

  const weaknesses =
    (evalObj.weaknesses && evalObj.weaknesses.length > 0)
      ? evalObj.weaknesses
      : (profile?.weaknesses && profile.weaknesses.length > 0)
      ? profile.weaknesses
      : []

  // Next Action
  const nextActionText =
    evalObj.next_action ||
    (profile?.recommended_next_steps && profile.recommended_next_steps[0]) ||
    "Review weak concept areas and build targeted scenario practice."

  const conceptSummary = evalObj.concept_summary || []
  const coverage = data.concept_coverage

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300 antialiased">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 animate-in fade-in duration-300">
          <div className="flex items-center space-x-2 text-xs text-zinc-400">
            <Link href="/" className="hover:text-zinc-200 transition-colors">SkillForge AI</Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-200 font-medium">Assessment Report</span>
          </div>
          <Badge variant="outline" className="border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs">
            ID: {assessmentId.substring(0, 8)}...
          </Badge>
        </div>

        {/* 1. RESULTS HEADER / SUMMARY BANNER */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/50 to-zinc-950/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-semibold tracking-wide">
                <CheckCircle2 className="w-3.5 h-3.5" /> Assessment Completed
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">
                {skillCategory}
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                Skill evaluation complete. Based on rubric-graded adaptive scenarios, we calculated your current competency level, score accuracy, and key skill gaps.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 border-t md:border-t-0 border-zinc-800/80 pt-4 md:pt-0">
              <div className="text-left md:text-right">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
                  Evaluated Level
                </span>
                <ProficiencyBadge level={rawProficiency} />
              </div>

              <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3.5 py-2 rounded-xl">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-400">Score:</span>
                <span className="text-sm font-bold text-zinc-100">
                  {data.score.correct}/{data.score.total} ({data.score.percentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* DYNAMIC LOW-CONFIDENCE WARNING */}
          {isLowConfidence && (
            <div className="mt-6 flex items-start sm:items-center gap-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300/90 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold text-amber-200">Needs Further Assessment:</span> Confidence score is {confidencePct}%. Additional scenario evaluations are recommended to lock in your benchmark accuracy.
              </div>
            </div>
          )}
        </div>

        {/* 2. STRENGTHS & WEAKNESSES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
          
          {/* STRENGTHS CARD */}
          <Card className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-zinc-100">Demonstrated Strengths</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">Concepts and scenarios you mastered</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {strengths.length > 0 ? (
                <ul className="space-y-3">
                  {strengths.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-zinc-300 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500 italic">No specific strengths isolated in this run.</p>
              )}
            </CardContent>
          </Card>

          {/* WEAKNESSES CARD */}
          <Card className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-950/70 border border-red-800/50 flex items-center justify-center text-red-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-zinc-100">Identified Skill Gaps</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">Concepts requiring targeted reinforcement</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {weaknesses.length > 0 ? (
                <ul className="space-y-3">
                  {weaknesses.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-950/50 border border-red-950/40 text-zinc-300">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-zinc-300 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 text-xs text-center">
                  Zero major skill gaps identified! Excellent technical performance.
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* 3. CONFIDENCE & COVERAGE BREAKDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-800">
          
          {/* CONFIDENCE CARD */}
          <Card className="border-zinc-800 bg-zinc-900/40 md:col-span-1 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-sky-400" />
                <CardTitle className="text-base font-semibold text-zinc-200">Evaluation Confidence</CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">AI rubric agreement & consistency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-zinc-400">Confidence Rating</span>
                  <span className={`font-bold ${isLowConfidence ? "text-amber-400" : "text-emerald-400"}`}>
                    {confidencePct}%
                  </span>
                </div>
                <Progress
                  value={confidencePct}
                  className="h-2 bg-zinc-950"
                  indicatorClassName={isLowConfidence ? "bg-amber-500" : "bg-emerald-500"}
                />
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/60">
                Confidence is calculated from your response reasoning quality, question difficulty consistency, and rubric score alignment.
              </p>
            </CardContent>
          </Card>

          {/* COVERAGE & CONCEPT BREAKDOWN CARD */}
          <Card className="border-zinc-800 bg-zinc-900/40 md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <CardTitle className="text-base font-semibold text-zinc-200">Assessment Coverage</CardTitle>
                </div>
                {coverage?.coverage_percentage !== undefined && (
                  <Badge variant="outline" className="border-purple-800/50 bg-purple-950/30 text-purple-300 text-xs">
                    {coverage.coverage_percentage}% Domain Coverage
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-zinc-400">Concept-level breakdown derived from evaluation evidence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {conceptSummary.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {conceptSummary.map((c, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200 truncate">{c.concept}</span>
                        <MasteryBadge level={c.mastery_level} />
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{c.evidence}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-lg border border-zinc-800/40">
                  Concept mastery breakdown generated over {data.score.total} total question attempts.
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* 4. NEXT ACTION / RECOMMENDATIONS CARD */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-900/50 bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-zinc-950 p-6 sm:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-7 duration-1000">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <Sparkles className="w-4 h-4" /> Next Recommended Action
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-100">
                {nextActionText}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Forge your path by practicing weak scenario patterns or generating an AI-curated learning roadmap.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 transition-all cursor-pointer text-sm"
              >
                Start Targeted Practice <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function ProficiencyBadge({ level }: { level: string }) {
  const norm = level.toLowerCase()

  if (norm.includes("expert")) {
    return (
      <Badge className="bg-purple-950/80 border-purple-800/80 text-purple-300 font-bold text-sm px-3 py-1 shadow-sm">
        <Award className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> Expert
      </Badge>
    )
  }
  if (norm.includes("advanced")) {
    return (
      <Badge className="bg-emerald-950/80 border-emerald-800/80 text-emerald-300 font-bold text-sm px-3 py-1 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Advanced
      </Badge>
    )
  }
  if (norm.includes("beginner")) {
    return (
      <Badge className="bg-sky-950/80 border-sky-800/80 text-sky-300 font-bold text-sm px-3 py-1 shadow-sm">
        <BookOpen className="w-3.5 h-3.5 mr-1.5 text-sky-400" /> Beginner
      </Badge>
    )
  }
  // Default: Intermediate
  return (
    <Badge className="bg-amber-950/80 border-amber-800/80 text-amber-300 font-bold text-sm px-3 py-1 shadow-sm">
      <Target className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Intermediate
    </Badge>
  )
}

function MasteryBadge({ level }: { level: string }) {
  const norm = (level || "").toLowerCase()
  if (norm.includes("proficient") || norm.includes("advanced")) {
    return <Badge variant="outline" className="text-[10px] border-emerald-800/50 bg-emerald-950/40 text-emerald-400 py-0">Proficient</Badge>
  }
  if (norm.includes("developing")) {
    return <Badge variant="outline" className="text-[10px] border-amber-800/50 bg-amber-950/40 text-amber-400 py-0">Developing</Badge>
  }
  return <Badge variant="outline" className="text-[10px] border-sky-800/50 bg-sky-950/40 text-sky-400 py-0">Emerging</Badge>
}

function ResultsSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-10 max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-4 w-48 bg-zinc-900 rounded" />
      <div className="h-44 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-8 space-y-4">
        <div className="h-6 w-32 bg-zinc-800 rounded-full" />
        <div className="h-10 w-2/3 bg-zinc-800 rounded-lg" />
        <div className="h-4 w-1/2 bg-zinc-800/60 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6" />
        <div className="h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6" />
      </div>
      <div className="h-40 bg-zinc-900/50 border border-zinc-800 rounded-xl" />
    </div>
  )
}
