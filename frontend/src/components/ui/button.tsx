import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-[0.98] min-w-0 justify-center",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_0_rgba(255,85,34,0.39)] hover:shadow-[0_6px_20px_rgba(255,85,34,0.23)] hover:-translate-y-[1px]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-border bg-background hover:bg-secondary hover:border-muted-foreground/20 text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gaming: "bg-foreground text-background hover:bg-foreground/90 tracking-tight px-6 md:px-8", // Kept name for backwards compatibility, but removed skewed styling
      },
      size: {
        default: "h-11 px-4 py-2 [&_svg]:size-4",
        sm: "h-9 rounded-lg px-3 text-[10px] sm:text-xs [&_svg]:size-3.5",
        lg: "h-12 md:h-14 px-4 md:px-10 text-[11px] sm:text-base md:text-lg [&_svg]:size-4 sm:size-5",
        xl: "h-14 md:h-16 px-5 sm:px-8 md:px-12 text-base sm:text-lg md:text-xl font-bold [&_svg]:size-5 md:[&_svg]:size-6",
        icon: "h-10 w-10 md:h-12 md:w-12 [&_svg]:size-5 md:[&_svg]:size-6",
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
