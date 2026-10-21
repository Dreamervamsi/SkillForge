"use client"

import * as React from "react"
import { CheckCircle2, Clock, Sparkles, Lock, ArrowRight, BookOpen, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SkillStatus } from "./SkillNodeComponent"

interface RoadmapListViewProps {
  nodesData: Array<{
    id: string
    label: string
    status: SkillStatus
    difficulty?: string
    estimatedHours?: number
    concepts?: string[]
    gapType?: string
    priority?: string
    prerequisites?: string[]
    stepData?: any
    gapData?: any
  }>
  onNodeSelect: (nodeData: any) => void
  onOpenTask: (skillName: string) => void
}

const statusBadgeStyles: Record<
  SkillStatus,
  { label: string; class: string; icon: React.ReactNode }
> = {
  verified: {
    label: "Verified",
    class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  },
  in_progress: {
    label: "In Progress",
    class: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />,
  },
  recommended: {
    label: "Recommended",
    class: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
  },
  prerequisite_pending: {
    label: "Prereq Pending",
    class: "bg-zinc-800/80 text-zinc-400 border-zinc-700/60",
    icon: <Lock className="w-3.5 h-3.5 text-zinc-400" />,
  },
}

export function RoadmapListView({ nodesData, onNodeSelect, onOpenTask }: RoadmapListViewProps) {
  return (
    <div className="w-full space-y-3">
      {nodesData.map((item, index) => {
        const statusInfo = statusBadgeStyles[item.status] || statusBadgeStyles.recommended

        return (
          <div
            key={item.id}
            onClick={() => onNodeSelect(item)}
            className="group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all duration-200 cursor-pointer shadow-lg"
          >
            {/* Left Info */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5">
                {index + 1}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                    {item.label}
                  </h3>
                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 border ${statusInfo.class}`}>
                    <span className="flex items-center gap-1.5">
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                  </Badge>
                  {item.priority && (
                    <Badge variant="outline" className="text-[10px] border-zinc-800 bg-zinc-900 text-zinc-400 capitalize">
                      {item.priority} Priority
                    </Badge>
                  )}
                </div>

                {item.concepts && item.concepts.length > 0 && (
                  <p className="text-xs text-zinc-400 line-clamp-1">
                    {item.concepts.join(" • ")}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1">
                  <span className="capitalize text-zinc-400 font-medium">Difficulty: {item.difficulty || "Intermediate"}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <BookOpen className="w-3 h-3 text-zinc-500" />
                    {item.estimatedHours || 2} hrs
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action CTA */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-zinc-900 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onNodeSelect(item)
                }}
                className="text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300"
              >
                View Details
              </Button>

              <Button
                size="sm"
                disabled={item.status === "prerequisite_pending"}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenTask(item.label)
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
              >
                <span>Open Task</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
