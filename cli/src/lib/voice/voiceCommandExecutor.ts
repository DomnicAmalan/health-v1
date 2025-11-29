/**
 * Voice Command Executor
 * Execute voice commands by finding and triggering component actions
 */

import { VoiceIntent } from './voiceCommandParser';
import { getComponentConfig } from '@/components/ui/component-registry';
import { useVoiceCommandStore } from '@/stores/voiceCommandStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { useTabStore } from '@/stores/tabStore';
import { getTextToSpeechEngine } from './voiceCommandEngine';

export class VoiceCommandExecutor {
  private tts: ReturnType<typeof getTextToSpeechEngine>;

  constructor() {
    this.tts = getTextToSpeechEngine();
  }

  public async execute(intent: VoiceIntent): Promise<boolean> {
    try {
      useVoiceCommandStore.getState().setProcessing(true);
      useVoiceCommandStore.getState().setLastIntent(intent.type);

      let success = false;

      switch (intent.type) {
        case 'fill_form':
          success = await this.executeFillForm();
          break;
        case 'submit_form':
          success = await this.executeSubmitForm();
          break;
        case 'click_button':
          success = await this.executeClickButton(intent.target || '');
          break;
        case 'select_option':
          success = await this.executeSelectOption(intent.target || '', intent.value || '');
          break;
        case 'navigate':
          success = await this.executeNavigate(intent.target || '');
          break;
        case 'open_modal':
          success = await this.executeOpenModal(intent.target || '');
          break;
        case 'close_modal':
          success = await this.executeCloseModal();
          break;
        case 'search':
          success = await this.executeSearch(intent.value || '');
          break;
        case 'help':
          success = await this.executeHelp();
          break;
        case 'stop':
          success = await this.executeStop();
          break;
        default:
          this.speak('I did not understand that command. Please try again.');
          success = false;
      }

      useVoiceCommandStore.getState().addToHistory(
        intent.action,
        intent.type,
        success
      );

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      useVoiceCommandStore.getState().setError(errorMessage);
      this.speak(`Error: ${errorMessage}`);
      return false;
    } finally {
      useVoiceCommandStore.getState().setProcessing(false);
    }
  }

  private async executeFillForm(): Promise<boolean> {
    // This will be handled by LLM workflow engine
    // For now, just acknowledge
    this.speak('I will help you fill the form. Starting form filling workflow.');
    return true;
  }

  private async executeSubmitForm(): Promise<boolean> {
    // Find submit button in component registry
    // This is a simplified version - full implementation would search all registered components
    this.speak('Submitting the form.');
    // Actual submission would be handled by finding the form component
    return true;
  }

  private async executeClickButton(buttonName: string): Promise<boolean> {
    // Search component registry for button with matching label/action
    // This is a simplified version
    this.speak(`Clicking ${buttonName} button.`);
    return true;
  }

  private async executeSelectOption(option: string, target: string): Promise<boolean> {
    this.speak(`Selecting ${option} from ${target}.`);
    return true;
  }

