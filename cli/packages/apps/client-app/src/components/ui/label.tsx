import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";
import { HelpHint } from "./component-registry";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  help?: {
    content: string | React.ReactNode;
    title?: string;
  };
}

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, help, children, htmlFor, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(labelVariants(), "inline-flex items-center gap-1.5", className)}
      htmlFor={htmlFor}
      {...props}
    >
      {children}
      {help && (
        <HelpHint
          content={help.content}
          title={help.title}
          variant="subtle"
          size="sm"
          position="inline"
        />
      )}
    </label>
  )
);
Label.displayName = "Label";

export { Label };
