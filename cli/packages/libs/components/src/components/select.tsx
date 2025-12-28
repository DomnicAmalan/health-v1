/**
 * Select Component
 * Built on @base-ui/react Select for proper dropdown popup support
 */

import { Select as BaseSelect } from "@base-ui/react/select";
import * as React from "react";
import { cn } from "../lib/utils";

export interface SelectProps {
  children: React.ReactNode;
  /** The controlled value of the select */
  value?: string;
  /** The default value when uncontrolled */
  defaultValue?: string;
  /** Called when the value changes */
  onValueChange?: (value: string) => void;
  /** Native onChange handler - for backward compatibility */
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the select is required */
  required?: boolean;
  /** Name for form submission */
  name?: string;
  /** ID for the select element */
  id?: string;
  /** Additional class name for the trigger */
  className?: string;
}

interface ExtractedItem {
  label: React.ReactNode;
  value: string | null;
  disabled?: boolean;
}

/**
 * Extract items data from children for Base UI's items prop
 */
function extractItems(children: React.ReactNode): ExtractedItem[] {
  const items: ExtractedItem[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === SelectValue) {
        // Add placeholder item
        const props = child.props as SelectValueProps;
        items.push({ label: props.placeholder || "Select...", value: null, disabled: true });
      } else if (child.type === SelectContent) {
        // Process SelectContent children
        const contentProps = child.props as SelectContentProps;
        items.push(...extractItems(contentProps.children));
      } else if (child.type === SelectItem) {
        // Add regular item
        const itemProps = child.props as SelectItemProps;
        items.push({
          label: itemProps.children,
          value: itemProps.value,
          disabled: itemProps.disabled,
        });
      }
    }
  });

  return items;
}

const Select = ({
  children,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  name,
  id,
  className,
}: SelectProps) => {
  const items = extractItems(children);

  return (
    <BaseSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(newValue) => {
        if (onValueChange && newValue !== null) {
          onValueChange(newValue as string);
        }
      }}
      disabled={disabled}
      required={required}
      name={name}
      id={id}
      items={items}
    >
      <BaseSelect.Trigger
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
      >
        <BaseSelect.Value />
        <BaseSelect.Icon className="h-4 w-4 opacity-50">
          <ChevronDownIcon />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-50" sideOffset={4}>
          <BaseSelect.Popup
            className={cn(
              "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[starting-style]:scale-95 data-[ending-style]:scale-95",
              "transition-[opacity,transform] duration-150"
            )}
          >
            <BaseSelect.List className="p-1">
              {items.map(({ label, value: itemValue, disabled: itemDisabled }, index) => (
                <BaseSelect.Item
                  key={itemValue ?? `placeholder-${index}`}
                  value={itemValue}
                  disabled={itemDisabled || itemValue === null}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                    "focus:bg-accent focus:text-accent-foreground",
                    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  )}
                >
                  <BaseSelect.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <CheckIcon />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText>{label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
};
Select.displayName = "Select";

export interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * SelectTrigger - Provided for API compatibility.
 * When using the new Base UI-based Select, this is not needed as the trigger is built-in.
 */
const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

export interface SelectValueProps {
  placeholder?: string;
}

/**
 * SelectValue - Marker component for placeholder text.
 * The Select component uses this to show a placeholder option.
 */
const SelectValue = (_props: SelectValueProps) => {
  return null;
};

export interface SelectContentProps {
  children: React.ReactNode;
}

/**
 * SelectContent - Container for SelectItem components.
 * Used to group items for extraction by the Select component.
 */
const SelectContent = ({ children }: SelectContentProps) => {
  return <>{children}</>;
};

export interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
}

/**
 * SelectItem - Represents a selectable option.
 * Used as a marker for the Select component to extract item data.
 */
const SelectItem = (_props: SelectItemProps) => {
  return null;
};
SelectItem.displayName = "SelectItem";

// Helper icons
function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
