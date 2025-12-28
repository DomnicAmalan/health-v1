import { Input as BaseInput } from "@base-ui/react/input";
import * as React from "react";
import { cn } from "../lib/utils";
import { HoverHelp } from "./hover-help";
import { Label } from "./label";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  help?: {
    content: string | React.ReactNode;
    title?: string;
  };
  label?: string | React.ReactNode;
  labelClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      help,
      label,
      labelClassName,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
      placeholder,
      id: providedId,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if label is provided but no ID is given
    const [generatedId] = React.useState(
      () =>
        providedId || (label ? `input-${Math.random().toString(36).substring(2, 9)}` : undefined)
    );
    const inputId = providedId || generatedId;

    const helpId = help ? `help-${Math.random().toString(36).substring(2, 9)}` : undefined;

    // Generate ARIA label from placeholder if not provided and no label
    const inputAriaLabel = ariaLabel || (label ? undefined : placeholder);

    const baseInputElement = (
      <BaseInput
        type={type}
        id={inputId}
        className={cn(
          "flex h-11 w-full rounded-xs border border-[#E1E4E8] bg-background px-4 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary hover:border-[#D0D6DB] transition-fluent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive",
          className
        )}
        ref={ref}
        aria-label={inputAriaLabel}
        aria-describedby={helpId || ariaDescribedBy}
        aria-required={props.required}
        placeholder={placeholder}
        {...props}
      />
    );

    const inputElement = (
      <div className="relative w-full group">
        {baseInputElement}
        {help && (
          <HoverHelp
            content={help.content}
            title={help.title}
            position="top-right"
            className="mt-1.5"
          />
        )}
      </div>
    );

    // If label is provided, wrap in a container with the label
    if (label) {
      return (
        <div className="space-y-2">
          <Label htmlFor={inputId} className={labelClassName} help={help}>
            {label}
            {props.required && (
              <span className="text-destructive ml-1" aria-hidden="true">
                *
              </span>
            )}
          </Label>
          {inputElement}
        </div>
      );
    }

    return inputElement;
  }
);
Input.displayName = "Input";

export { Input };
