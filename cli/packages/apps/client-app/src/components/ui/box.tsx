import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Slot component - merges its props onto its immediate child
 * This is a simplified version of Radix's Slot for the asChild pattern
 */
interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

function Slot({ children, ...props }: SlotProps) {
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ...children.props,
      className: [props.className, children.props.className].filter(Boolean).join(" "),
    });
  }

  if (React.Children.count(children) > 1) {
    React.Children.only(null);
  }

  return null;
}

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return <Comp ref={ref} className={cn(className)} {...props} />;
  }
);
Box.displayName = "Box";

export { Box };