  private async executeNavigate(target: string): Promise<boolean> {
    if (!target) {
      this.speak('I need to know where to navigate. Please specify a destination.');
      return false;
    }

    const normalizedTarget = target.toLowerCase().trim();
    
    // Map common phrases to routes
    const routeMap: Record<string, { path: string; label: string }> = {
      'dashboard': { path: '/', label: 'Dashboard' },
      'home': { path: '/', label: 'Dashboard' },
      'patients': { path: '/patients', label: 'Patients' },
      'patient': { path: '/patients', label: 'Patients' },
      'patient list': { path: '/patients', label: 'Patients' },
      'patient record': { path: '/patients', label: 'Patients' },
      'patient records': { path: '/patients', label: 'Patients' },
      'clinical': { path: '/clinical', label: 'Clinical' },
      'clinical documentation': { path: '/clinical', label: 'Clinical' },
      'orders': { path: '/orders', label: 'Orders' },
      'results': { path: '/results', label: 'Results' },
      'test results': { path: '/results', label: 'Results' },
      'scheduling': { path: '/scheduling', label: 'Scheduling' },
      'schedule': { path: '/scheduling', label: 'Scheduling' },
      'pharmacy': { path: '/pharmacy', label: 'Pharmacy' },
      'revenue': { path: '/revenue', label: 'Revenue' },
      'analytics': { path: '/analytics', label: 'Analytics' },
      'settings': { path: '/settings', label: 'Settings' },
      'form builder': { path: '/form-builder', label: 'Form Builder' },
    };

    // Find matching route
    let route = routeMap[normalizedTarget];
    
    // If no exact match, try partial matching
    if (!route) {
      for (const [key, value] of Object.entries(routeMap)) {
        if (normalizedTarget.includes(key) || key.includes(normalizedTarget)) {
          route = value;
          break;
        }
      }
    }

    // Check component registry for registered routes
    if (!route) {
      const allComponents = (window as any).__componentRegistry || new Map();
      for (const [id, config] of allComponents.entries()) {
        if (config.voiceDescription && 
            (config.voiceDescription.toLowerCase().includes(normalizedTarget) ||
             normalizedTarget.includes(config.voiceDescription.toLowerCase()))) {
          // Try to extract path from component config
          if (config.path) {
            route = { path: config.path, label: config.ariaLabel || id };
            break;
          }
        }
      }
    }

    if (route) {
      // Use tab store to open tab and navigate
      const tabStore = useTabStore.getState();
      const { openTab, setActiveTab, tabs } = tabStore;
      
      // Navigate using router
      if (typeof window !== 'undefined') {
        // Use TanStack Router if available
        const router = (window as any).__tanstackRouter;
        
        // Check if tab already exists
        const existingTab = tabs.find(t => t.path === route.path);
        
        if (existingTab) {
          // Switch to existing tab
          setActiveTab(existingTab.id, (path) => {
            if (router) {
              router.navigate({ to: path as any }).catch(() => {
                // Fallback to window.location if router fails
                window.location.href = path;
              });
            } else {
              window.location.href = path;
            }
          });
        } else {
          // Open new tab
          openTab({
            label: route.label,
            path: route.path,
            closable: route.path !== '/',
          }, (path) => {
            if (router) {
              router.navigate({ to: path as any }).catch(() => {
                // Fallback to window.location if router fails
                window.location.href = path;
              });
            } else {
              window.location.href = path;
            }
          });
        }
      }
      
      this.speak(`Navigating to ${route.label}.`);
      return true;
    } else {
      this.speak(`I couldn't find a route for "${target}". Please try saying "go to patients" or "open dashboard".`);
      return false;
    }
  }

  private async executeOpenModal(modalName: string): Promise<boolean> {
    this.speak(`Opening ${modalName}.`);
    return true;
  }

  private async executeCloseModal(): Promise<boolean> {
    this.speak('Closing modal.');
    return true;
  }

  private async executeSearch(query: string): Promise<boolean> {
    this.speak(`Searching for ${query}.`);
    return true;
  }

  private async executeHelp(): Promise<boolean> {
    const helpText = 'Available commands: fill form, submit, click button, navigate, search, and more. Say "help" anytime for assistance.';
    this.speak(helpText);
    return true;
  }

  private async executeStop(): Promise<boolean> {
    this.speak('Stopping voice commands.');
    useVoiceCommandStore.getState().stopListening();
    return true;
  }

  private speak(text: string): void {
    const preferences = useAccessibilityStore.getState().preferences;
    if (preferences.voiceCommandsFeedback) {
      this.tts.speak(text, {
        lang: preferences.voiceCommandsLanguage || 'en-US',
      });
    }
  }
}

// Global instance
let executorInstance: VoiceCommandExecutor | null = null;

export function getVoiceCommandExecutor(): VoiceCommandExecutor {
  if (!executorInstance) {
    executorInstance = new VoiceCommandExecutor();
  }
  return executorInstance;
}

