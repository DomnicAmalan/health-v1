/**
 * Workflow API Hooks - n8n-style workflow management
 * Connects to backend workflow engine for visual workflow builder
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { WorkflowDefinition, WorkflowInstance, HumanTask } from "@lazarus-life/shared";

// ============================================================================
// Query Keys
// ============================================================================

export const workflowKeys = {
  all: ["workflows"] as const,
  lists: () => [...workflowKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  instances: () => [...workflowKeys.all, "instances"] as const,
  instance: (id: string) => [...workflowKeys.instances(), id] as const,
  tasks: () => [...workflowKeys.all, "tasks"] as const,
  connectors: () => [...workflowKeys.all, "connectors"] as const,
};

// ============================================================================
// Connector Types
// ============================================================================

export interface ConnectorParameter {
  name: string;
  param_type: string;
  required: boolean;
  description: string;
}

export interface ConnectorAction {
  name: string;
  description: string;
  parameters: ConnectorParameter[];
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  description: string;
  actions: ConnectorAction[];
}

// ============================================================================
// Workflow Definition Hooks
// ============================================================================

/**
 * List all workflows
 */
export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get<WorkflowDefinition[]>("/v1/workflows");
      return response.data;
    },
  });
}

/**
 * Get a specific workflow by ID
 */
export function useWorkflow(workflowId: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.detail(workflowId || ""),
    queryFn: async () => {
      if (!workflowId) throw new Error("Workflow ID required");
      const response = await apiClient.get<WorkflowDefinition>(`/v1/workflows/${workflowId}`);
      return response.data;
    },
    enabled: !!workflowId,
  });
}

/**
 * Create a new workflow
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflow: Partial<WorkflowDefinition>) => {
      const response = await apiClient.post<WorkflowDefinition>("/v1/workflows", workflow);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

/**
 * Update an existing workflow
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workflow }: { id: string; workflow: Partial<WorkflowDefinition> }) => {
      const response = await apiClient.put<WorkflowDefinition>(`/v1/workflows/${id}`, workflow);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a workflow
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      await apiClient.delete(`/v1/workflows/${workflowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

// ============================================================================
// Workflow Instance Hooks
// ============================================================================

/**
 * List workflow instances
 */
export function useWorkflowInstances(workflowId?: string) {
  return useQuery({
    queryKey: [...workflowKeys.instances(), workflowId],
    queryFn: async () => {
      const params = workflowId ? { workflowId } : {};
      const response = await apiClient.get<WorkflowInstance[]>("/v1/workflow-instances", { params });
      return response.data;
    },
  });
}

/**
 * Get a specific workflow instance
 */
export function useWorkflowInstance(instanceId: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.instance(instanceId || ""),
    queryFn: async () => {
      if (!instanceId) throw new Error("Instance ID required");
      const response = await apiClient.get<WorkflowInstance>(`/v1/workflow-instances/${instanceId}`);
      return response.data;
    },
    enabled: !!instanceId,
  });
}

/**
 * Start a workflow instance
 */
export function useStartWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, variables }: { workflowId: string; variables: Record<string, unknown> }) => {
      const response = await apiClient.post<WorkflowInstance>(`/v1/workflows/${workflowId}/instances`, { variables });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.instances() });
    },
  });
}

// ============================================================================
// Human Task Hooks
// ============================================================================

/**
 * List workflow tasks
 */
export function useWorkflowTasks(filters?: { assignee?: string; status?: string }) {
  return useQuery({
    queryKey: [...workflowKeys.tasks(), filters],
    queryFn: async () => {
      const response = await apiClient.get<HumanTask[]>("/v1/workflow-tasks", { params: filters });
      return response.data;
    },
  });
}

/**
 * Claim a task
 */
export function useClaimTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const response = await apiClient.post<HumanTask>(`/v1/workflow-tasks/${taskId}/claim`, { userId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.tasks() });
    },
  });
}

/**
 * Complete a task
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, result }: { taskId: string; result: Record<string, unknown> }) => {
      const response = await apiClient.post<HumanTask>(`/v1/workflow-tasks/${taskId}/complete`, result);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.instances() });
    },
  });
}

// ============================================================================
// Event Emission Hook (n8n-style webhooks)
// ============================================================================

/**
 * Emit an event to trigger workflows
 */
export function useEmitWorkflowEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventType, payload }: { eventType: string; payload: Record<string, unknown> }) => {
      const response = await apiClient.post(`/v1/workflows/events/${eventType}`, { payload });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.instances() });
    },
  });
}

// ============================================================================
// Connector Hooks
// ============================================================================

/**
 * Get all available connectors
 */
export function useConnectors() {
  return useQuery({
    queryKey: workflowKeys.connectors(),
    queryFn: async () => {
      const response = await apiClient.get<ConnectorMetadata[]>("/v1/connectors");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - connectors rarely change
  });
}
