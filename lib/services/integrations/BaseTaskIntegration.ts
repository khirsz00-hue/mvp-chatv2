/**
 * Base Task Integration
 * Abstract class providing common sync logic for all integrations
 * Phase 1: Foundation only - sync logic will be implemented in Phase 2
 */

import { TaskIntegration, UnifiedTask, SyncResult } from '@/lib/types/unifiedTasks'

export abstract class BaseTaskIntegration implements TaskIntegration {
  abstract name: string
  
  abstract isEnabled(userId: string): Promise<boolean>
  abstract mapToInternal(externalTask: any, userId: string, assistantId: string): UnifiedTask
  abstract mapToExternal(internalTask: UnifiedTask): any
  abstract fetchTasks(userId: string): Promise<any[]>
  abstract createTask(task: UnifiedTask): Promise<any>
  abstract updateTask(task: UnifiedTask): Promise<any>
  abstract deleteTask(externalId: string): Promise<void>
  
  /**
   * Common sync logic
   * Phase 1: Placeholder implementation
   * Phase 2: Will implement full bidirectional sync
   */
  async sync(userId: string, assistantId: string): Promise<SyncResult> {
    // To be implemented in Phase 2
    return {
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [{error: 'Not implemented in Phase 1'}]
    }
  }
}
