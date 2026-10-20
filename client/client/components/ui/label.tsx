import { Label as LabelPrimitive } from "@base-ui/react/label"
import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: LabelPrimitive.Props) {
  return (
    <LabelPrimitive
      data-slot="label"
      className={cn(
        "text-sm font-medium leading-none text-zinc-300 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
