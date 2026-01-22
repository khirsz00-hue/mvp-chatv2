/**
 * Unified Task Management System - Type Definitions
 * Phase 1: Foundation types for multi-source task management
 */

import { TestDayTask } from './dayAssistantV2'

// Task source types
export type TaskSource = 'local' | 'todoist' | 'asana'

// Sync status types
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error'

/**
 * Unified Task Type
 * Extends TestDayTask with source tracking and sync metadata
 */
export interface UnifiedTask extends TestDayTask {
  source: TaskSource
  external_id: string | null
  external_metadata: Record<string, any>
  last_synced_at: string | null
  sync_status: SyncStatus
}

/**
 * Task Integration Interface
 * Standard interface that all task integrations must implement
 */
export interface TaskIntegration {
  name: string
  isEnabled(userId: string): Promise<boolean>
  mapToInternal(externalTask: any, userId: string, assistantId: string): UnifiedTask
  mapToExternal(internalTask: UnifiedTask): any
  fetchTasks(userId: string): Promise<any[]>
  createTask(task: UnifiedTask): Promise<any>
  updateTask(task: UnifiedTask): Promise<any>
  deleteTask(externalId: string): Promise<void>
}

/**
 * Sync Result
 * Result object returned by sync operations
 */
export interface SyncResult {
  success: boolean
  created: number
  updated: number
  deleted: number
  errors: Array<{task_id?: string, error: string}>
}
