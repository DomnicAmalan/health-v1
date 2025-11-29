import * as React from "react"
import { Box } from "./box"
import { cn } from "@/lib/utils"

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full"
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "lg", ...props }, ref) => {
    const sizeClasses = {
      sm: "max-w-screen-sm",
      md: "max-w-screen-md",
      lg: "max-w-screen-lg",
      xl: "max-w-screen-xl",
      full: "max-w-full",
    }

    return (
      <Box
        ref={ref}
        className={cn("mx-auto px-4", sizeClasses[size], className)}
        {...props}
      />
    )
  }
)
Container.displayName = "Container"

export { Container }

