/**
 * WorkflowToolbar Component
 * Node palette and toolbar for the workflow designer
 */

import { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Separator,
  ScrollArea,
} from "@lazarus-life/ui-components";
import {
  Play,
  Square,
  Zap,
  GitBranch,
  User,
  Clock,
  Bell,
  Scale,
  Code,
  GitMerge,
  Split,
  Merge,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Trash2,
  Copy,
  ClipboardPaste,
  FileJson,
  Upload,
} from "lucide-react";
import type { NodeType } from "@lazarus-life/shared";
import { NODE_TEMPLATES } from "@lazarus-life/shared";
import { cn } from "@lazarus-life/ui-components/utils";

interface WorkflowToolbarProps {
  onAddNode: (type: NodeType) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onExport: () => void;
  onImport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  zoom: number;
}

/** Icon mapping for node templates */
const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  Play,
  Square,
  Zap,
  GitBranch,
  User,
  Clock,
  Bell,
  Scale,
  Code,
  GitMerge,
  Split,
  Merge,
};

export const WorkflowToolbar = memo(function WorkflowToolbar({
  onAddNode,
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onDelete,
  onCopy,
  onPaste,
  onExport,
  onImport,
  canUndo,
  canRedo,
  hasSelection,
  zoom,
}: WorkflowToolbarProps) {
  return (
    <div className="flex h-full flex-col border-r bg-muted/30">
      {/* Action Toolbar */}
      <div className="flex flex-wrap gap-1 border-b p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSave}
          title="Save workflow"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-8" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-8" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onCopy}
          disabled={!hasSelection}
          title="Copy"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPaste}
          title="Paste"
        >
          <ClipboardPaste className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={!hasSelection}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-8" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="flex w-12 items-center justify-center text-sm">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onFitView}
          title="Fit to view"
        >
          <Maximize className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-8" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onExport}
          title="Export workflow"
        >
          <FileJson className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onImport}
          title="Import workflow"
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>

      {/* Node Palette */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Node Palette
          </h3>
          <div className="space-y-2">
            {NODE_TEMPLATES.map((template) => {
              const Icon = TEMPLATE_ICONS[template.icon] || Zap;
              return (
                <Card
                  key={template.type}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary hover:shadow-sm",
                    "active:scale-95"
                  )}
                  onClick={() => onAddNode(template.type)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("nodeType", template.type);
                  }}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {template.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Quick Help */}
      <div className="border-t p-3">
        <p className="text-xs text-muted-foreground">
          Drag nodes to canvas or click to add at center.
          Connect nodes by clicking output handles.
        </p>
      </div>
    </div>
  );
});
