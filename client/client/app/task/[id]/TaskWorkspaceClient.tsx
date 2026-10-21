"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  Code2,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Send,
  Loader2,
  FileText,
  AlertCircle,
  FolderGit2,
  Award,
  Layers,
  ChevronRight,
  Lightbulb,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  fetchRoadmap,
  RoadmapData,
  RoadmapStep,
  submitTaskSolution,
  TaskFeedback,
  TaskSubmissionResponse
} from "@/lib/assessment-service"

interface TaskWorkspaceClientProps {
  assessmentId: string
}

export function TaskWorkspaceClient({ assessmentId }: TaskWorkspaceClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSkill = searchParams.get("skill") || "FastAPI & Async Routing"

  const [activeTab, setActiveTab] = React.useState<"overview" | "resources" | "submission" | "feedback">("overview")
  const [loading, setLoading] = React.useState(true)
  const [roadmap, setRoadmap] = React.useState<RoadmapData | null>(null)
  const [selectedStep, setSelectedStep] = React.useState<RoadmapStep | null>(null)
  
  // Submission Form State
  const [solutionCode, setSolutionCode] = React.useState<string>("")
  const [repoUrl, setRepoUrl] = React.useState<string>("")
  const [learnerNotes, setLearnerNotes] = React.useState<string>("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [feedbackResult, setFeedbackResult] = React.useState<TaskFeedback | null>(null)
  const [taskStatus, setTaskStatus] = React.useState<"in_progress" | "verified">("in_progress")

  React.useEffect(() => {
    async function loadWorkspaceData() {
      setLoading(true)
      try {
        const data = await fetchRoadmap(assessmentId)
        setRoadmap(data)
        
        // Match step by skill name parameter or fallback to first step
        const matched = data.steps.find(
          (s) => s.skill_name.toLowerCase() === initialSkill.toLowerCase()
        ) || data.steps[0]

        if (matched) {
          setSelectedStep(matched)
          if (matched.exercise?.starter_code) {
            setSolutionCode(matched.exercise.starter_code)
          } else {
            setSolutionCode(
`# Write your python solution or API implementation below
def handle_learning_task():
    """
    Skill: ${matched.skill_name}
    Objective: Build solution adhering to gap report criteria.
    """
    pass
`
            )
          }
        }
      } catch (err: any) {
        console.warn("Using fallback step context:", err)
      } finally {
        setLoading(false)
      }
    }

    if (assessmentId) {
      loadWorkspaceData()
    }
  }, [assessmentId, initialSkill])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solutionCode.trim() && !repoUrl.trim()) {
      setSubmitError("Please provide a solution draft or repository link before submitting.")
      return;
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const result: TaskSubmissionResponse = await submitTaskSolution(assessmentId, {
        skill_name: selectedStep?.skill_name || initialSkill,
        solution_text: solutionCode,
        repo_url: repoUrl,
        notes: learnerNotes,
      })

      setFeedbackResult(result.feedback)
      if (result.feedback.passed) {
        setTaskStatus("verified")
      }
      setActiveTab("feedback")
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to process task submission.")
    } finally {
      setSubmitting(false)
    }
  }

  const currentSkillName = selectedStep?.skill_name || initialSkill

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/20 selection:text-indigo-300 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/roadmap/${assessmentId}`)}
              className="text-xs text-zinc-400 hover:text-zinc-100 -ml-2 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Return to Personalized Roadmap
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                    {currentSkillName}
                  </h1>
                  {taskStatus === "verified" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Task Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs px-2.5 py-0.5">
                      <Clock className="w-3.5 h-3.5 mr-1 animate-pulse" /> In Progress
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Interactive Learning Task Workspace • Assessment Session ID: {assessmentId.substring(0, 8)}...
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/roadmap/${assessmentId}`)}
              className="text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-zinc-100"
            >
              View Full Roadmap
            </Button>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900/40 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Task Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("resources")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "resources"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Resources & Hints</span>
          </button>

          <button
            onClick={() => setActiveTab("submission")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "submission"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Submission Area</span>
          </button>

          <button
            onClick={() => setActiveTab("feedback")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all relative ${
              activeTab === "feedback"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>AI Feedback</span>
            {feedbackResult && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-2 right-2" />
            )}
          </button>
        </div>

        {/* Tab 1: OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-100">Learning Task Objective</h2>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 text-xs">
                  Est. {selectedStep?.estimated_hours || 2} Hours
                </Badge>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">
                {selectedStep?.exercise?.description ||
                  `Bridge your assessment gap in ${currentSkillName} by building and validating a working practical scenario.`}
              </p>

              {/* Assessment Gap Report Mapping */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-300/90 leading-relaxed space-y-2">
                <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Mapped Skill Gap Criteria</span>
                </div>
                <p>
                  Targeting specific gaps identified in your adaptive rubric assessment: zero-downtime execution, error resilience, and standardized API/data structures.
                </p>
              </div>
            </div>

            {/* Concepts Practiced */}
            {selectedStep?.concepts && selectedStep.concepts.length > 0 && (
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Tested Concepts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedStep.concepts.map((c, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next CTA */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setActiveTab("submission")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20"
              >
                Proceed to Submission Area
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: RESOURCES & HINTS TAB */}
        {activeTab === "resources" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
              <h2 className="text-lg font-bold text-zinc-100">Curated Learning Materials</h2>
              <p className="text-xs text-zinc-400">
                Review official documentation and guides required to satisfy the task acceptance criteria.
              </p>

              <div className="space-y-3 pt-2">
                {selectedStep?.resources && selectedStep.resources.length > 0 ? (
                  selectedStep.resources.map((res, idx) => (
                    <a
                      key={idx}
                      href={res.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 hover:bg-zinc-900/80 border border-zinc-800 transition-all group"
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors">
                          {res.title || `Resource Guide #${idx + 1}`}
                        </h4>
                        <p className="text-xs text-zinc-500">Official Documentation & Reference Code</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400" />
                    </a>
                  ))
                ) : (
                  <div className="space-y-2">
                    <a
                      href="https://fastapi.tiangolo.com/tutorial/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 hover:border-zinc-700 transition-colors"
                    >
                      <span>Official Reference Documentation & Best Practices</span>
                      <ExternalLink className="w-4 h-4 text-zinc-500" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: SUBMISSION TAB */}
        {activeTab === "submission" && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">Task Submission Area</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Write or paste your code solution, debugging text, or provide a public repository URL.
                </p>
              </div>

              {/* Code Solution Area */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-300">
                  Code / Text Solution
                </Label>
                <textarea
                  value={solutionCode}
                  onChange={(e) => setSolutionCode(e.target.value)}
                  rows={10}
                  className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500/80 transition-colors resize-y leading-relaxed"
                  placeholder="Paste your solution code, API route, or implementation details..."
                />
              </div>

              {/* Repository Link Field */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Repository URL (Optional)</span>
                  </Label>
                  <Input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/project-repo"
                    className="bg-zinc-950 border-zinc-800 text-xs text-zinc-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-300">
                    Learner Notes / Design Approach
                  </Label>
                  <Input
                    type="text"
                    value={learnerNotes}
                    onChange={(e) => setLearnerNotes(e.target.value)}
                    placeholder="E.g., Used async dependency injection and Pydantic schema validation"
                    className="bg-zinc-950 border-zinc-800 text-xs text-zinc-200"
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating Submission via Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Solution & Verify Task</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 4: AI FEEDBACK TAB */}
        {activeTab === "feedback" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {feedbackResult ? (
              <div className="space-y-6">
                {/* Result Status Banner */}
                <div className={`p-6 rounded-2xl border ${
                  feedbackResult.passed
                    ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-200"
                    : "bg-amber-950/20 border-amber-900/50 text-amber-200"
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${
                        feedbackResult.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {feedbackResult.passed ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">
                          {feedbackResult.passed ? "Task Verified & Mastered!" : "Task Revisions Recommended"}
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">{feedbackResult.summary}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-extrabold text-zinc-100">{feedbackResult.score}/100</div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Evaluation Score</span>
                    </div>
                  </div>
                </div>

                {/* Rubric Breakdown Grid */}
                {feedbackResult.rubric_breakdown && feedbackResult.rubric_breakdown.length > 0 && (
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Rubric Criteria Assessment
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {feedbackResult.rubric_breakdown.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                            <span>{item.criterion}</span>
                            <span className="text-indigo-400">{item.score}/{item.max_score}</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">{item.comments}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbackResult.strengths && feedbackResult.strengths.length > 0 && (
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" /> Key Strengths Identified
                      </h4>
                      <ul className="space-y-2 text-xs text-zinc-300">
                        {feedbackResult.strengths.map((s, idx) => (
                          <li key={idx} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedbackResult.improvements && feedbackResult.improvements.length > 0 && (
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-400" /> Recommended Enhancements
                      </h4>
                      <ul className="space-y-2 text-xs text-zinc-300">
                        {feedbackResult.improvements.map((imp, idx) => (
                          <li key={idx} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => router.push(`/roadmap/${assessmentId}`)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20"
                  >
                    Return to Roadmap & Next Module
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
                <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-base font-semibold text-zinc-300">No Submission Evaluated Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Submit your draft or code in the Submission Area tab to generate instant AI feedback and update your roadmap status.
                </p>
                <Button
                  onClick={() => setActiveTab("submission")}
                  variant="outline"
                  className="text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                >
                  Go to Submission Area
                </Button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
