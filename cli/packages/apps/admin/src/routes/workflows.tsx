/**
 * Workflows Management Page
 * n8n-style visual workflow designer for admin panel
 */

import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  WorkflowDesigner,
} from "@lazarus-life/ui-components";
import {
  GitBranch,
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ListTodo,
  Power,
  PowerOff,
} from "lucide-react";
import type { WorkflowDefinition, WorkflowInstance, HumanTask } from "@lazarus-life/shared";
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  cloneWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  listTasks,
  claimTask,
  completeTask,
  type WorkflowSummary,
} from "../lib/api/workflows";
import { ProtectedButton, ProtectedPage } from "../lib/permissions";

export const Route = createFileRoute("/workflows")({
  component: WorkflowsPage,
});

function WorkflowsPage() {
  return (
    <ProtectedPage
      pageName="workflows"
      fallback={<div className="p-6">You don't have access to this page.</div>}
    >
      <WorkflowsPageInner />
    </ProtectedPage>
  );
}

function WorkflowsPageInner() {
  const [activeTab, setActiveTab] = useState("definitions");
  const [searchQuery, setSearchQuery] = useState("");
  const [designerOpen, setDesignerOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);

  const queryClient = useQueryClient();

  // Fetch workflows
  const { data: workflowsResponse, isLoading: workflowsLoading } = useQuery({
    queryKey: ["admin-workflows"],
    queryFn: () => listWorkflows(),
  });

  // Fetch tasks
  const { data: tasksResponse, isLoading: tasksLoading } = useQuery({
    queryKey: ["admin-workflow-tasks"],
    queryFn: () => listTasks(),
  });

  // Safely extract arrays
  const workflows: WorkflowSummary[] = workflowsResponse?.workflows || [];
  const tasks: HumanTask[] = tasksResponse?.tasks || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (workflow: Partial<WorkflowDefinition>) =>
      createWorkflow({
        name: workflow.name || "New Workflow",
        description: workflow.description,
        category: workflow.category,
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        inputSchema: workflow.inputSchema,
        outputSchema: workflow.outputSchema,
        tags: workflow.tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workflows"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, workflow }: { id: string; workflow: Partial<WorkflowDefinition> }) =>
      updateWorkflow(id, {
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        nodes: workflow.nodes,
        edges: workflow.edges,
        inputSchema: workflow.inputSchema,
        outputSchema: workflow.outputSchema,
        isActive: workflow.isActive,
        tags: workflow.tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workflows"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workflows"] });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => cloneWorkflow(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workflows"] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workflows"] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workflows"] });
    },
  });

  // Handlers
  const handleCreateWorkflow = useCallback(() => {
    setSelectedWorkflow(null);
    setDesignerOpen(true);
  }, []);

  const handleEditWorkflow = useCallback(async (workflowId: string) => {
    try {
      const response = await getWorkflow(workflowId);
      if (response) {
        setSelectedWorkflow(response as unknown as WorkflowDefinition);
        setDesignerOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch workflow:", error);
    }
  }, []);

  const handleSaveWorkflow = useCallback(
    (workflow: WorkflowDefinition) => {
      if (selectedWorkflow?.id) {
        updateMutation.mutate({ id: selectedWorkflow.id, workflow });
      } else {
        createMutation.mutate(workflow);
      }
      setDesignerOpen(false);
    },
    [selectedWorkflow, createMutation, updateMutation]
  );

  const handleDeleteWorkflow = useCallback(
    (workflowId: string) => {
      if (confirm("Are you sure you want to delete this workflow?")) {
        deleteMutation.mutate(workflowId);
      }
    },
    [deleteMutation]
  );

  const handleCloneWorkflow = useCallback(
    (workflowId: string, name: string) => {
      const newName = prompt("Enter name for the cloned workflow:", `${name} (Copy)`);
      if (newName) {
        cloneMutation.mutate({ id: workflowId, name: newName });
      }
    },
    [cloneMutation]
  );

  const handleToggleActive = useCallback(
    (workflowId: string, isActive: boolean) => {
      if (isActive) {
        deactivateMutation.mutate(workflowId);
      } else {
        activateMutation.mutate(workflowId);
      }
    },
    [activateMutation, deactivateMutation]
  );

  // Filter workflows
  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Status icons for instances
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="h-4 w-4 text-green-500" />;
      case "waiting":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "paused":
        return <Pause className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const pendingTaskCount = tasks.filter((t) => t.status === "pending").length;

  return (
    <div className="p-6">
      <Stack spacing="lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Workflows</h1>
              <p className="text-muted-foreground">
                Design and manage automated workflows
              </p>
            </div>
          </div>
          <ProtectedButton buttonId="create-workflow" onClick={handleCreateWorkflow}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </ProtectedButton>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="definitions" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Definitions
              <Badge variant="secondary" className="ml-1">
                {workflows.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks
              {pendingTaskCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingTaskCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Workflow Definitions */}
          <TabsContent value="definitions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Workflows</CardTitle>
                    <CardDescription>
                      Visual workflow definitions with n8n-style designer
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search workflows..."
                        className="pl-8 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {workflowsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading workflows...</p>
                  </div>
                ) : filteredWorkflows.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-center">
                    <div className="space-y-2">
                      <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery
                          ? "No workflows found matching your search"
                          : "No workflows found. Create your first workflow!"}
                      </p>
                      {!searchQuery && (
                        <Button onClick={handleCreateWorkflow} variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Workflow
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {filteredWorkflows.map((workflow) => (
                      <Card
                        key={workflow.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{workflow.name}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {workflow.description || "No description"}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditWorkflow(workflow.id)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleCloneWorkflow(workflow.id, workflow.name)
                                  }
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleActive(workflow.id, workflow.isActive)
                                  }
                                >
                                  {workflow.isActive ? (
                                    <>
                                      <PowerOff className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Power className="mr-2 h-4 w-4" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteWorkflow(workflow.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={workflow.isActive ? "default" : "secondary"}>
                              {workflow.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">v{workflow.version}</Badge>
                            {workflow.category && (
                              <Badge variant="outline" className="capitalize">
                                {workflow.category}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{workflow.nodeCount} nodes</span>
                            <span>{workflow.edgeCount} edges</span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Human Tasks */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Human Tasks</CardTitle>
                <CardDescription>
                  Tasks requiring human interaction during workflow execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading tasks...</p>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-center">
                    <div className="space-y-2">
                      <ListTodo className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No pending tasks</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <Card key={task.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{task.name}</p>
                              {task.priority === "urgent" && (
                                <Badge variant="destructive">Urgent</Badge>
                              )}
                              {task.priority === "high" && (
                                <Badge variant="default">High</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Assigned to: {task.assignee}</span>
                              {task.dueDate && (
                                <span>
                                  Due: {new Date(task.dueDate).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                task.status === "completed"
                                  ? "default"
                                  : task.status === "claimed"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="capitalize"
                            >
                              {task.status}
                            </Badge>
                            {task.status === "pending" && (
                              <Button size="sm">Claim</Button>
                            )}
                            {task.status === "claimed" && (
                              <Button size="sm">Complete</Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Stack>

      {/* Workflow Designer Dialog */}
      <Dialog open={designerOpen} onOpenChange={setDesignerOpen}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0">
          <DialogHeader className="px-4 py-2 border-b">
            <DialogTitle>
              {selectedWorkflow ? `Edit: ${selectedWorkflow.name}` : "Create Workflow"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <WorkflowDesigner
              workflow={selectedWorkflow || undefined}
              onSave={handleSaveWorkflow}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
