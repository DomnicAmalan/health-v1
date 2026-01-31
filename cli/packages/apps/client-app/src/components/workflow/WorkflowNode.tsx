/**
 * WorkflowNode Component
 * Renders a single node in the workflow canvas
 */

import { memo, useCallback } from "react";
import { Card, CardContent, Badge } from "@lazarus-life/ui-components";
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
  GripVertical,
} from "lucide-react";
import type { WorkflowNode as WorkflowNodeType, NodeType } from "@lazarus-life/shared";
import { cn } from "@lazarus-life/ui-components/utils";

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isSelected: boolean;
  isConnecting: boolean;
  onSelect: (nodeId: string) => void;
  onDragStart: (nodeId: string, e: React.MouseEvent) => void;
  onConnectionStart: (nodeId: string) => void;
}

/** Icon mapping for node types */
const NODE_ICONS: Record<NodeType, React.ElementType> = {
  start: Play,
  end: Square,
  action: Zap,
  decision: GitBranch,
  human_task: User,
  timer: Clock,
  notification: Bell,
  rule: Scale,
  script: Code,
  sub_workflow: GitMerge,
  parallel_split: Split,
  parallel_join: Merge,
};

/** Color classes for node types */
const NODE_COLORS: Record<NodeType, string> = {
  start: "border-green-500 bg-green-50",
  end: "border-red-500 bg-red-50",
  action: "border-blue-500 bg-blue-50",
  decision: "border-amber-500 bg-amber-50",
  human_task: "border-purple-500 bg-purple-50",
  timer: "border-orange-500 bg-orange-50",
  notification: "border-pink-500 bg-pink-50",
  rule: "border-cyan-500 bg-cyan-50",
  script: "border-gray-500 bg-gray-50",
  sub_workflow: "border-indigo-500 bg-indigo-50",
  parallel_split: "border-teal-500 bg-teal-50",
  parallel_join: "border-teal-500 bg-teal-50",
};

/** Icon color classes */
const ICON_COLORS: Record<NodeType, string> = {
  start: "text-green-600",
  end: "text-red-600",
  action: "text-blue-600",
  decision: "text-amber-600",
  human_task: "text-purple-600",
  timer: "text-orange-600",
  notification: "text-pink-600",
  rule: "text-cyan-600",
  script: "text-gray-600",
  sub_workflow: "text-indigo-600",
  parallel_split: "text-teal-600",
  parallel_join: "text-teal-600",
};

export const WorkflowNodeComponent = memo(function WorkflowNodeComponent({
  node,
  isSelected,
  isConnecting,
  onSelect,
  onDragStart,
  onConnectionStart,
}: WorkflowNodeProps) {
  const Icon = NODE_ICONS[node.nodeType] || Zap;
  const colorClass = NODE_COLORS[node.nodeType] || "border-gray-500 bg-gray-50";
  const iconColor = ICON_COLORS[node.nodeType] || "text-gray-600";

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node.id);
    },
    [node.id, onSelect]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        onDragStart(node.id, e);
      }
    },
    [node.id, onDragStart]
  );

  const handleConnectionClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onConnectionStart(node.id);
    },
    [node.id, onConnectionStart]
  );

  return (
    <div
      className="absolute cursor-move"
      style={{
        left: node.position[0],
        top: node.position[1],
        transform: "translate(-50%, -50%)",
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <Card
        className={cn(
          "w-48 border-2 transition-all",
          colorClass,
          isSelected && "ring-2 ring-blue-500 ring-offset-2",
          isConnecting && "ring-2 ring-green-500 ring-offset-2"
        )}
      >
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <Icon className={cn("h-5 w-5", iconColor)} />
            <span className="flex-1 truncate font-medium text-sm">{node.name}</span>
          </div>

          {/* Description */}
          {node.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {node.description}
            </p>
          )}

          {/* Config badges */}
          <div className="mt-2 flex flex-wrap gap-1">
            {node.nodeType === "human_task" && node.config.assignee && (
              <Badge variant="outline" className="text-xs">
                {node.config.assignee}
              </Badge>
            )}
            {node.nodeType === "timer" && node.config.duration && (
              <Badge variant="outline" className="text-xs">
                {node.config.duration}
              </Badge>
            )}
            {node.nodeType === "rule" && node.config.ruleId && (
              <Badge variant="outline" className="text-xs">
                Rule
              </Badge>
            )}
          </div>

          {/* Connection handles */}
          <div className="mt-2 flex justify-between">
            {/* Input handle (not for start) */}
            {node.nodeType !== "start" && (
              <div
                className="h-3 w-3 rounded-full border-2 border-gray-400 bg-white hover:bg-blue-100"
                title="Input"
              />
            )}
            {node.nodeType === "start" && <div className="w-3" />}

            {/* Output handle (not for end) */}
            {node.nodeType !== "end" && (
              <div
                className="h-3 w-3 cursor-crosshair rounded-full border-2 border-gray-400 bg-white hover:bg-green-100"
                title="Connect to another node"
                onClick={handleConnectionClick}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
