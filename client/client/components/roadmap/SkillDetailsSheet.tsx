"use client"

import * as React from "react"
import {
  X,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
  Code2,
  ExternalLink,
  Target,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RoadmapStep, RoadmapSkillGap } from "@/lib/assessment-service"
import { SkillStatus } from "./SkillNodeComponent"

interface SkillDetailsSheetProps {
  isOpen: boolean
  onClose: () => void
  skillData: {
    label: string
    status: SkillStatus
    difficulty?: string
    estimatedHours?: number
    concepts?: string[]
    gapType?: string
    priority?: string
    currentMastery?: string
    targetMastery?: string
    stepData?: RoadmapStep
    gapData?: RoadmapSkillGap
    assessmentId?: string
  } | null
  onOpenTask?: (skillName: string) => void
}

const statusBadgeStyles: Record<SkillStatus, { label: string; class: string; icon: React.ReactNode }> = {
  verified: {
    label: "Verified Mastered",
    class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  },
  in_progress: {
    label: "In Progress",
    class: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
  },
  recommended: {
    label: "Recommended Gap",
    class: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    icon: <Sparkles className="w-4 h-4 text-indigo-400" />
  },
  prerequisite_pending: {
    label: "Prerequisite Pending",
    class: "bg-zinc-800 text-zinc-400 border-zinc-700",
    icon: <Lock className="w-4 h-4 text-zinc-400" />
  }
}

export function SkillDetailsSheet({ isOpen, onClose, skillData, onOpenTask }: SkillDetailsSheetProps) {
  if (!isOpen || !skillData) return null

  const statusInfo = statusBadgeStyles[skillData.status] || statusBadgeStyles.recommended
  const step = skillData.stepData
  const gap = skillData.gapData

  const getReasoningText = () => {
    if (gap?.gap_type === "missing") {
      return "This core skill is currently missing from your assessment profile and is required for your target role."
    }
    if (gap?.gap_type === "weak") {
      return `Your assessment indicated emerging mastery (${gap.current_mastery || "developing"}). Targeted practice is recommended to reach ${gap.target_mastery || "proficient"}.`
    }
    if (gap?.gap_type === "needs_improvement") {
      return "You have basic proficiency, but advancing this topic will unlock senior-level competency."
    }
    if (skillData.status === "verified") {
      return "You have demonstrated strong competency in this skill during assessment evaluation."
    }
    if (skillData.status === "prerequisite_pending") {
      return "You must complete foundational prerequisite skills before attempting this module."
    }
    return "Identified as a key learning objective to bridge your technical skill gap."
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              {statusInfo.icon}
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Skill Detail
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-xs px-2.5 py-0.5 border ${statusInfo.class}`}>
                {statusInfo.label}
              </Badge>
              {skillData.priority && (
                <Badge variant="outline" className="text-xs border-zinc-800 bg-zinc-900 text-zinc-300">
                  {skillData.priority} priority
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{skillData.label}</h2>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
              <span>Difficulty: <strong className="text-zinc-200 capitalize">{skillData.difficulty || "Intermediate"}</strong></span>
              <span>•</span>
              <span>Est. Time: <strong className="text-zinc-200">{skillData.estimatedHours || 2} Hours</strong></span>
            </p>
          </div>

          {/* Assessment Gap Reason */}
          <div className="mt-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1.5">
              <Target className="w-4 h-4 text-indigo-400" />
              <span>Assessment Gap Recommendation</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{getReasoningText()}</p>
          </div>

          {/* Core Concepts */}
          {skillData.concepts && skillData.concepts.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Key Concepts Covered
              </h4>
              <div className="flex flex-wrap gap-2">
                {skillData.concepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-medium"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Exercise Preview */}
          {step?.exercise && (
            <div className="mt-6 p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>Personalized Learning Task</span>
                </div>
                <Badge className="bg-indigo-500/20 text-indigo-300 text-[10px] border-none">
                  {step.exercise.difficulty || "Hands-on"}
                </Badge>
              </div>
              <h5 className="text-sm font-semibold text-zinc-100">{step.exercise.title || "Interactive Practice Task"}</h5>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-3">
                {step.exercise.description || step.exercise.problem_statement || "Real-world coding challenge aligned to your gap report."}
              </p>
            </div>
          )}

          {/* Curated Resources */}
          {step?.resources && step.resources.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Recommended Resources
              </h4>
              <div className="space-y-2">
                {step.resources.map((res, i) => (
                  <a
                    key={i}
                    href={res.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 transition-colors group text-xs text-zinc-300"
                  >
                    <span className="truncate pr-2">{res.title || `Resource ${i + 1}`}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="pt-6 mt-6 border-t border-zinc-800">
          <Button
            onClick={() => {
              if (onOpenTask) onOpenTask(skillData.label)
              onClose()
            }}
            disabled={skillData.status === "prerequisite_pending"}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-5 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group transition-all"
          >
            <span>Open Learning Task</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          {skillData.status === "prerequisite_pending" && (
            <p className="text-[11px] text-zinc-500 text-center mt-2 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500/80" />
              <span>Complete pending prerequisites to unlock this task.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
