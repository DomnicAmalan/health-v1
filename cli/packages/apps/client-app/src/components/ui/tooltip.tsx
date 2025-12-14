import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const Tooltip = BaseTooltip.Root;

const TooltipTrigger = BaseTooltip.Trigger;

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> & { sideOffset?: number }
>(({ className, sideOffset = 8, ...props }, ref) => (
  <BaseTooltip.Portal>
    <BaseTooltip.Positioner sideOffset={sideOffset}>
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
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
