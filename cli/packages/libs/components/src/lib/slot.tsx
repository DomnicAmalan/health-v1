import * as React from "react";

/**
 * Slot component - merges its props onto its immediate child
 * This is a simplified version of Radix's Slot for the asChild pattern
 */
interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

function Slot({ children, ...props }: SlotProps) {
  if (React.isValidElement<Record<string, unknown>>(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, {
      ...props,
      ...childProps,
      className: [props.className, childProps.className].filter(Boolean).join(" "),
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
