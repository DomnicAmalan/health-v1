import { Eye, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CanvasToolbarProps {
  viewMode: "edit" | "preview"
  fieldCount: number
  onViewModeChange: (mode: "edit" | "preview") => void
}

export function CanvasToolbar({ viewMode, fieldCount, onViewModeChange }: CanvasToolbarProps) {
  return (
    <div className="border-b bg-white dark:bg-[#2B2B2B] px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Physical Form Builder</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "edit" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("edit")}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant={viewMode === "preview" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("preview")}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Print Preview
        </Button>
        <span className="text-sm text-muted-foreground ml-4">
          {fieldCount} field{fieldCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}

