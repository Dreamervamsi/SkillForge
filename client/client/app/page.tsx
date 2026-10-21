import Link from "next/link"
import { ArrowRight, BrainCircuit, CheckCircle2, Cpu, Route, Target, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const PROJECT_HIGHLIGHTS = [
  {
    title: "Adaptive Assessments",
    description: "Question flow adjusts in real time based on your answer quality and skill evidence.",
    icon: Zap,
  },
  {
    title: "Competency Mapping",
    description: "Builds a concept-level profile to identify strengths, gaps, and confidence bands.",
    icon: BrainCircuit,
  },
  {
    title: "Roadmap Generation",
    description: "Turns assessment output into structured, prioritized learning steps and exercises.",
    icon: Route,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[42rem] h-[26rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b15_1px,transparent_1px),linear-gradient(to_bottom,#18181b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <header className="relative z-10 w-full border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Cpu className="size-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              SkillForge <span className="text-indigo-400">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button className="bg-zinc-900 border border-zinc-700/70 hover:bg-zinc-800 text-zinc-100">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-14 md:py-20 space-y-14">
        <section className="space-y-7 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium tracking-wide">
            <Zap className="size-3.5 text-indigo-400 animate-pulse" />
            Adaptive skill intelligence platform
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-zinc-100">
            SkillForge helps engineers prove skills and close gaps with AI-driven assessments.
          </h1>

          <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
            The platform evaluates your proficiency with adaptive questions, analyzes concept-level performance, and
            generates tailored learning roadmaps to accelerate technical growth.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link href="/onboarding">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 px-5">
                Start assessment
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-zinc-900 border border-zinc-700/70 hover:bg-zinc-800 text-zinc-100 px-5">
                Create account
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROJECT_HIGHLIGHTS.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl">
              <CardContent className="p-6 space-y-4">
                <div className="size-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl">
            <CardContent className="p-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-zinc-200">
                <Target className="size-4 text-indigo-400" />
                <h3 className="font-semibold">What this project does</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Authenticates learners and creates focused skill assessment sessions.",
                  "Evaluates answers with rubric-style scoring and adaptive difficulty shifts.",
                  "Produces competency evidence and practical learning roadmaps per goal.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300 leading-relaxed">
                    <CheckCircle2 className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl">
            <CardContent className="p-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-zinc-200">
                <Cpu className="size-4 text-indigo-400" />
                <h3 className="font-semibold">Who it is built for</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Developers preparing for interviews and real-world engineering roles.",
                  "Teams that need objective skill baselines and upskilling plans.",
                  "Learners who want structured, evidence-backed technical progression.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300 leading-relaxed">
                    <CheckCircle2 className="size-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
