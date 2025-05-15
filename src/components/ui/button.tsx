
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 shadow-md",
  {
    variants: {
      variant: {
        default: "bg-[#D97706] text-white hover:bg-[#D97706]/90",
        destructive:
          "bg-[#B91C1C] text-white hover:bg-[#B91C1C]/90",
        outline:
          "border-2 border-[#1A1A1A] bg-white hover:bg-[#FEEBCB]/50 hover:text-[#1A1A1A] text-[#1A1A1A]",
        secondary:
          "bg-[#FEEBCB] text-[#1A1A1A] hover:bg-[#FEEBCB]/80",
        ghost: "hover:bg-[#FEEBCB]/50 hover:text-[#1A1A1A] text-[#1A1A1A]",
        link: "text-[#D97706] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-lg px-4 py-2",
        lg: "h-14 rounded-xl px-8 py-4",
        icon: "h-12 w-12",
        auto: "h-auto py-3 px-5",
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
