/**
 * Local Task Integration
 * Handles tasks created directly in the application (not from external sources)
 * Phase 1: Foundation only
 */

import { BaseTaskIntegration } from './BaseTaskIntegration'
import { UnifiedTask } from '@/lib/types/unifiedTasks'

export class LocalTaskIntegration extends BaseTaskIntegration {
  name = 'local'
  
  /**
   * Local tasks are always enabled
   */
  async isEnabled(userId: string): Promise<boolean> {
    return true
  }
  
  /**
   * Map local task to UnifiedTask format
   * Local tasks are already in internal format, just add source metadata
   */
  mapToInternal(localTask: any, userId: string, assistantId: string): UnifiedTask {
    return {
      ...localTask,
      source: 'local',
      external_id: null,
      external_metadata: {},
      last_synced_at: null,
      sync_status: 'synced',
    } as UnifiedTask
  }
  
  /**
   * Map internal task to external format
   * For local tasks, they're already in the correct format
   */
  mapToExternal(internalTask: UnifiedTask): any {
    return internalTask
  }
  
  /**
   * Fetch tasks from external source
   * Local tasks have no external source
   */
  async fetchTasks(userId: string): Promise<any[]> {
    return []
  }
  
  /**
   * Create task
   * For local tasks, creation happens directly in database
   */
  async createTask(task: UnifiedTask): Promise<any> {
    return task
  }
  
  /**
   * Update task
   * For local tasks, update happens directly in database
   */
  async updateTask(task: UnifiedTask): Promise<any> {
    return task
  }
  
  /**
   * Delete task
   * For local tasks, deletion happens directly in database
   */
  async deleteTask(externalId: string): Promise<void> {
    // No-op for local tasks
  }
}
