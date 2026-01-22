/**
 * Integration Registry
 * Factory pattern for managing task integrations
 * Phase 1: Foundation only - registering integrations for future use
 */

import { TaskIntegration } from '@/lib/types/unifiedTasks'
import { TodoistIntegration } from './TodoistIntegration'
import { LocalTaskIntegration } from './LocalTaskIntegration'

class IntegrationRegistry {
  private integrations = new Map<string, TaskIntegration>()
  
  constructor() {
    // Register built-in integrations
    this.register(new LocalTaskIntegration())
    this.register(new TodoistIntegration())
    // Future: this.register(new AsanaIntegration())
  }
  
  /**
   * Register a new integration
   */
  register(integration: TaskIntegration) {
    this.integrations.set(integration.name, integration)
  }
  
  /**
   * Get integration by name
   */
  get(name: string): TaskIntegration | undefined {
    return this.integrations.get(name)
  }
  
  /**
   * Get all registered integrations
   */
  getAll(): TaskIntegration[] {
    return Array.from(this.integrations.values())
  }
  
  /**
   * Get integrations enabled for a specific user
   * Checks each integration's isEnabled() method
   */
  async getEnabledForUser(userId: string): Promise<TaskIntegration[]> {
    const all = this.getAll()
    const enabled = []
    
    for (const integration of all) {
      if (await integration.isEnabled(userId)) {
        enabled.push(integration)
      }
    }
    
    return enabled
  }
}

// Singleton instance
export const integrationRegistry = new IntegrationRegistry()
