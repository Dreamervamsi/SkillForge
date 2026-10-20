import React from "react"
import Link from "next/link"
import { Cpu, CheckCircle2, ShieldCheck, Zap } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Left side: Brand Value Proposition & Atmospheric Glows */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden border-r border-zinc-800/60 bg-zinc-950">
        {/* Subtle background mesh and gradient glows */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b15_1px,transparent_1px),linear-gradient(to_bottom,#18181b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* Top Header / Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Cpu className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400">
                SkillForge <span className="text-indigo-400 font-extrabold">AI</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Center Content / Value Proposition */}
        <div className="relative z-10 max-w-lg space-y-8 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium tracking-wide">
            <Zap className="size-3.5 text-indigo-400 animate-pulse" />
            <span>Next-Gen Adaptive Skill Assessment</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 leading-[1.15]">
            Precision intelligence for engineering mastery.
          </h1>

          <p className="text-base text-zinc-400 leading-relaxed">
            SkillForge AI evaluates true technical proficiency using dynamic, real-time adaptive questioning and concept dependency graphs.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Adaptive Question Pool</p>
                <p className="text-xs text-zinc-400">Questions auto-tune in real-time based on your reasoning and rubric scores.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Evidence-Based Scoring</p>
                <p className="text-xs text-zinc-400">Deep multidimensional breakdown of concept mastery and targeted roadmaps.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Citation */}
        <div className="relative z-10 border-t border-zinc-800/50 pt-6">
          <p className="text-xs text-zinc-500">
            &copy; SkillForge AI. Built for high-performance developer teams.
          </p>
        </div>
      </div>

      {/* Right side: Auth Form Container */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="absolute top-8 left-8 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Cpu className="size-4" />
            </div>
            <span className="font-bold text-lg text-zinc-100">
              SkillForge <span className="text-indigo-400">AI</span>
            </span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  )
}
