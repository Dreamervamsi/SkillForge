import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-800 text-zinc-100 hover:bg-zinc-800/80",
        secondary:
          "border-transparent bg-zinc-700 text-zinc-100 hover:bg-zinc-700/80",
        destructive:
          "border-transparent bg-red-900/50 text-red-200 border-red-800/50 hover:bg-red-900/70",
        outline: "text-zinc-300 border-zinc-700",
        success:
          "border-emerald-800/50 bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80",
        warning:
          "border-amber-800/50 bg-amber-950/60 text-amber-400 hover:bg-amber-900/80",
        info:
          "border-sky-800/50 bg-sky-950/60 text-sky-400 hover:bg-sky-900/80",
        purple:
          "border-purple-800/50 bg-purple-950/60 text-purple-300 hover:bg-purple-900/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
