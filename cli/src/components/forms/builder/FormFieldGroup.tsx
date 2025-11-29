import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { FormFieldGroup } from "@/components/ui/form-builder"

interface FormFieldGroupProps {
  group: FormFieldGroup
  fields: Array<{ field: any; render: () => React.ReactNode }>
  getGridLayoutClasses: () => string
  getGapClasses: () => string
}

export function FormFieldGroupComponent({
  group,
  fields,
  getGridLayoutClasses,
  getGapClasses,
}: FormFieldGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(group.defaultCollapsed || false)

  return (
    <div className="col-span-12">
      <Card className="overflow-visible">
        {(group.title || group.description) && (
          <CardHeader
            className={cn(
              "cursor-pointer select-none",
              group.collapsible && "hover:bg-muted/50 transition-colors"
            )}
            onClick={() => group.collapsible && setIsCollapsed(!isCollapsed)}
          >
            <div className="flex items-center justify-between">
              <div>
                {group.title && <CardTitle className="text-lg">{group.title}</CardTitle>}
                {group.description && (
                  <CardDescription className="mt-1">{group.description}</CardDescription>
                )}
              </div>
              {group.collapsible && (
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
        )}
        {!isCollapsed && (
          <CardContent className="pt-6">
            <div className={cn("grid", getGridLayoutClasses(), getGapClasses(), "auto-rows-min")}>
              {fields.map((item) => item.render())}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

