import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed sm:h-9 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/88",
        secondary: "border border-border/90 bg-secondary text-secondary-foreground hover:bg-muted",
        outline: "border border-border/90 bg-card text-foreground hover:bg-muted/70",
        ghost: "bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        danger:
          "border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
      },
      size: {
        default: "",
        sm: "min-h-8 px-2.5 text-xs sm:h-8",
        lg: "min-h-10 rounded-lg px-4 text-sm sm:h-10",
        icon: "min-w-9 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
