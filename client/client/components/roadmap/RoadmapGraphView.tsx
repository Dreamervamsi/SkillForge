"use client"

import * as React from "react"
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { SkillNodeComponent, SkillNodeData, SkillStatus } from "./SkillNodeComponent"

interface RoadmapGraphViewProps {
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
}

const nodeTypes = {
  skillNode: SkillNodeComponent,
}

export function RoadmapGraphView({ nodesData, onNodeSelect }: RoadmapGraphViewProps) {
  // Compute positions in a clean multi-tier DAG layout
  const initialNodes: Node[] = React.useMemo(() => {
    // Rank or level nodes based on prerequisite depth
    const levels: Record<string, number> = {}
    const getLevel = (id: string, visited = new Set<string>()): number => {
      if (visited.has(id)) return 0
      visited.add(id)
      const item = nodesData.find((n) => n.id === id)
      if (!item || !item.prerequisites || item.prerequisites.length === 0) return 0
      let maxPrereqLevel = 0
      for (const p of item.prerequisites) {
        maxPrereqLevel = Math.max(maxPrereqLevel, getLevel(p, new Set(visited)) + 1)
      }
      return maxPrereqLevel
    }

    nodesData.forEach((n) => {
      levels[n.id] = getLevel(n.id)
    })

    // Group by level
    const levelGroups: Record<number, typeof nodesData> = {}
    nodesData.forEach((n) => {
      const lvl = levels[n.id] || 0
      if (!levelGroups[lvl]) levelGroups[lvl] = []
      levelGroups[lvl].push(n)
    })

    const computedNodes: Node[] = []
    const HORIZONTAL_SPACING = 340
    const VERTICAL_SPACING = 180

    Object.keys(levelGroups).forEach((lvlStr) => {
      const lvl = parseInt(lvlStr)
      const group = levelGroups[lvl]
      const totalWidth = (group.length - 1) * HORIZONTAL_SPACING
      const startX = -totalWidth / 2

      group.forEach((item, index) => {
        computedNodes.push({
          id: item.id,
          type: "skillNode",
          position: {
            x: startX + index * HORIZONTAL_SPACING,
            y: lvl * VERTICAL_SPACING,
          },
          data: {
            ...item,
            onSelect: onNodeSelect,
          } as SkillNodeData,
        })
      })
    })

    return computedNodes
  }, [nodesData, onNodeSelect])

  const initialEdges: Edge[] = React.useMemo(() => {
    const edges: Edge[] = []
    nodesData.forEach((targetNode) => {
      if (targetNode.prerequisites) {
        targetNode.prerequisites.forEach((prereqId) => {
          // Verify prereq node exists
          const sourceExists = nodesData.some((n) => n.id === prereqId)
          if (sourceExists) {
            edges.push({
              id: `e-${prereqId}-${targetNode.id}`,
              source: prereqId,
              target: targetNode.id,
              animated: targetNode.status === "in_progress",
              style: {
                stroke: targetNode.status === "verified" ? "#10b981" : targetNode.status === "in_progress" ? "#f59e0b" : "#4f46e5",
                strokeWidth: 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: targetNode.status === "verified" ? "#10b981" : "#4f46e5",
                width: 16,
                height: 16,
              },
            })
          }
        })
      }
    })
    return edges
  }, [nodesData])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="w-full h-[680px] bg-zinc-950/80 rounded-2xl border border-zinc-800/80 overflow-hidden relative shadow-2xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls
          className="!bg-zinc-900 !border-zinc-800 !rounded-xl !shadow-xl !fill-zinc-300 [&>button]:!border-zinc-800 [&>button]:hover:!bg-zinc-800"
        />
      </ReactFlow>
    </div>
  )
}
