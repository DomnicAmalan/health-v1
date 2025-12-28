import type { FormField, FormFieldGroup } from "@lazarus-life/ui-components";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Flex,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface FormFieldGroupProps {
  group: FormFieldGroup;
  fields: Array<{ field: FormField; render: () => React.ReactNode }>;
  getGridLayoutClasses: () => string;
  getGapClasses: () => string;
}

export function FormFieldGroupComponent({
  group,
  fields,
  getGridLayoutClasses,
  getGapClasses,
}: FormFieldGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(group.defaultCollapsed);

  return (
    <Box className="col-span-12">
      <Card className="overflow-visible">
        {(group.title || group.description) && (
          <CardHeader
            className={cn(
              "cursor-pointer select-none",
              group.collapsible && "hover:bg-muted/50 transition-colors"
            )}
            onClick={() => group.collapsible && setIsCollapsed(!isCollapsed)}
          >
            <Flex className="items-center justify-between">
              <Box>
                {group.title && <CardTitle className="text-lg">{group.title}</CardTitle>}
                {group.description && (
                  <CardDescription className="mt-1">{group.description}</CardDescription>
                )}
              </Box>
              {group.collapsible && (
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              )}
            </Flex>
          </CardHeader>
        )}
        {!isCollapsed && (
          <CardContent className="pt-6">
            <Box className={cn("grid", getGridLayoutClasses(), getGapClasses(), "auto-rows-min")}>
              {fields.map((item) => item.render())}
            </Box>
          </CardContent>
        )}
      </Card>
    </Box>
  );
}
