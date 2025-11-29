/**
 * Workflow Executor
 * Execute workflows via LLM or direct execution
 */

import { workflowRegistry, WorkflowDefinition, WorkflowResult } from './workflowRegistry';
import { getVoiceCommandExecutor } from './voiceCommandExecutor';

export class WorkflowExecutor {
  public async executeWorkflow(
    workflowId: string,
    params: Record<string, unknown> = {}
  ): Promise<WorkflowResult> {
    const workflow = workflowRegistry.get(workflowId);
    
    if (!workflow) {
      return {
        success: false,
        error: `Workflow ${workflowId} not found`,
      };
    }

    try {
      return await workflow.execute(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async findAndExecuteWorkflow(
    command: string
  ): Promise<WorkflowResult> {
    const workflow = workflowRegistry.findByTrigger(command);
    
    if (!workflow) {
      return {
        success: false,
        error: 'No matching workflow found',
      };
    }

    return await this.executeWorkflow(workflow.id);
  }

  public getAvailableWorkflows(): WorkflowDefinition[] {
    return workflowRegistry.getAll();
  }
}

// Global instance
let executorInstance: WorkflowExecutor | null = null;

export function getWorkflowExecutor(): WorkflowExecutor {
  if (!executorInstance) {
    executorInstance = new WorkflowExecutor();
  }
  return executorInstance;
}

