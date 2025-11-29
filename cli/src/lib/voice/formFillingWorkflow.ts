/**
 * Form Filling Workflow
 * Conversational form-filling workflow using LLM
 */

import { getLLMWorkflowEngine } from './llmWorkflowEngine';
import { getVoiceCommandEngine } from './voiceCommandEngine';
import { getComponentConfig } from '@/components/ui/component-registry';
import { useVoiceCommandStore } from '@/stores/voiceCommandStore';

export async function executeFormFillingWorkflow(componentId: string): Promise<void> {
  const engine = getLLMWorkflowEngine();
  await engine.executeFormFillingWorkflow(componentId);
}

export function startFormFillingWorkflow(componentId: string): void {
  // This would be called when user says "fill the form"
  executeFormFillingWorkflow(componentId).catch((error) => {
    console.error('Form filling workflow error:', error);
    useVoiceCommandStore.getState().setError(error.message);
  });
}

