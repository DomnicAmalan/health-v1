/**
 * Workflows Page
 * Workflow management with visual designer
 */

import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
} from "lucide-react";
import { WorkflowDesigner } from "@/components/workflow";
import type { WorkflowDefinition, WorkflowInstance, HumanTask } from "@lazarus-life/shared";

export const Route = createFileRoute("/workflows")({
  component: WorkflowsPage,
});

function WorkflowsPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.WORKFLOWS?.VIEW || "workflows:view"} resource="workflows">
      <WorkflowsPageInner />
    </ProtectedRoute>
  );
}

// Mock data for demonstration
const MOCK_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "wf_1",
    name: "Patient Admission Approval",
    description: "Approval workflow for patient admissions",
    version: 2,
    category: "clinical",
    nodes: [],
    edges: [],
    isActive: true,
    tags: ["admission", "approval"],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
  },
  {
    id: "wf_2",
    name: "Prescription Review",
    description: "Multi-level prescription review workflow",
    version: 1,
    category: "pharmacy",
    nodes: [],
    edges: [],
    isActive: true,
    tags: ["pharmacy", "prescription"],
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-18T09:15:00Z",
  },
  {
    id: "wf_3",
    name: "Invoice Approval",
    description: "Financial invoice approval with escalation",
    version: 3,
    category: "billing",
    nodes: [],
    edges: [],
    isActive: false,
    tags: ["billing", "finance"],
    createdAt: "2024-01-05T11:00:00Z",
    updatedAt: "2024-01-22T16:45:00Z",
  },
];

const MOCK_INSTANCES: WorkflowInstance[] = [
  {
    id: "inst_1",
    workflowId: "wf_1",
    workflowVersion: 2,
    status: "running",
    currentNodes: ["approval"],
    variables: { patientId: "P001" },
    history: [],
    startedAt: "2024-01-25T09:00:00Z",
  },
  {
    id: "inst_2",
    workflowId: "wf_2",
    workflowVersion: 1,
    status: "waiting",
    currentNodes: ["pharmacist_review"],
    variables: { prescriptionId: "RX001" },
    history: [],
    startedAt: "2024-01-25T08:30:00Z",
  },
  {
    id: "inst_3",
    workflowId: "wf_1",
    workflowVersion: 2,
    status: "completed",
    currentNodes: ["end"],
    variables: { patientId: "P002" },
    history: [],
    startedAt: "2024-01-24T14:00:00Z",
    completedAt: "2024-01-24T16:30:00Z",
  },
];

const MOCK_TASKS: HumanTask[] = [
  {
    id: "task_1",
    instanceId: "inst_1",
    nodeId: "approval",
    name: "Approve Patient Admission",
    description: "Review and approve patient admission request",
    assignee: "admissions_manager",
    status: "pending",
    priority: "high",
    dueDate: "2024-01-26T17:00:00Z",
    createdAt: "2024-01-25T09:00:00Z",
  },
  {
    id: "task_2",
    instanceId: "inst_2",
    nodeId: "pharmacist_review",
    name: "Review Prescription",
    description: "Verify prescription details and check for interactions",
    assignee: "pharmacist",
    status: "claimed",
    claimedBy: "user_123",
    priority: "urgent",
    dueDate: "2024-01-25T12:00:00Z",
    createdAt: "2024-01-25T08:30:00Z",
  },
];

function WorkflowsPageInner() {
  const [activeTab, setActiveTab] = useState("definitions");
  const [searchQuery, setSearchQuery] = useState("");
  const [designerOpen, setDesignerOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);

  const handleCreateWorkflow = useCallback(() => {
    setSelectedWorkflow(null);
    setDesignerOpen(true);
  }, []);

  const handleEditWorkflow = useCallback((workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setDesignerOpen(true);
  }, []);

  const handleSaveWorkflow = useCallback((workflow: WorkflowDefinition) => {
    console.log("Saving workflow:", workflow);
    setDesignerOpen(false);
  }, []);

  const filteredWorkflows = MOCK_WORKFLOWS.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getWorkflowName = (workflowId: string) => {
    return MOCK_WORKFLOWS.find((w) => w.id === workflowId)?.name || workflowId;
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
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
        <Button onClick={handleCreateWorkflow}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="definitions" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Definitions
          </TabsTrigger>
          <TabsTrigger value="instances" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Instances
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Tasks
            {MOCK_TASKS.filter((t) => t.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {MOCK_TASKS.filter((t) => t.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Workflow Definitions */}
        <TabsContent value="definitions" className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Workflow Grid */}
          <div className="grid grid-cols-3 gap-4">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {workflow.description}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditWorkflow(workflow)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Start Instance
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
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
                  <div className="mt-3 text-xs text-muted-foreground">
                    Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Workflow Instances */}
        <TabsContent value="instances" className="space-y-4">
          <div className="space-y-3">
            {MOCK_INSTANCES.map((instance) => (
              <Card key={instance.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(instance.status)}
                    <div>
                      <p className="font-medium">{getWorkflowName(instance.workflowId)}</p>
                      <p className="text-sm text-muted-foreground">
                        Instance: {instance.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        instance.status === "completed"
                          ? "default"
                          : instance.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {instance.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Started: {new Date(instance.startedAt).toLocaleString()}
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Human Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="space-y-3">
            {MOCK_TASKS.map((task) => (
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
                        <span>Due: {new Date(task.dueDate).toLocaleString()}</span>
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
        </TabsContent>
      </Tabs>

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
