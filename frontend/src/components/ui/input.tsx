import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-sm font-black uppercase tracking-widest transition-all placeholder:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 backdrop-blur-md shadow-inner disabled:cursor-not-allowed disabled:opacity-30 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
