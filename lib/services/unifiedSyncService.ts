/**
 * Unified Sync Service
 * Phase 2A: Core logic for synchronizing tasks from all sources (local, Todoist, future: Asana)
 * to a single unified database (day_assistant_v2_tasks)
 */

import { integrationRegistry } from './integrations/IntegrationRegistry'
import { UnifiedTask, SyncResult, TaskSource } from '@/lib/types/unifiedTasks'
import { createClient } from '@supabase/supabase-js'

interface UnifiedSyncOptions {
  userId: string
  assistantId: string
  sources?: TaskSource[] // jeśli nie podano, sync wszystkich enabled
  force?: boolean // ignoruj cache
}

interface UnifiedSyncResult {
  success: boolean
  totalCreated: number
  totalUpdated: number
  totalDeleted: number
  errors: Array<{source: string, error: string}>
  syncedSources: TaskSource[]
  duration: number // ms
}

export class UnifiedSyncService {
  private getSupabaseClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  /**
   * Główna metoda sync - synchronizuje wszystkie enabled integrations
   */
  async syncAll(options: UnifiedSyncOptions): Promise<UnifiedSyncResult> {
    const startTime = Date.now()
    const result: UnifiedSyncResult = {
      success: true,
      totalCreated: 0,
      totalUpdated: 0,
      totalDeleted: 0,
      errors: [],
      syncedSources: [],
      duration: 0
    }
    
    try {
      // 1. Pobierz enabled integrations dla usera
      const enabledIntegrations = await integrationRegistry.getEnabledForUser(options.userId)
      
      // 2. Filtruj jeśli user podał konkretne sources
      const integrationsToSync = options.sources 
        ? enabledIntegrations.filter(i => options.sources!.includes(i.name as TaskSource))
        : enabledIntegrations
      
      console.log(`[UnifiedSync] Syncing ${integrationsToSync.length} sources:`, 
        integrationsToSync.map(i => i.name))
      
      // 3. Sync każdej integracji równolegle (dla performance)
      const syncPromises = integrationsToSync.map(integration => 
        this.syncIntegration(integration, options.userId, options.assistantId)
          .catch(error => ({
            success: false,
            created: 0,
            updated: 0,
            deleted: 0,
            errors: [{error: error.message}],
            source: integration.name
          }))
      )
      
      const results = await Promise.all(syncPromises)
      
      // 4. Agreguj wyniki
      for (const syncResult of results) {
        if ('source' in syncResult) {
          // To jest error result
          result.errors.push({
            source: syncResult.source,
            error: syncResult.errors[0]?.error || 'Unknown error'
          })
        } else {
          result.totalCreated += syncResult.created
          result.totalUpdated += syncResult.updated
          result.totalDeleted += syncResult.deleted
          
          if (syncResult.success) {
            const integration = integrationsToSync.find(i => 
              results.indexOf(syncResult) === integrationsToSync.indexOf(i)
            )
            if (integration) {
              result.syncedSources.push(integration.name as TaskSource)
            }
          }
        }
      }
      
      // 5. Update sync metadata
      await this.updateSyncMetadata(options.userId, result)
      
      result.duration = Date.now() - startTime
      console.log(`[UnifiedSync] ✅ Completed in ${result.duration}ms:`, {
        created: result.totalCreated,
        updated: result.totalUpdated,
        deleted: result.totalDeleted,
        errors: result.errors.length
      })
      
      return result
      
    } catch (error) {
      console.error('[UnifiedSync] ❌ Fatal error:', error)
      result.success = false
      result.errors.push({
        source: 'system',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      result.duration = Date.now() - startTime
      return result
    }
  }
  
  /**
   * Sync pojedynczej integracji (Todoist, Asana, etc)
   */
  private async syncIntegration(
    integration: any,
    userId: string,
    assistantId: string
  ): Promise<SyncResult> {
    console.log(`[UnifiedSync] Syncing ${integration.name}...`)
    
    const supabase = this.getSupabaseClient()
    
    try {
      // 1. Pobierz taski z zewnętrznego źródła
      const externalTasks = await integration.fetchTasks(userId)
      console.log(`[UnifiedSync] Fetched ${externalTasks.length} tasks from ${integration.name}`)
      
      // 2. Pobierz istniejące taski z tego źródła z bazy
      const { data: existingTasks } = await supabase
        .from('day_assistant_v2_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('assistant_id', assistantId)
        .eq('source', integration.name)
      
      const existingTasksMap = new Map(
        (existingTasks || []).map(t => [t.external_id, t])
      )
      
      console.log(`[UnifiedSync] Found ${existingTasksMap.size} existing tasks for ${integration.name}`)
      
      let created = 0
      let updated = 0
      let deleted = 0
      const errors: Array<{task_id?: string, error: string}> = []
      
      // 3. Upsert tasków z zewnętrznego źródła
      for (const externalTask of externalTasks) {
        try {
          const mappedTask = integration.mapToInternal(externalTask, userId, assistantId)
          const existingTask = existingTasksMap.get(mappedTask.external_id!)
          
          if (existingTask) {
            // UPDATE: sprawdź czy są zmiany
            const hasChanges = this.detectChanges(existingTask, mappedTask)
            
            if (hasChanges) {
              // Conflict resolution: zewnętrzne źródło wygrywa UNLESS local changes są nowsze
              const shouldUpdate = await this.resolveConflict(existingTask, mappedTask)
              
              if (shouldUpdate) {
                await this.updateTask(existingTask.id, mappedTask)
                updated++
              }
            }
            
            // Usuń z mapy (zostały taski które trzeba usunąć)
            existingTasksMap.delete(mappedTask.external_id!)
            
          } else {
            // CREATE: nowy task z zewnętrznego źródła
            await this.createTask(mappedTask)
            created++
          }
          
        } catch (error) {
          console.error(`[UnifiedSync] Error syncing task:`, error)
          errors.push({
            task_id: externalTask.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      // 4. DELETE: taski które istnieją lokalnie ale nie w zewnętrznym źródle
      // (zostały usunięte w Todoist/Asana)
      for (const [externalId, task] of existingTasksMap) {
        try {
          await this.deleteTask(task.id)
          deleted++
        } catch (error) {
          console.error(`[UnifiedSync] Error deleting task ${task.id}:`, error)
          errors.push({
            task_id: task.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      return {
        success: errors.length === 0,
        created,
        updated,
        deleted,
        errors
      }
      
    } catch (error) {
      console.error(`[UnifiedSync] Error syncing ${integration.name}:`, error)
      return {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [{error: error instanceof Error ? error.message : 'Unknown error'}]
      }
    }
  }
  
  /**
   * Wykrywa czy są zmiany między taskami
   */
  private detectChanges(existing: any, updated: UnifiedTask): boolean {
    // Porównaj kluczowe pola
    return (
      existing.title !== updated.title ||
      existing.description !== updated.description ||
      existing.priority !== updated.priority ||
      existing.due_date !== updated.due_date ||
      existing.completed !== updated.completed ||
      JSON.stringify(existing.tags) !== JSON.stringify(updated.tags)
    )
  }
  
  /**
   * Conflict Resolution Strategy:
   * - Jeśli local task ma sync_status='pending', to local changes wygrywają
   * - Jeśli local task był modyfikowany później niż last_synced_at, local wygrywa
   * - W przeciwnym wypadku external wygrywa
   */
  private async resolveConflict(
    existingTask: any,
    externalTask: UnifiedTask
  ): Promise<boolean> {
    const supabase = this.getSupabaseClient()
    
    // Local pending changes mają priorytet
    if (existingTask.sync_status === 'pending') {
      console.log(`[UnifiedSync] Skipping update - local changes pending for task ${existingTask.id}`)
      return false
    }
    
    // Sprawdź timestamps
    const localUpdatedAt = new Date(existingTask.updated_at).getTime()
    const lastSyncedAt = existingTask.last_synced_at 
      ? new Date(existingTask.last_synced_at).getTime()
      : 0
    
    // Local changes nowsze niż ostatni sync = conflict
    if (localUpdatedAt > lastSyncedAt) {
      console.log(`[UnifiedSync] Conflict detected for task ${existingTask.id} - marking as conflict`)
      
      // Oznacz jako conflict (user będzie musiał wybrać)
      await supabase
        .from('day_assistant_v2_tasks')
        .update({ sync_status: 'conflict' })
        .eq('id', existingTask.id)
      
      return false
    }
    
    // External wygrywa
    return true
  }
  
  /**
   * Utwórz nowy task w bazie
   */
  private async createTask(task: UnifiedTask): Promise<void> {
    const supabase = this.getSupabaseClient()
    const { error } = await supabase
      .from('day_assistant_v2_tasks')
      .insert({
        ...task,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString()
      })
    
    if (error) throw error
  }
  
  /**
   * Zaktualizuj istniejący task
   */
  private async updateTask(taskId: string, updates: Partial<UnifiedTask>): Promise<void> {
    const supabase = this.getSupabaseClient()
    const { error } = await supabase
      .from('day_assistant_v2_tasks')
      .update({
        ...updates,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
    
    if (error) throw error
  }
  
  /**
   * Usuń task z bazy
   */
  private async deleteTask(taskId: string): Promise<void> {
    const supabase = this.getSupabaseClient()
    const { error } = await supabase
      .from('day_assistant_v2_tasks')
      .delete()
      .eq('id', taskId)
    
    if (error) throw error
  }
  
  /**
   * Zapisz metadata o synchronizacji
   */
  private async updateSyncMetadata(
    userId: string,
    result: UnifiedSyncResult
  ): Promise<void> {
    const supabase = this.getSupabaseClient()
    // Użyj istniejącej tabeli sync_metadata
    await supabase
      .from('sync_metadata')
      .upsert({
        user_id: userId,
        sync_type: 'unified',
        last_synced_at: new Date().toISOString(),
        sync_result: {
          created: result.totalCreated,
          updated: result.totalUpdated,
          deleted: result.totalDeleted,
          errors: result.errors.length,
          duration: result.duration,
          sources: result.syncedSources
        }
      }, {
        onConflict: 'user_id,sync_type'
      })
  }
}

// Singleton instance
export const unifiedSyncService = new UnifiedSyncService()
