import { ChevronLeft, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarHeaderProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b shrink-0">
      {isCollapsed ? (
        <div className="flex items-center justify-center w-full">
          <Stethoscope className="h-6 w-6 text-primary shrink-0" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <Stethoscope className="h-6 w-6 text-primary shrink-0" />
            <h2 className="text-lg font-semibold truncate">EHR Platform</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="shrink-0"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}

