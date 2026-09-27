import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-brand text-primary-foreground shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:brightness-105",
        secondary:
          "bg-white/90 text-text border border-border hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary-soft/60 hover:shadow-[var(--shadow-soft)]",
        ghost: "text-text hover:bg-primary-soft/70",
        destructive: "bg-error text-white hover:-translate-y-0.5 hover:brightness-105",
        mint: "bg-mint text-mint-strong hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] hover:brightness-[0.98]",
        peach: "bg-peach text-peach-strong hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] hover:brightness-[0.98]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-13 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
