/**
 * ImmutableField Component
 * Component that prevents editing of immutable fields
 */

import {
  Flex,
  Input,
  Label,
  Stack,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lazarus-life/ui-components";
import { Lock } from "lucide-react";

interface ImmutableFieldProps {
  label: string;
  value: string | number | Date;
  immutable?: boolean;
  tooltip?: string;
  className?: string;
}

export function ImmutableField({
  label,
  value,
  immutable = true,
  tooltip = "This field cannot be modified",
  className = "",
}: ImmutableFieldProps) {
  const displayValue = value instanceof Date ? value.toLocaleDateString() : String(value);

  return (
    <Stack spacing="sm" className={className}>
      <Flex align="center" gap="sm">
        <Label htmlFor={label} className="text-sm font-medium">
          {label}
        </Label>
        {immutable && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild={true}>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Flex>
      <Input
        id={label}
        value={displayValue}
        disabled={immutable}
        readOnly={immutable}
        className={immutable ? "bg-muted cursor-not-allowed" : ""}
        onCopy={(e) => {
          if (immutable) {
            e.preventDefault();
          }
        }}
        onPaste={(e) => {
          if (immutable) {
            e.preventDefault();
          }
        }}
      />
    </Stack>
  );
}
