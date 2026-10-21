"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  Cpu,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  HelpCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  fetchAssessmentSession,
  fetchNextAdaptiveQuestion,
  submitNonAdaptiveAnswers,
  AssessmentResponse,
  Question,
} from "@/lib/assessment-service"
import { useAssessmentTimer } from "@/lib/use-assessment-timer"

function AssessmentInterfaceContent() {
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.id as string

  const [session, setSession] = useState<AssessmentResponse | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Track answers locally for standard non-adaptive mode
  const [localAnswers, setLocalAnswers] = useState<
    Array<{ question_id: number; selected_option: string }>
  >([])

  // Load Assessment Session on Mount
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      toast.error("Authentication Required", {
        description: "Please sign in to access your assessment session.",
      })
      router.replace("/login")
      return
    }

    async function loadSession() {
      try {
        setLoading(true)
        const data = await fetchAssessmentSession(assessmentId)
        setSession(data)

        if (data.status === "COMPLETED") {
          toast.info("Assessment Already Completed", {
            description: "Redirecting to your result and gap analysis report...",
          })
          router.replace(`/assessment/${assessmentId}/results`)
          return
        }

        if (data.status === "EXPIRED") {
          setIsLocked(true)
          toast.error("Assessment Session Expired", {
            description: "The time limit for this assessment session has passed.",
          })
          return
        }

        // Set initial question
        if (data.questions && data.questions.length > 0) {
          // In adaptive mode, display the active question matching next_question_index or last in array
          const activeQ = data.questions[data.questions.length - 1]
          setCurrentQuestion(activeQ)
        }
      } catch (err: any) {
        console.error("Failed to load assessment:", err)
        setErrorMsg(err.message || "Failed to load assessment session")
        toast.error("Error Loading Session", { description: err.message })
      } finally {
        setLoading(false)
      }
    }

    if (assessmentId) {
      loadSession()
    }
  }, [assessmentId, router])

  // Timer Hook Setup
  const timer = useAssessmentTimer({
    initialTimeLimitMinutes: session?.time_limit_minutes || 15,
    initialRemainingSeconds: session?.time_remaining_seconds ?? null,
    isActive: !!session && session.status === "IN_PROGRESS" && !isLocked,
    onExpire: () => {
      setIsLocked(true)
      toast.error("Time Expired!", {
        description: "Your assessment time has run out. Session locked.",
      })
      // Lock session and redirect after brief delay
      setTimeout(() => {
        router.push(`/assessment/${assessmentId}/results`)
      }, 2000)
    },
  })

  // Submit Answer & Fetch Next Question
  const handleNext = async () => {
    if (!selectedOption || !currentQuestion || !session || isEvaluating) return

    setIsEvaluating(true)
    setErrorMsg(null)

    try {
      if (session.adaptive_mode) {
        // Adaptive Mode: POST to /next-question
        const res = await fetchNextAdaptiveQuestion(session.id, {
          question_id: currentQuestion.id,
          selected_option: selectedOption,
        })

        if (res.assessment_ended) {
          toast.success("Assessment Completed!", {
            description: res.reason || "You have completed all questions in the budget.",
          })
          router.push(`/assessment/${session.id}/results`)
          return
        }

        if (res.question) {
          setCurrentQuestion(res.question)
          setSelectedOption(null)
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: "IN_PROGRESS",
                  current_difficulty: res.difficulty || prev.current_difficulty,
                  next_question_index: (prev.next_question_index || 1) + 1,
                }
              : null
          )
        }
      } else {
        // Standard Non-Adaptive Mode
        const updatedAnswers = [
          ...localAnswers,
          { question_id: currentQuestion.id, selected_option: selectedOption },
        ]
        setLocalAnswers(updatedAnswers)

        const currentIndex = session.questions.findIndex((q) => q.id === currentQuestion.id)
        const isFinal = currentIndex >= session.questions.length - 1

        if (isFinal) {
          await submitNonAdaptiveAnswers(session.id, updatedAnswers, true)
          toast.success("Assessment Completed!", {
            description: "Calculating your competency profile and skill gaps...",
          })
          router.push(`/assessment/${session.id}/results`)
        } else {
          setCurrentQuestion(session.questions[currentIndex + 1])
          setSelectedOption(null)
        }
      }
    } catch (err: any) {
      console.error("Error advancing question:", err)
      const msg = err.message || "Failed to submit answer and load next question."
      setErrorMsg(msg)
      toast.error("Submission Error", { description: msg })
    } finally {
      setIsEvaluating(false)
    }
  }

  // Initial Loading / AI Question Pool Generation Screen
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-6 relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/10">
            <Sparkles className="size-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              Generating Scenario Questions...
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              SkillForge AI is generating tailored adaptive question pools based on your goal & skills.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 py-2.5 px-4 rounded-xl">
            <Loader2 className="size-4 animate-spin text-indigo-400" />
            <span>Evaluating skill graph & preparing assessment sandbox...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error Screen
  if (errorMsg && !session) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-6">
        <div className="size-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="text-xl font-bold mb-2">Unable to Load Assessment</h2>
        <p className="text-sm text-zinc-400 mb-6 text-center max-w-md">{errorMsg}</p>
        <Link href="/onboarding">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Back to Onboarding</Button>
        </Link>
      </div>
    )
  }

  // Session Expired / Locked Screen
  if (isLocked || timer.isExpired) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-6">
        <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Session Expired</h2>
        <p className="text-sm text-zinc-400 mb-6 text-center max-w-md">
          The time limit for this assessment session has reached zero. Your answers have been saved.
        </p>
        <Link href={`/assessment/${assessmentId}/results`}>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">View Gap Analysis Report</Button>
        </Link>
      </div>
    )
  }

  const currentQIndex = session?.next_question_index || 1
  const maxQuestions = session?.question_budget || 5
  const progressPercent = Math.min(100, Math.round((currentQIndex / maxQuestions) * 100))

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[25rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b15_1px,transparent_1px),linear-gradient(to_bottom,#18181b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Header with Timer & Progress */}
      <header className="relative z-10 w-full border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Cpu className="size-4" />
          </div>
          <span className="font-bold text-base text-zinc-100">
            SkillForge <span className="text-indigo-400">AI</span>
          </span>
        </Link>

        {/* Center: Question Counter & Progress */}
        <div className="hidden sm:flex items-center gap-4 max-w-xs w-full">
          <span className="text-xs font-semibold text-zinc-400 whitespace-nowrap">
            Q {currentQIndex} of {maxQuestions}
          </span>
          <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Persistent High-Visibility Timer */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-bold text-sm transition-all duration-300 ${
            timer.isUrgent
              ? "border-red-500/50 bg-red-500/15 text-red-400 animate-pulse"
              : "border-zinc-800 bg-zinc-900/80 text-zinc-200"
          }`}
        >
          <Clock className={`size-4 ${timer.isUrgent ? "text-red-400" : "text-indigo-400"}`} />
          <span>{timer.formattedTime}</span>
        </div>
      </header>

      {/* Mobile Progress Bar */}
      <div className="sm:hidden w-full bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          Question {currentQIndex} of {maxQuestions}
        </span>
        <span className="text-xs font-bold text-indigo-400">{progressPercent}%</span>
      </div>

      {/* Main Question Card Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        {isEvaluating && (
          <div className="w-full mb-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center gap-3 text-sm text-indigo-300 animate-in fade-in duration-200">
            <Loader2 className="size-4 animate-spin text-indigo-400" />
            <span>AI is evaluating your reasoning & generating the next adaptive scenario...</span>
          </div>
        )}

        {currentQuestion ? (
          <Card className="w-full border-zinc-800/80 bg-zinc-900/60 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-8 space-y-6">
              {/* Question Meta Badge Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
                  <Zap className="size-3.5 text-indigo-400" />
                  {session?.adaptive_mode ? "Adaptive Assessment" : "Standard Assessment"}
                </div>

                {currentQuestion.difficulty && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-800/60 text-zinc-300 capitalize">
                    Difficulty: {currentQuestion.difficulty}
                  </span>
                )}
              </div>

              {/* Question Scenario Text */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-zinc-100 leading-snug">
                  {currentQuestion.question}
                </h2>
                {currentQuestion.concepts_tested && currentQuestion.concepts_tested.length > 0 && (
                  <p className="text-xs text-zinc-400 font-medium">
                    Testing concepts: <span className="text-zinc-300">{currentQuestion.concepts_tested.join(", ")}</span>
                  </p>
                )}
              </div>

              {/* Error Banner if submit failed */}
              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Multiple Choice Options */}
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((option, idx) => {
                  const optionLetter = String.fromCharCode(65 + idx) // A, B, C, D
                  const isSelected = selectedOption === option

                  return (
                    <div
                      key={idx}
                      onClick={() => !isEvaluating && setSelectedOption(option)}
                      className={`group cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/15 text-indigo-100 ring-1 ring-indigo-500/50 shadow-md shadow-indigo-500/10"
                          : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50 hover:text-zinc-100"
                      } ${isEvaluating ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3.5 pr-4">
                        <div
                          className={`size-7 rounded-lg border flex items-center justify-center text-xs font-bold transition-colors ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-zinc-700 bg-zinc-800/80 text-zinc-400 group-hover:border-zinc-600"
                          }`}
                        >
                          {optionLetter}
                        </div>
                        <span className="text-sm font-medium leading-relaxed">{option}</span>
                      </div>

                      {isSelected && (
                        <div className="size-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                          <CheckCircle2 className="size-3.5" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Submit & Next Action */}
              <div className="border-t border-zinc-800/60 pt-6 flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                  <HelpCircle className="size-3.5" /> Select one option to proceed
                </span>

                <Button
                  onClick={handleNext}
                  disabled={!selectedOption || isEvaluating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/25 px-6"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Evaluating Answer...
                    </>
                  ) : (
                    <>
                      Submit & Next
                      <ArrowRight className="size-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12">
            <Loader2 className="size-8 animate-spin text-indigo-500 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Preparing next question...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AssessmentInterfacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/10">
            <Loader2 className="size-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              Loading Assessment...
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Preparing your assessment session.
            </p>
          </div>
        </div>
      </div>
    }>
      <AssessmentInterfaceContent />
    </Suspense>
  )
}
