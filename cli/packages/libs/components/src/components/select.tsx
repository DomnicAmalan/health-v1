/**
 * Select Component
 * Simple select dropdown using native select with Radix-like API support
 */

import * as React from "react";
import { cn } from "../lib/utils";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  children: React.ReactNode;
  /** Radix-style value change handler - called with the string value */
  onValueChange?: (value: string) => void;
  /** Native onChange handler - still supported for backward compatibility */
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Support both onValueChange (Radix-style) and native onChange
      if (onValueChange) {
        onValueChange(e.target.value);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export interface SelectTriggerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  children: React.ReactNode;
}

/**
 * SelectTrigger - A wrapper that renders its children within a styled container.
 * For the native select pattern, this acts as a visual container for SelectValue and the actual select options.
 * The parent Select component should pass value/onChange.
 */
const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          // Hide the native appearance when used with Select
          "[&>select]:absolute [&>select]:inset-0 [&>select]:opacity-0 [&>select]:cursor-pointer",
          "relative",
          className
        )}
        {...props}
      >
        {children}
        <svg
          className="h-4 w-4 opacity-50 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

export interface SelectValueProps {
  placeholder?: string;
}

/**
 * SelectValue - Displays the placeholder or selected value text.
 * When used with native select pattern, this should be rendered inside SelectTrigger.
 */
const SelectValue = ({ placeholder }: SelectValueProps) => {
  return <span className="pointer-events-none">{placeholder || "Select..."}</span>;
};

export interface SelectContentProps {
  children: React.ReactNode;
}

/**
 * SelectContent - Container for SelectItem components.
 * In the native select implementation, this is a pass-through.
 */
const SelectContent = ({ children }: SelectContentProps) => {
  return <>{children}</>;
};

export interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

/**
 * SelectItem - Represents a selectable option.
 * Renders as a native <option> element.
 */
const SelectItem = React.forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <option ref={ref} className={className} {...props}>
        {children}
      </option>
    );
  }
);
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
