/**
 * Form Filling Workflow
 * Conversational form-filling workflow using LLM
 */

import { useVoiceCommandStore } from "@/stores/voiceCommandStore";
import { getLLMWorkflowEngine } from "./llmWorkflowEngine";

export async function executeFormFillingWorkflow(componentId: string): Promise<void> {
  const engine = getLLMWorkflowEngine();
  await engine.executeFormFillingWorkflow(componentId);
}

export function startFormFillingWorkflow(componentId: string): void {
  // This would be called when user says "fill the form"
  executeFormFillingWorkflow(componentId).catch((error) => {
    useVoiceCommandStore.getState().setError(error.message);
  });
}
