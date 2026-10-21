"use client"

import * as React from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import { CheckCircle2, Clock, Sparkles, Lock, ArrowRight, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type SkillStatus = "verified" | "in_progress" | "recommended" | "prerequisite_pending"

export interface SkillNodeData {
  label: string
  status: SkillStatus
  difficulty?: string
  estimatedHours?: number
  concepts?: string[]
  gapType?: string
  priority?: string
  onSelect?: (nodeData: any) => void
  [key: string]: unknown
}

const statusConfig: Record<
  SkillStatus,
  {
    label: string
    badgeBg: string
    badgeText: string
    borderColor: string
    glowColor: string
    icon: React.ReactNode
    accentBar: string
  }
> = {
  verified: {
    label: "Verified",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30",
    badgeText: "text-emerald-400",
    borderColor: "border-emerald-500/40 hover:border-emerald-400",
    glowColor: "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    accentBar: "bg-emerald-500",
  },
  in_progress: {
    label: "In Progress",
    badgeBg: "bg-amber-500/10 border-amber-500/30",
    badgeText: "text-amber-400",
    borderColor: "border-amber-500/50 hover:border-amber-400",
    glowColor: "hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    icon: <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />,
    accentBar: "bg-amber-500",
  },
  recommended: {
    label: "Recommended",
    badgeBg: "bg-indigo-500/10 border-indigo-500/30",
    badgeText: "text-indigo-400",
    borderColor: "border-indigo-500/50 hover:border-indigo-400",
    glowColor: "hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]",
    icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
    accentBar: "bg-indigo-500",
  },
  prerequisite_pending: {
    label: "Prereq Pending",
    badgeBg: "bg-zinc-800/80 border-zinc-700/50",
    badgeText: "text-zinc-400",
    borderColor: "border-zinc-800 hover:border-zinc-700 opacity-75",
    glowColor: "hover:shadow-none",
    icon: <Lock className="w-3.5 h-3.5 text-zinc-500" />,
    accentBar: "bg-zinc-700",
  },
}

export function SkillNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as SkillNodeData
  const status = nodeData.status || "recommended"
  const config = statusConfig[status] || statusConfig.recommended

  return (
    <div
      onClick={() => nodeData.onSelect && nodeData.onSelect(nodeData)}
      className={`
        relative group w-72 rounded-xl bg-zinc-950/90 backdrop-blur-md border p-4
        transition-all duration-300 cursor-pointer text-left select-none
        ${config.borderColor}
        ${config.glowColor}
        ${selected ? "ring-2 ring-indigo-500/80 border-indigo-500" : ""}
      `}
    >
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-full ${config.accentBar}`} />

      {/* Target Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-zinc-900 !border-2 !border-zinc-700 hover:!border-indigo-400 transition-colors"
      />

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {config.icon}
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {nodeData.difficulty || "Core"}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0.5 font-medium border ${config.badgeBg} ${config.badgeText}`}
        >
          {config.label}
        </Badge>
      </div>

      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1">
        {nodeData.label}
      </h3>

      {nodeData.concepts && nodeData.concepts.length > 0 && (
        <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
          {nodeData.concepts.join(" • ")}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-900">
        <div className="flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-zinc-400" />
          <span>{nodeData.estimatedHours ? `${nodeData.estimatedHours} hrs est.` : "1-2 hrs"}</span>
        </div>
        <div className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform font-medium">
          <span>Details</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {/* Source Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-zinc-900 !border-2 !border-zinc-700 hover:!border-indigo-400 transition-colors"
      />
    </div>
  )
}
