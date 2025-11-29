/**
 * LLM Workflow Engine
 * LLM-powered workflow execution for complex tasks
 * Integrates with OpenAI/Anthropic/OpenRouter API
 */

import { getVoiceCommandEngine, getTextToSpeechEngine } from './voiceCommandEngine';
import { getComponentConfig } from '@/components/ui/component-registry';
import { useVoiceCommandStore } from '@/stores/voiceCommandStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

export interface LLMWorkflowContext {
  componentId: string;
  componentStructure: unknown;
  userCommand: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface LLMResponse {
  action: 'speak' | 'fill_field' | 'submit' | 'validate' | 'ask_question' | 'complete';
  content: string;
  fieldId?: string;
  value?: string;
  errors?: Array<{ fieldId: string; message: string }>;
}

export class LLMWorkflowEngine {
  private tts: ReturnType<typeof getTextToSpeechEngine>;
  private apiKey: string | null = null;
  private apiEndpoint: string = 'https://api.openai.com/v1/chat/completions';
  private model: string = 'gpt-4';

  constructor() {
    this.tts = getTextToSpeechEngine();
    // API key should come from environment or user settings
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  }

  public async executeFormFillingWorkflow(componentId: string): Promise<void> {
    const component = getComponentConfig(componentId);
    if (!component || !component.componentStructure) {
      throw new Error('Component not found or does not have structure');
    }

    const structure = component.componentStructure as {
      type: string;
      fields?: Array<{
        id: string;
        label: string;
        placeholder?: string;
        type: string;
        required?: boolean;
        validation?: unknown;
        ref?: { current: HTMLInputElement | null };
      }>;
    };

    if (structure.type !== 'form' || !structure.fields) {
      throw new Error('Component is not a form or has no fields');
    }

    // Initialize conversation
    const conversation: Array<{ role: 'user' | 'assistant'; content: string }> = [
      {
        role: 'assistant',
        content: `I'll help you fill the ${component.ariaLabel || 'form'}. Let's start with the first field.`,
      },
    ];

    this.speak(conversation[0].content);
    useVoiceCommandStore.getState().setCurrentWorkflow({
      type: 'form-filling',
      step: 0,
      data: { componentId, fields: structure.fields },
    });

    // Process each field
    for (let i = 0; i < structure.fields.length; i++) {
      const field = structure.fields[i];
      const prompt = this.buildFieldPrompt(field, structure.fields);
      
      // Ask for field value
      const question = field.placeholder || `What is your ${field.label}?`;
      this.speak(question);
      
      // Wait for user response (this would be handled by voice recognition)
      // For now, this is a placeholder - actual implementation would wait for voice input
      await this.waitForFieldValue(field, conversation);
    }

    // Validate form
    const validationResult = await this.validateForm(structure.fields);
    
    if (validationResult.errors && validationResult.errors.length > 0) {
      const errorMessage = `I found some errors: ${validationResult.errors.map(e => e.message).join(', ')}. Would you like to fix them?`;
      this.speak(errorMessage);
      // Handle error correction
    } else {
      this.speak('Form is complete. Would you like to submit it?');
      // Wait for confirmation
    }
  }

  private buildFieldPrompt(
    field: { id: string; label: string; placeholder?: string; validation?: unknown },
    allFields: Array<{ id: string; label: string }>
  ): string {
    return `You are helping a user fill a form field.
Field: ${field.label}
Placeholder: ${field.placeholder || 'N/A'}
Validation rules: ${JSON.stringify(field.validation || {})}

Ask the user for this field's value in a conversational way.`;
  }

  private async waitForFieldValue(
    field: { id: string; ref?: { current: HTMLInputElement | null } },
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    // This would wait for voice recognition result
    // For now, return empty string
    return '';
  }

  private async validateForm(
    fields: Array<{ id: string; validation?: unknown; ref?: { current: HTMLInputElement | null } }>
  ): Promise<{ errors: Array<{ fieldId: string; message: string }> }> {
    const errors: Array<{ fieldId: string; message: string }> = [];
    
    // Validate each field
    for (const field of fields) {
      if (field.ref?.current) {
        const value = field.ref.current.value;
        // Perform validation based on field.validation rules
        // This is simplified - actual implementation would use validation rules
        if (field.ref.current.required && !value) {
          errors.push({
            fieldId: field.id,
            message: `${field.id} is required`,
          });
        }
      }
    }

    return { errors };
  }

  private async callLLM(
    prompt: string,
    context: LLMWorkflowContext
  ): Promise<LLMResponse> {
    if (!this.apiKey) {
      // Fallback to rule-based execution if no API key
      return this.fallbackExecution(prompt, context);
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant helping users interact with a healthcare application via voice commands. 
Analyze the component structure and user command, then provide appropriate actions.
Component structure: ${JSON.stringify(context.componentStructure)}
Available actions: fill_field, submit, validate, ask_question, speak`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      // Parse LLM response (simplified - actual implementation would be more robust)
      return this.parseLLMResponse(content);
    } catch (error) {
      console.error('LLM API error:', error);
      return this.fallbackExecution(prompt, context);
    }
  }

  private parseLLMResponse(content: string): LLMResponse {
    // Simplified parsing - actual implementation would be more sophisticated
    try {
      const parsed = JSON.parse(content);
      return parsed as LLMResponse;
    } catch {
      // Fallback to speak action
      return {
        action: 'speak',
        content: content,
      };
    }
  }

  private fallbackExecution(
    prompt: string,
    context: LLMWorkflowContext
  ): LLMResponse {
    // Rule-based fallback when LLM is not available
    if (prompt.includes('fill form') || prompt.includes('fill the form')) {
      return {
        action: 'ask_question',
        content: 'I will help you fill the form. Let\'s start with the first field.',
      };
    }
    
    return {
      action: 'speak',
      content: 'I understand. Let me help you with that.',
    };
  }

  private speak(text: string): void {
    const preferences = useAccessibilityStore.getState().preferences;
    if (preferences.voiceCommandsFeedback) {
      this.tts.speak(text, {
        lang: preferences.voiceCommandsLanguage || 'en-US',
      });
    }
  }

  public setAPIKey(key: string): void {
    this.apiKey = key;
  }

  public setModel(model: string): void {
    this.model = model;
  }

  public setAPIEndpoint(endpoint: string): void {
    this.apiEndpoint = endpoint;
  }
}

// Global instance
let engineInstance: LLMWorkflowEngine | null = null;

export function getLLMWorkflowEngine(): LLMWorkflowEngine {
  if (!engineInstance) {
    engineInstance = new LLMWorkflowEngine();
  }
  return engineInstance;
}

