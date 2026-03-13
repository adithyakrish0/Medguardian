import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 border border-blue-400/20",
        destructive:
          "bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white shadow-xl shadow-red-500/10",
        outline:
          "border border-white/10 bg-white/5 backdrop-blur-md text-white shadow-xl hover:bg-white hover:text-slate-950 hover:border-white",
        secondary:
          "bg-slate-800/50 text-slate-300 border border-white/5 hover:bg-slate-700 hover:text-white backdrop-blur-sm",
        ghost: "text-slate-500 hover:bg-white/5 hover:text-white transition-all",
        link: "text-blue-400 underline-offset-4 hover:underline font-black",
      },
      size: {
        default: "h-12 px-8 py-3",
        sm: "h-10 rounded-xl px-4 text-[9px]",
        lg: "h-14 rounded-3xl px-12 text-sm",
        icon: "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
