"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import {
  Cpu,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  Sparkles,
  Target,
  Code2,
  Briefcase,
  Sliders,
  Loader2,
  Zap,
  CheckCircle2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

// --- Validation Schema ---
const onboardingSchema = z.object({
  goal: z.string().min(1, "Please select or enter a learning goal"),
  declared_skills: z.array(z.string()).min(1, "Please select at least one skill or technology"),
  experience_level: z.string().min(1, "Please select your experience level"),
  project_description: z.string().optional(),
  assessment_config: z.object({
    duration_minutes: z.number().min(5).max(60),
    max_questions: z.number().min(3).max(20),
    adaptive_mode: z.boolean(),
  }),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

// Presets for Step 1: Goals
const PRESET_GOALS = [
  {
    id: "backend-engineer",
    title: "Backend Systems Engineering",
    description: "Master distributed systems, API architecture, caching, and database design.",
    icon: Code2,
  },
  {
    id: "fullstack-dev",
    title: "Full-Stack Development",
    description: "End-to-end web apps with modern frontend frameworks and robust backend APIs.",
    icon: Target,
  },
  {
    id: "tech-interview",
    title: "Technical Interview Prep",
    description: "Sharpen system design reasoning, algorithm scenarios, and core CS concepts.",
    icon: Briefcase,
  },
]

// Presets for Step 2: Technologies / Skills
const PRESET_SKILLS = [
  "Node.js",
  "Python",
  "PostgreSQL",
  "Redis",
  "Docker",
  "GraphQL",
  "REST APIs",
  "TypeScript",
  "Go",
  "System Design",
  "Kubernetes",
  "MongoDB",
]

// Presets for Step 3: Experience Levels
const EXPERIENCE_LEVELS = [
  {
    id: "beginner",
    title: "Tutorials & Basics",
    description: "Learned theory, completed structured courses or guided tutorials.",
  },
  {
    id: "intermediate",
    title: "Independent Projects",
    description: "Built & deployed full applications, personal tools, or open-source scripts.",
  },
  {
    id: "advanced",
    title: "Production Experience",
    description: "Shipped code in production environments, managed live workloads or APIs.",
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [customSkillInput, setCustomSkillInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  React.useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      toast.error("Authentication Required", {
        description: "Please sign in to access the onboarding wizard.",
      })
      router.replace("/login")
    } else {
      setIsCheckingAuth(false)
    }
  }, [router])

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      goal: "Backend Systems Engineering",
      declared_skills: ["Node.js", "PostgreSQL"],
      experience_level: "intermediate",
      project_description: "",
      assessment_config: {
        duration_minutes: 15,
        max_questions: 5,
        adaptive_mode: true,
      },
    },
  })

  const formValues = watch()

  // Dynamic Skill Management
  const handleToggleSkill = (skill: string) => {
    const current = formValues.declared_skills || []
    if (current.includes(skill)) {
      setValue(
        "declared_skills",
        current.filter((s) => s !== skill),
        { shouldValidate: true }
      )
    } else {
      setValue("declared_skills", [...current, skill], { shouldValidate: true })
    }
  }

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim()
    if (!trimmed) return
    const current = formValues.declared_skills || []
    if (!current.includes(trimmed)) {
      setValue("declared_skills", [...current, trimmed], { shouldValidate: true })
    }
    setCustomSkillInput("")
  }

  // Handle Step Navigation
  const handleNextStep = async () => {
    if (step === 1) {
      if (!formValues.goal) {
        toast.error("Goal required", { description: "Please select or type a learning goal." })
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!formValues.declared_skills || formValues.declared_skills.length === 0) {
        toast.error("Skills required", { description: "Please select at least one skill." })
        return
      }
      setStep(3)
    } else if (step === 3) {
      if (!formValues.experience_level) {
        toast.error("Experience required", { description: "Please select your experience level." })
        return
      }
      setStep(4)
    }
  }

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  // Final Submission to FastAPI Backend
  const onSubmit = async (data: OnboardingFormData) => {
    setIsSubmitting(true)

    // Bridge Payload Gap:
    // Backend endpoint `/assessments` expects `AssessmentCreate` schema:
    // {
    //   goal: string,
    //   skills: string[],
    //   question_budget: number,
    //   time_limit_minutes: number,
    //   adaptive_mode: boolean
    // }
    const adaptedPayload = {
      goal: `${data.goal} (Experience: ${data.experience_level}${
        data.project_description ? ` | Context: ${data.project_description}` : ""
      })`,
      skills: data.declared_skills,
      question_budget: data.assessment_config.max_questions,
      time_limit_minutes: data.assessment_config.duration_minutes,
      adaptive_mode: data.assessment_config.adaptive_mode,
    }

    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        toast.error("Authentication Required", {
          description: "Your session has expired or you are not logged in. Please sign in.",
        })
        router.replace("/login")
        setIsSubmitting(false)
        return
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }

      const response = await fetch("http://localhost:8000/assessments", {
        method: "POST",
        headers,
        body: JSON.stringify(adaptedPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMsg = result.detail || "Failed to initialize assessment session."
        toast.error("Assessment Creation Failed", { description: errorMsg })
        setIsSubmitting(false)
        return
      }

      toast.success("Assessment Session Prepared!", {
        description: `Starting assessment with ${result.question_budget} questions.`,
      })

      // Redirect directly to the assessment session route
      router.push(`/assessment/${result.id}`)
    } catch (err) {
      console.error("Onboarding submission error:", err)
      toast.error("Connection Error", {
        description: "Unable to reach the SkillForge AI server. Please try again.",
      })
      setIsSubmitting(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-100">
        <Loader2 className="size-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium text-zinc-400">Verifying session authentication...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[25rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b15_1px,transparent_1px),linear-gradient(to_bottom,#18181b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            <Cpu className="size-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-zinc-100">
            SkillForge <span className="text-indigo-400 font-extrabold">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-400">Step {step} of 4</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full">
        {/* Step Progress Bar */}
        <div className="w-full mb-8">
          <div className="flex justify-between items-center mb-3 text-xs font-medium text-zinc-400">
            <span className={step >= 1 ? "text-indigo-400 font-semibold" : ""}>1. Goal</span>
            <span className={step >= 2 ? "text-indigo-400 font-semibold" : ""}>2. Skills</span>
            <span className={step >= 3 ? "text-indigo-400 font-semibold" : ""}>3. Context</span>
            <span className={step >= 4 ? "text-indigo-400 font-semibold" : ""}>4. Config</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Form Card */}
        <Card className="w-full border-zinc-800/80 bg-zinc-900/60 shadow-2xl backdrop-blur-xl overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* STEP 1: LEARNING GOAL */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium">
                      <Target className="size-3.5" />
                      Step 1 of 4
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                      What is your primary learning goal?
                    </h2>
                    <p className="text-sm text-zinc-400">
                      SkillForge AI will customize question scenario difficulty and competency roadmaps based on your target focus.
                    </p>
                  </div>

                  {/* Preset Goal Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {PRESET_GOALS.map((g) => {
                      const Icon = g.icon
                      const isSelected = formValues.goal === g.title
                      return (
                        <div
                          key={g.id}
                          onClick={() => setValue("goal", g.title, { shouldValidate: true })}
                          className={`cursor-pointer p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/10"
                              : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`p-2 rounded-lg ${
                                isSelected ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              <Icon className="size-4" />
                            </div>
                            {isSelected && <Check className="size-4 text-indigo-400" />}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-200">{g.title}</h3>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{g.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Custom Goal Input */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="custom-goal">Or enter a custom goal / role target:</Label>
                    <Input
                      id="custom-goal"
                      placeholder="e.g., Senior DevOps Specialist, Distributed Systems Architect..."
                      value={formValues.goal || ""}
                      onChange={(e) => setValue("goal", e.target.value, { shouldValidate: true })}
                      className="bg-zinc-950/60 border-zinc-800 focus-visible:ring-indigo-500/50"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: EXISTING TECHNOLOGIES & SKILLS */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium">
                      <Code2 className="size-3.5" />
                      Step 2 of 4
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                      Select technologies & core skills
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Choose the technologies you want to be evaluated on.
                    </p>
                  </div>

                  {/* Skills Grid */}
                  <div className="flex flex-wrap gap-2">
                    {PRESET_SKILLS.map((skill) => {
                      const isSelected = (formValues.declared_skills || []).includes(skill)
                      return (
                        <button
                          type="button"
                          key={skill}
                          onClick={() => handleToggleSkill(skill)}
                          className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-2 ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/15 text-indigo-200 shadow-md shadow-indigo-500/10"
                              : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                          }`}
                        >
                          {isSelected ? <Check className="size-3.5 text-indigo-400" /> : <Plus className="size-3.5 text-zinc-500" />}
                          {skill}
                        </button>
                      )}
                    )}
                  </div>

                  {/* Add Custom Skill / Tag */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                    <Label htmlFor="custom-skill">Add custom technology or framework:</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom-skill"
                        placeholder="e.g., Kafka, Rust, Terraform, FastAPI..."
                        value={customSkillInput}
                        onChange={(e) => setCustomSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddCustomSkill()
                          }
                        }}
                        className="bg-zinc-950/60 border-zinc-800"
                      />
                      <Button
                        type="button"
                        onClick={handleAddCustomSkill}
                        variant="outline"
                        className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
                      >
                        Add Tag
                      </Button>
                    </div>
                  </div>

                  {/* Selected Tags Preview */}
                  {(formValues.declared_skills || []).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-zinc-400 font-medium">Selected Skills ({(formValues.declared_skills || []).length}):</span>
                      <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                        {formValues.declared_skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleToggleSkill(skill)}
                              className="hover:text-white transition-colors"
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: EXPERIENCE LEVEL & CONTEXT */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium">
                      <Briefcase className="size-3.5" />
                      Step 3 of 4
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                      Experience level & project context
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Helps the adaptive engine establish your baseline difficulty tier.
                    </p>
                  </div>

                  {/* Experience Cards */}
                  <div className="space-y-3">
                    {EXPERIENCE_LEVELS.map((exp) => {
                      const isSelected = formValues.experience_level === exp.id
                      return (
                        <div
                          key={exp.id}
                          onClick={() => setValue("experience_level", exp.id, { shouldValidate: true })}
                          className={`cursor-pointer p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50 shadow-md shadow-indigo-500/10"
                              : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/50"
                          }`}
                        >
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-200">{exp.title}</h3>
                            <p className="text-xs text-zinc-400 mt-0.5">{exp.description}</p>
                          </div>
                          {isSelected && <Check className="size-5 text-indigo-400 shrink-0 ml-3" />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Project Description (Optional) */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="project_description">
                      Describe a project you built or work on <span className="text-zinc-500">(optional)</span>
                    </Label>
                    <textarea
                      id="project_description"
                      rows={3}
                      placeholder="e.g., Designed a URL shortener with Redis cache invalidation and Postgres persistence..."
                      value={formValues.project_description || ""}
                      onChange={(e) => setValue("project_description", e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: ASSESSMENT CONFIGURATION */}
              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium">
                      <Sliders className="size-3.5" />
                      Step 4 of 4
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                      Configure your assessment session
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Set duration and question budget for your session.
                    </p>
                  </div>

                  {/* Config Options */}
                  <div className="space-y-5 bg-zinc-950/60 p-5 rounded-xl border border-zinc-800/80">
                    {/* Max Questions Selector */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium text-zinc-200">Question Budget:</Label>
                        <span className="text-sm font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-md">
                          {formValues.assessment_config?.max_questions || 5} Questions
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[3, 5, 10].map((num) => {
                          const isSelected = formValues.assessment_config?.max_questions === num
                          return (
                            <button
                              type="button"
                              key={num}
                              onClick={() =>
                                setValue("assessment_config.max_questions", num, { shouldValidate: true })
                              }
                              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected
                                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                              }`}
                            >
                              {num} Questions
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time Limit Selector */}
                    <div className="space-y-3 pt-3 border-t border-zinc-800/60">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium text-zinc-200">Time Limit:</Label>
                        <span className="text-sm font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-md">
                          {formValues.assessment_config?.duration_minutes || 15} Minutes
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[10, 15, 30].map((mins) => {
                          const isSelected = formValues.assessment_config?.duration_minutes === mins
                          return (
                            <button
                              type="button"
                              key={mins}
                              onClick={() =>
                                setValue("assessment_config.duration_minutes", mins, { shouldValidate: true })
                              }
                              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected
                                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                              }`}
                            >
                              {mins} Minutes
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Adaptive Mode Toggle */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                      <div>
                        <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                          <Zap className="size-4 text-indigo-400" />
                          Adaptive Difficulty Engine
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Questions adapt dynamically in real-time based on your answers.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formValues.assessment_config?.adaptive_mode ?? true}
                        onChange={(e) =>
                          setValue("assessment_config.adaptive_mode", e.target.checked)
                        }
                        className="size-5 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                    <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Ready to Launch</p>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Your assessment will test <span className="text-indigo-200 font-medium">{(formValues.declared_skills || []).join(", ")}</span> aiming for <span className="text-indigo-200 font-medium">{formValues.goal}</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between border-t border-zinc-800/60 pt-6 mt-8">
                {step > 1 ? (
                  <Button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    <ArrowLeft className="size-4 mr-1.5" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/25 ml-auto"
                  >
                    Continue
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/25 ml-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Generating Assessment...
                      </>
                    ) : (
                      <>
                        Start Assessment
                        <Sparkles className="size-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
