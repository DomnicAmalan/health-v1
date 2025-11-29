import { cn } from "@/lib/utils"
import type { CanvasField as CanvasFieldType } from "./types"

interface CanvasFieldProps {
  field: CanvasFieldType
  isSelected: boolean
  isDragging: boolean
  onSelect: () => void
  onDragStart: (e: React.MouseEvent) => void
  onResizeStart: (e: React.MouseEvent) => void
}

export function CanvasField({
  field,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
  onResizeStart,
}: CanvasFieldProps) {
  return (
    <div
      className={cn(
        "absolute border-2 cursor-move transition-all",
        isSelected
          ? "border-primary shadow-fluent-2 z-10"
          : "border-transparent hover:border-[#E1E4E8] z-0",
        isDragging && "opacity-75"
      )}
      style={{
        left: `${field.x}px`,
        top: `${field.y}px`,
        width: `${field.width}px`,
        height: `${field.height}px`,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onMouseDown={onDragStart}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", field.id)
      }}
    >
      {/* Field Content Preview */}
      <div className="w-full h-full p-2 bg-white dark:bg-[#2B2B2B] rounded-xs">
        {field.imageUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-[#E1E4E8] rounded-xs overflow-hidden">
            <img
              src={field.imageUrl}
              alt={field.label || "Image"}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : field.lineDirection === "horizontal" ? (
          <div
            className="w-full h-full"
            style={{
              borderTop: `${field.borderWidth || 1}px ${field.borderStyle || "solid"} ${field.borderColor || "#1C1C1E"}`,
            }}
          />
        ) : field.lineDirection === "vertical" ? (
          <div
            className="w-full h-full"
            style={{
              borderLeft: `${field.borderWidth || 1}px ${field.borderStyle || "solid"} ${field.borderColor || "#1C1C1E"}`,
            }}
          />
        ) : field.borderStyle && field.borderStyle !== "none" ? (
          <div
            className="w-full h-full"
            style={{
              border: `${field.borderWidth || 1}px ${field.borderStyle || "solid"} ${field.borderColor || "#1C1C1E"}`,
            }}
          />
        ) : field.type === "separator" ? (
          <div className="w-full h-full border-t-2 border-[#E1E4E8] flex items-center">
            {field.label && (
              <span className="text-xs text-muted-foreground px-2">{field.label}</span>
            )}
          </div>
        ) : field.type === "display-text" ? (
          <div className="text-sm font-semibold">{field.label || "Display Text"}</div>
        ) : (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">{field.label}</div>
            <div className="h-6 border border-[#E1E4E8] rounded-xs bg-background" />
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {isSelected && (
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary border-2 border-white dark:border-[#2B2B2B] rounded-full cursor-se-resize z-20"
          onMouseDown={(e) => {
            e.stopPropagation()
            onResizeStart(e)
          }}
        />
      )}
    </div>
  )
}

