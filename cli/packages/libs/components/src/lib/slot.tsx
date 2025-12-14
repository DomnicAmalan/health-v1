import * as React from "react";

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

Slot.displayName = "Slot";

export { Slot };
export type { SlotProps };

