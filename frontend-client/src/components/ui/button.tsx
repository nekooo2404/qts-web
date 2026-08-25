import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent px-4 text-sm font-semibold leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_24px_rgb(37_99_235_/_0.18)] hover:bg-primary-hover hover:shadow-[0_14px_30px_rgb(37_99_235_/_0.24)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_8px_20px_rgb(161_43_53_/_0.16)] hover:bg-destructive/90",
        outline:
          "border-border bg-background/80 text-foreground shadow-[0_5px_16px_rgb(7_20_38_/_0.06)] backdrop-blur-md hover:border-primary/40 hover:bg-primary-soft",
        secondary:
          "border-white/20 bg-white/12 text-white shadow-[0_8px_24px_rgb(7_20_38_/_0.16)] backdrop-blur-md hover:bg-white/20",
        ghost: "bg-transparent text-primary-hover hover:bg-primary-soft",
        link: "min-h-0 rounded-none px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 min-h-9 rounded-md px-3 text-xs",
        lg: "h-12 min-h-12 px-5 text-base",
        icon: "size-11 min-h-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
