import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { soundEffects } from "@/lib/soundEffects"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-xs font-bold font-display uppercase tracking-wider transition-all duration-100 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-0.5 active:shadow-recessed cursor-pointer select-none border border-dark-oxide/40 rounded-sm",
  {
    variants: {
      variant: {
        default: "bg-magnetic-oxide text-paper-display bevel-raised hover:bg-[#806761] active:bg-[#6e5853] shadow-md",
        primary: "bg-magnetic-oxide text-paper-display bevel-raised hover:bg-[#806761] active:bg-[#6e5853] shadow-md",
        destructive: "bg-danger text-paper-display bevel-raised hover:bg-red-700 shadow-md",
        danger: "bg-danger text-paper-display bevel-raised hover:bg-red-700 shadow-md",
        outline: "bg-chassis-sand text-dark-oxide bevel-raised hover:bg-paper-display border-dark-oxide/50",
        secondary: "bg-cassette-housing text-dark-oxide bevel-raised hover:bg-[#a09389]",
        ghost: "hover:bg-dark-oxide/10 text-dark-oxide border-transparent",
        link: "text-magnetic-oxide underline-offset-4 hover:underline border-transparent",
        transmit: "bg-magnetic-oxide text-paper-display bevel-raised hover:bg-[#806761] active:scale-[0.96] shadow-md font-extrabold tracking-widest border-2 border-dark-oxide",
      },
      size: {
        default: "h-9 px-4 py-1.5",
        sm: "h-7 px-2.5 text-[11px]",
        md: "h-9 px-4 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  playSound?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, playSound = true, disabled, onClick, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (playSound) {
        soundEffects.playClick();
      }
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {children}
        </span>
      </Comp>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }