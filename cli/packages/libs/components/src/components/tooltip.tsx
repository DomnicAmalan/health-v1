import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "../lib/utils";

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

const TooltipProvider = ({ children, delayDuration = 300 }: TooltipProviderProps) => {
  // BaseTooltip.Provider may not have delayDuration in types, but it's supported at runtime
  return (
    <BaseTooltip.Provider {...(delayDuration ? { delayDuration } : {})}>
      {children}
    </BaseTooltip.Provider>
  );
};

const Tooltip = BaseTooltip.Root;

// TooltipTrigger with proper typing for asChild prop
const TooltipTrigger = BaseTooltip.Trigger as React.ComponentType<
  React.ComponentProps<typeof BaseTooltip.Trigger> & { asChild?: boolean }
>;

interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> {
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, sideOffset = 8, side = "top", ...props }, ref) => (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner sideOffset={sideOffset} side={side}>
        <BaseTooltip.Popup
          ref={ref}
          className={cn(
            // Microsoft Fluent UI Tooltip Design
            "z-50 overflow-hidden rounded-sm border border-[#E1E4E8] bg-white",
            "px-3 py-2 text-sm text-[#1C1C1E]",
            "shadow-fluent-3",
            "animate-in fade-in-0 zoom-in-95",
            "transition-fluent-fast",
            "max-w-xs",
            className
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  )
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
