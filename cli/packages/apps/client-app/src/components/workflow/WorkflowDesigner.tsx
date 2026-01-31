/**
 * WorkflowDesigner Component
 * Main visual workflow designer with canvas, nodes, edges, and property panel
 */

import { useState, useCallback, useRef, useEffect, memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea,
  Badge,
} from "@lazarus-life/ui-components";
import { X } from "lucide-react";
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeConfig,
  ViewportState,
  SelectionState,
} from "@lazarus-life/shared";
import { NODE_TEMPLATES } from "@lazarus-life/shared";
import { WorkflowNodeComponent } from "./WorkflowNode";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { cn } from "@lazarus-life/ui-components/utils";

interface WorkflowDesignerProps {
  workflow?: WorkflowDefinition;
  onChange?: (workflow: WorkflowDefinition) => void;
  onSave?: (workflow: WorkflowDefinition) => void;
  readOnly?: boolean;
}

/** Generate unique ID */
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Create a new node at position */
function createNode(type: NodeType, position: [number, number]): WorkflowNode {
  const template = NODE_TEMPLATES.find((t) => t.type === type);
  return {
    id: generateId(),
    nodeType: type,
    name: template?.name || type,
    description: template?.description,
    position,
    config: { ...template?.defaultConfig } as NodeConfig,
    metadata: {},
  };
}

