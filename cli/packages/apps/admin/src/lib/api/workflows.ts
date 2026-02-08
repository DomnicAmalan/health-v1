/**
 * Workflows API Client
 * n8n-style visual workflow management
 */

import { API_ROUTES, apiRequest } from "./client";
import type { ApiResponse } from "./types";
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowInstance,
  HumanTask,
} from "@lazarus-life/shared";

// ============================================================================
// Types
// ============================================================================

export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  category?: string;
  version: number;
  isActive: boolean;
  tags?: string[];
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  category?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  category?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  isActive?: boolean;
  tags?: string[];
}

export interface CloneWorkflowRequest {
  name: string;
}

export interface StartWorkflowRequest {
  variables?: Record<string, unknown>;
  correlationId?: string;
}

export interface ListWorkflowsResponse {
  workflows: WorkflowSummary[];
  total: number;
}

export interface ListInstancesResponse {
  instances: WorkflowInstance[];
  total: number;
}

export interface ListTasksResponse {
  tasks: HumanTask[];
  total: number;
}

export interface CompleteTaskRequest {
  result: Record<string, unknown>;
}

// ============================================================================
// Workflow Definition API
// ============================================================================

/**
 * List all workflows
 */
export async function listWorkflows(params?: {
  category?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<ListWorkflowsResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.isActive !== undefined) searchParams.set("is_active", String(params.isActive));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  const url = query
    ? `${API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.LIST}?${query}`
    : API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.LIST;

  return apiRequest(url);
}

/**
 * Get workflow by ID
 */
export async function getWorkflow(id: string): Promise<ApiResponse<WorkflowDefinition>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.GET(id));
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
  request: CreateWorkflowRequest
): Promise<ApiResponse<WorkflowDefinition>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.CREATE, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  id: string,
  request: UpdateWorkflowRequest
): Promise<ApiResponse<WorkflowDefinition>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.UPDATE(id), {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<ApiResponse<void>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.DELETE(id), {
    method: "DELETE",
  });
}

/**
 * Clone a workflow
 */
export async function cloneWorkflow(
  id: string,
  request: CloneWorkflowRequest
): Promise<ApiResponse<WorkflowDefinition>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.CLONE(id), {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Activate a workflow
 */
export async function activateWorkflow(id: string): Promise<ApiResponse<WorkflowDefinition>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.ACTIVATE(id), {
    method: "POST",
  });
}

/**
 * Deactivate a workflow
 */
export async function deactivateWorkflow(id: string): Promise<ApiResponse<WorkflowDefinition>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.DEFINITIONS.DEACTIVATE(id), {
    method: "POST",
  });
}

// ============================================================================
// Workflow Instance API
// ============================================================================

/**
 * Start a workflow instance
 */
export async function startWorkflow(
  workflowId: string,
  request: StartWorkflowRequest
): Promise<ApiResponse<WorkflowInstance>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.INSTANCES.START(workflowId), {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * List workflow instances
 */
export async function listInstances(
  workflowId: string,
  params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ApiResponse<ListInstancesResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  const url = query
    ? `${API_ROUTES.ADMIN.WORKFLOWS.INSTANCES.LIST(workflowId)}?${query}`
    : API_ROUTES.ADMIN.WORKFLOWS.INSTANCES.LIST(workflowId);

  return apiRequest(url);
}

/**
 * Get workflow instance by ID
 */
export async function getInstance(id: string): Promise<ApiResponse<WorkflowInstance>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.INSTANCES.GET(id));
}

/**
 * Pause a workflow instance
 */
export async function pauseInstance(id: string): Promise<ApiResponse<WorkflowInstance>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.INSTANCES.PAUSE(id), {
    method: "POST",
  });
}

/**
 * Resume a workflow instance
 */
export async function resumeInstance(id: string): Promise<ApiResponse<WorkflowInstance>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.INSTANCES.RESUME(id), {
    method: "POST",
  });
}

/**
 * Cancel a workflow instance
 */
export async function cancelInstance(id: string): Promise<ApiResponse<WorkflowInstance>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.INSTANCES.CANCEL(id), {
    method: "POST",
  });
}

// ============================================================================
// Human Task API
// ============================================================================

/**
 * List tasks
 */
export async function listTasks(params?: {
  assignee?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<ListTasksResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.assignee) searchParams.set("assignee", params.assignee);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  const url = query
    ? `${API_ROUTES.ADMIN.WORKFLOWS.TASKS.LIST}?${query}`
    : API_ROUTES.ADMIN.WORKFLOWS.TASKS.LIST;

  return apiRequest(url);
}

/**
 * Get task by ID
 */
export async function getTask(id: string): Promise<ApiResponse<HumanTask>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.TASKS.GET(id));
}

/**
 * Claim a task
 */
export async function claimTask(id: string): Promise<ApiResponse<HumanTask>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.TASKS.CLAIM(id), {
    method: "POST",
  });
}

/**
 * Unclaim a task
 */
export async function unclaimTask(id: string): Promise<ApiResponse<HumanTask>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.TASKS.UNCLAIM(id), {
    method: "POST",
  });
}

/**
 * Complete a task
 */
export async function completeTask(
  id: string,
  request: CompleteTaskRequest
): Promise<ApiResponse<HumanTask>> {
  return apiRequest(API_ROUTES.ADMIN.WORKFLOWS.TASKS.COMPLETE(id), {
    method: "POST",
    body: JSON.stringify(request),
  });
}