export const WorkflowDesigner = memo(function WorkflowDesigner({
  workflow: initialWorkflow,
  onChange,
  onSave,
  readOnly = false,
}: WorkflowDesignerProps) {
  // Workflow state
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialWorkflow?.nodes || []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialWorkflow?.edges || []);
  const [workflowName, setWorkflowName] = useState(initialWorkflow?.name || "New Workflow");
  const [workflowDescription, setWorkflowDescription] = useState(
    initialWorkflow?.description || ""
  );

  // Viewport state
  const [viewport, setViewport] = useState<ViewportState>({
    offset: [0, 0],
    zoom: 1,
  });

  // Selection state
  const [selection, setSelection] = useState<SelectionState>({
    nodes: [],
    edges: [],
  });

  // Connection state
  const [connecting, setConnecting] = useState<string | null>(null);

  // Drag state
  const [dragging, setDragging] = useState<{
    nodeId: string;
    startPos: [number, number];
    nodeStartPos: [number, number];
  } | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Tab state
  const [activeTab, setActiveTab] = useState("workflow");

  // Canvas ref
  const canvasRef = useRef<HTMLDivElement>(null);

  // Push to history
  const pushHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, nodes, edges]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]!;
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]!;
      setNodes(next.nodes);
      setEdges(next.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Add node
  const handleAddNode = useCallback(
    (type: NodeType) => {
      if (readOnly) return;

      // Add at center of canvas
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const centerX = canvasRect ? canvasRect.width / 2 - viewport.offset[0] : 400;
      const centerY = canvasRect ? canvasRect.height / 2 - viewport.offset[1] : 300;

      const newNode = createNode(type, [centerX / viewport.zoom, centerY / viewport.zoom]);
      setNodes((prev) => [...prev, newNode]);
      pushHistory();
    },
    [readOnly, viewport, pushHistory]
  );

  // Select node
  const handleSelectNode = useCallback((nodeId: string) => {
    setSelection({ nodes: [nodeId], edges: [] });
    setConnecting(null);
  }, []);

  // Start connection
  const handleConnectionStart = useCallback((nodeId: string) => {
    setConnecting(nodeId);
  }, []);

  // Start drag
  const handleDragStart = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      if (readOnly) return;

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setDragging({
        nodeId,
        startPos: [e.clientX, e.clientY],
        nodeStartPos: node.position,
      });
    },
    [nodes, readOnly]
  );

  // Handle mouse move for dragging
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragging.startPos[0]) / viewport.zoom;
      const dy = (e.clientY - dragging.startPos[1]) / viewport.zoom;

      setNodes((prev) =>
        prev.map((node) =>
          node.id === dragging.nodeId
            ? {
                ...node,
                position: [
                  dragging.nodeStartPos[0] + dx,
                  dragging.nodeStartPos[1] + dy,
                ],
              }
            : node
        )
      );
    };

    const handleMouseUp = () => {
      setDragging(null);
      pushHistory();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, viewport.zoom, pushHistory]);

  // Handle canvas click for connection completion or deselection
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (connecting) {
        // Find if clicking on a node
        const target = e.target as HTMLElement;
        const nodeElement = target.closest("[data-node-id]");
        if (nodeElement) {
          const targetNodeId = nodeElement.getAttribute("data-node-id");
          if (targetNodeId && targetNodeId !== connecting) {
            // Create edge
            const newEdge: WorkflowEdge = {
              id: `edge_${Date.now()}`,
              source: connecting,
              target: targetNodeId,
            };
            setEdges((prev) => [...prev, newEdge]);
            pushHistory();
          }
        }
        setConnecting(null);
      } else {
        // Deselect
        setSelection({ nodes: [], edges: [] });
      }
    },
    [connecting, pushHistory]
  );

  // Handle drop for adding nodes from palette
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (readOnly) return;

      const nodeType = e.dataTransfer.getData("nodeType") as NodeType;
      if (!nodeType) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - viewport.offset[0]) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.offset[1]) / viewport.zoom;

      const newNode = createNode(nodeType, [x, y]);
      setNodes((prev) => [...prev, newNode]);
      pushHistory();
    },
    [readOnly, viewport, pushHistory]
  );

  // Delete selected
  const handleDelete = useCallback(() => {
    if (readOnly || selection.nodes.length === 0) return;

    setNodes((prev) => prev.filter((n) => !selection.nodes.includes(n.id)));
    setEdges((prev) =>
      prev.filter(
        (e) =>
          !selection.nodes.includes(e.source) && !selection.nodes.includes(e.target)
      )
    );
    setSelection({ nodes: [], edges: [] });
    pushHistory();
  }, [readOnly, selection, pushHistory]);

  // Zoom
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.3) }));
  }, []);

  const handleFitView = useCallback(() => {
    setViewport({ offset: [0, 0], zoom: 1 });
  }, []);

  // Save workflow
  const handleSave = useCallback(() => {
    const workflow: WorkflowDefinition = {
      id: initialWorkflow?.id || generateId(),
      name: workflowName,
      description: workflowDescription || undefined,
      version: (initialWorkflow?.version || 0) + 1,
      nodes,
      edges,
      isActive: initialWorkflow?.isActive ?? true,
      createdAt: initialWorkflow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave?.(workflow);
  }, [initialWorkflow, workflowName, workflowDescription, nodes, edges, onSave]);

  // Get selected node
  const selectedNode = selection.nodes.length === 1
    ? nodes.find((n) => n.id === selection.nodes[0])
    : null;

  // Update selected node config
  const updateNodeConfig = useCallback(
    (config: Partial<NodeConfig>) => {
      if (!selectedNode) return;

      setNodes((prev) =>
        prev.map((n) =>
          n.id === selectedNode.id
            ? { ...n, config: { ...n.config, ...config } }
            : n
        )
      );
    },
    [selectedNode]
  );

  // Update selected node name
  const updateNodeName = useCallback(
    (name: string) => {
      if (!selectedNode) return;

      setNodes((prev) =>
        prev.map((n) => (n.id === selectedNode.id ? { ...n, name } : n))
      );
    },
    [selectedNode]
  );

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="w-64 shrink-0">
        <WorkflowToolbar
          onAddNode={handleAddNode}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onDelete={handleDelete}
          onCopy={() => {}}
          onPaste={() => {}}
          onExport={() => {}}
          onImport={() => {}}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          hasSelection={selection.nodes.length > 0}
          zoom={viewport.zoom}
        />
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAyMCAwIEwgMCAwIDAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] cursor-grab"
        onClick={handleCanvasClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Transform container */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${viewport.offset[0]}px, ${viewport.offset[1]}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Edges (SVG) */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none">
            {edges.map((edge) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const x1 = sourceNode.position[0];
              const y1 = sourceNode.position[1];
              const x2 = targetNode.position[0];
              const y2 = targetNode.position[1];

              // Control points for curved line
              const midX = (x1 + x2) / 2;

              return (
                <g key={edge.id}>
                  <path
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                  {edge.label && (
                    <text
                      x={midX}
                      y={(y1 + y2) / 2 - 8}
                      textAnchor="middle"
                      className="fill-muted-foreground text-xs"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <WorkflowNodeComponent
              key={node.id}
              node={node}
              isSelected={selection.nodes.includes(node.id)}
              isConnecting={connecting === node.id}
              onSelect={handleSelectNode}
              onDragStart={handleDragStart}
              onConnectionStart={handleConnectionStart}
            />
          ))}
        </div>

        {/* Connection indicator */}
        {connecting && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-green-500 px-3 py-1 text-sm text-white">
            Click on a node to connect
          </div>
        )}
      </div>

      {/* Properties Panel */}
      <div className="w-80 shrink-0 border-l bg-muted/30">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-3 mt-3">
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="node" disabled={!selectedNode}>
              Node
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="flex-1 overflow-auto p-3">
            <div className="space-y-4">
              <div>
                <Label htmlFor="workflowName">Name</Label>
                <Input
                  id="workflowName"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="workflowDesc">Description</Label>
                <Textarea
                  id="workflowDesc"
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  disabled={readOnly}
                  rows={3}
                />
              </div>
              <div>
                <Label>Statistics</Label>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>Nodes: {nodes.length}</p>
                  <p>Edges: {edges.length}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="node" className="flex-1 overflow-auto p-3">
            {selectedNode && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nodeName">Name</Label>
                  <Input
                    id="nodeName"
                    value={selectedNode.name}
                    onChange={(e) => updateNodeName(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge variant="outline" className="mt-1">
                    {selectedNode.nodeType}
                  </Badge>
                </div>

                {/* Human Task Config */}
                {selectedNode.nodeType === "human_task" && (
                  <>
                    <div>
                      <Label htmlFor="assignee">Assignee</Label>
                      <Input
                        id="assignee"
                        value={selectedNode.config.assignee || ""}
                        onChange={(e) =>
                          updateNodeConfig({ assignee: e.target.value })
                        }
                        placeholder="Role or user ID"
                        disabled={readOnly}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueOffset">Due Offset</Label>
                      <Input
                        id="dueOffset"
                        value={selectedNode.config.dueOffset || ""}
                        onChange={(e) =>
                          updateNodeConfig({ dueOffset: e.target.value })
                        }
                        placeholder="+1d, +2h, etc."
                        disabled={readOnly}
                      />
                    </div>
                  </>
                )}

                {/* Timer Config */}
                {selectedNode.nodeType === "timer" && (
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={selectedNode.config.duration || ""}
                      onChange={(e) =>
                        updateNodeConfig({ duration: e.target.value })
                      }
                      placeholder="PT1H, P1D, etc."
                      disabled={readOnly}
                    />
                  </div>
                )}

                {/* Decision Config */}
                {selectedNode.nodeType === "decision" && (
                  <>
                    <div>
                      <Label htmlFor="condition">Condition</Label>
                      <Input
                        id="condition"
                        value={selectedNode.config.condition || ""}
                        onChange={(e) =>
                          updateNodeConfig({ condition: e.target.value })
                        }
                        placeholder="${variable}"
                        disabled={readOnly}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ruleId">Rule ID (optional)</Label>
                      <Input
                        id="ruleId"
                        value={selectedNode.config.ruleId || ""}
                        onChange={(e) =>
                          updateNodeConfig({ ruleId: e.target.value })
                        }
                        placeholder="Business rule ID"
                        disabled={readOnly}
                      />
                    </div>
                  </>
                )}

                {/* Script Config */}
                {selectedNode.nodeType === "script" && (
                  <>
                    <div>
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={selectedNode.config.language || "javascript"}
                        onValueChange={(v) =>
                          updateNodeConfig({
                            language: v as "javascript" | "python" | "expression",
                          })
                        }
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="expression">Expression</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="script">Script</Label>
                      <Textarea
                        id="script"
                        value={selectedNode.config.script || ""}
                        onChange={(e) =>
                          updateNodeConfig({ script: e.target.value })
                        }
                        placeholder="Enter script code..."
                        rows={5}
                        className="font-mono text-sm"
                        disabled={readOnly}
                      />
                    </div>
                  </>
                )}

                {/* Notification Config */}
                {selectedNode.nodeType === "notification" && (
                  <>
                    <div>
                      <Label htmlFor="notificationType">Type</Label>
                      <Select
                        value={selectedNode.config.notificationType || "email"}
                        onValueChange={(v) =>
                          updateNodeConfig({
                            notificationType: v as "email" | "sms" | "push" | "webhook",
                          })
                        }
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="push">Push</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="templateId">Template ID</Label>
                      <Input
                        id="templateId"
                        value={selectedNode.config.templateId || ""}
                        onChange={(e) =>
                          updateNodeConfig({ templateId: e.target.value })
                        }
                        placeholder="notification_template_123"
                        disabled={readOnly}
                      />
                    </div>
                  </>
                )}

                {/* SubWorkflow Config */}
                {selectedNode.nodeType === "sub_workflow" && (
                  <div>
                    <Label htmlFor="workflowId">Workflow ID</Label>
                    <Input
                      id="workflowId"
                      value={selectedNode.config.workflowId || ""}
                      onChange={(e) =>
                        updateNodeConfig({ workflowId: e.target.value })
                      }
                      placeholder="workflow_123"
                      disabled={readOnly}
                    />
                  </div>
                )}

                {/* Rule Config */}
                {selectedNode.nodeType === "rule" && (
                  <div>
                    <Label htmlFor="ruleId">Rule ID</Label>
                    <Input
                      id="ruleId"
                      value={selectedNode.config.ruleId || ""}
                      onChange={(e) =>
                        updateNodeConfig({ ruleId: e.target.value })
                      }
                      placeholder="decision_rule_123"
                      disabled={readOnly}
                    />
                  </div>
                )}

                {/* Position */}
                <div>
                  <Label>Position</Label>
                  <p className="text-sm text-muted-foreground">
                    X: {Math.round(selectedNode.position[0])}, Y:{" "}
                    {Math.round(selectedNode.position[1])}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});
