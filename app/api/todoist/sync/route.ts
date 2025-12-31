/**
 * API Route: /api/todoist/sync
 * POST: Sync Todoist tasks to Supabase (cache-aware)
 * 
 * This endpoint implements centralized synchronization of Todoist tasks to Supabase.
 * It ensures both TasksAssistant and DayAssistantV2 use the same data source.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseAuth'
import { inferTaskContext, TaskContext } from '@/lib/services/contextInferenceService'
import { clampCognitiveLoad } from '@/lib/utils/cognitiveLoad'

// Matches Todoist cognitive labels like C1, c2, c3
const COGNITIVE_LABEL_PATTERN = /^c([1-3])$/

export const dynamic = 'force-dynamic'

const SYNC_INTERVAL_MS = 10000 // 10 seconds cache

interface TodoistTask {
  id: string
  content: string
  description?: string
  priority: number
  labels?: string[]
  due?: {
    date: string
  } | null
  duration?: {
    amount: number
    unit: string
  } | null
  project_id?: string
  created_at?: string
  is_completed?: boolean
}

interface DayAssistantV2Task {
  user_id: string
  assistant_id: string
  todoist_id: string
  title: string
  description: string | null
  priority: number
  is_must: boolean
  is_important: boolean
  estimate_min: number
  cognitive_load: number
  context_type: string
  due_date: string | null
  todoist_task_id: string
  synced_at: string
  tags: string[]
  position: number
  postpone_count: number
  auto_moved: boolean
  metadata: Record<string, unknown>
  completed: boolean
}

/**
 * Parse estimate from Todoist task
 * Attempts multiple methods:
 * 1. Check task.duration (Todoist Premium feature)
 * 2. Parse from description patterns like [25min], (30 min), "Estymat: 45"
 * 3. Fallback based on content length
 */
function parseEstimateFromTodoist(task: TodoistTask): number {
  // Method 1: Check if task.duration exists (Todoist Premium feature)
  if (task.duration?.amount) {
    const amount = task.duration.amount
    const unit = task.duration.unit
    
    if (unit === 'minute') {
      if (amount > 0 && amount <= 480) { // Max 8 hours
        return amount
      }
    } else if (unit === 'hour') {
      const minutes = amount * 60
      if (minutes > 0 && minutes <= 480) { // Max 8 hours
        return minutes
      }
    } else if (unit === 'day') {
      // Assume 8 hour work day, but cap at 480 minutes (8 hours)
      const minutes = Math.min(amount * 8 * 60, 480)
      return minutes
    }
  }
  
  // Method 2: Parse from description patterns
  // Examples: "[25min]", "25m", "(30 min)", "Estymat: 45"
  const description = task.description || ''
  const content = task.content || ''
  const searchText = `${description} ${content}`
  
  const patterns = [
    /\[(\d+)\s*min\]/i,           // [25min]
    /\((\d+)\s*min\)/i,           // (25min)
    /(\d+)\s*m(?:in)?(?:\s|$)/i,  // 25m or 25min
    /estymat:\s*(\d+)/i           // Estymat: 45
  ]
  
  for (const pattern of patterns) {
    const match = searchText.match(pattern)
    if (match && match[1]) {
      const minutes = parseInt(match[1], 10)
      if (minutes > 0 && minutes <= 480) { // Max 8 hours
        return minutes
      }
    }
  }
  
  // Method 3: Estimate based on content length (fallback)
  const contentLength = content.length
  if (contentLength > 100) return 60
  if (contentLength > 50) return 45
  
  return 30 // Default
}

/**
 * Derive cognitive load from Todoist labels (C1, C2, C3)
 * Returns null if no cognitive label is present
 */
function parseCognitiveLoadFromLabels(labels?: string[]): number | null {
  if (!labels || labels.length === 0) return null
  for (const label of labels) {
    const normalized = label.trim().toLowerCase()
    // Todoist labels intentionally use a three-level scale (C1-C3).
    // The UI covers higher loads (4-5), so we only map these three here and ignore any C4/C5 labels
    // to keep Todoist inputs aligned with the more compact Todoist labeling scheme.
    const match = normalized.match(COGNITIVE_LABEL_PATTERN)
    if (match) {
      return Number(match[1])
    }
  }
  return null
}

/**
 * Map Todoist task to DayAssistantV2Task format with AI-powered context inference
 * @param task Todoist task payload
 * @param userId Supabase user id
 * @param assistantId Assistant configuration id
 * @param projects Map of project_id to project name
 * @param existingContext Previously stored context_type (preserved when provided)
 * @param existingCognitiveLoad Previously stored cognitive_load (1-5) to keep user edits when no label is present
 */
async function mapTodoistToDayAssistantTask(
  task: TodoistTask,
  userId: string,
  assistantId: string,
  projects: Map<string, string>,
  existingContext?: string | null,
  existingCognitiveLoad?: number
): Promise<Partial<DayAssistantV2Task> | null> {
  // Validate required fields
  if (!task.id) {
    console.warn('[Sync] Skipping task without ID:', task)
    return null
  }
  
  if (!task.content) {
    console.warn('[Sync] Skipping task without content:', task.id)
    return null
  }

  // Determine context_type with AI inference (if not preserving existing)
  let contextType: string
  let aiInferredContext = false
  
  if (existingContext) {
    // Preserve existing context to avoid changing user's manual categorization
    contextType = existingContext
  } else {
    // Priority 1: Use project name if available
    if (task.project_id && projects.has(task.project_id)) {
      contextType = projects.get(task.project_id)!
      console.log(`[Sync] Using project name "${contextType}" for "${task.content}"`)
    }
    // Priority 2: Check labels for backward compatibility
    else if (task.labels) {
      if (task.labels.includes('admin')) contextType = 'admin'
      else if (task.labels.includes('komunikacja')) contextType = 'communication'
      else if (task.labels.includes('prywatne')) contextType = 'personal'
      else if (task.labels.includes('code')) contextType = 'deep_work'
      else {
        // No matching label, use AI inference
        try {
          const inference = await inferTaskContext(task.content, task.description)
          contextType = inference.context
          aiInferredContext = true
          console.log(`[Sync] AI inferred context "${contextType}" for "${task.content}"`)
        } catch (error) {
          console.error('[Sync] Error inferring context:', error)
          contextType = 'deep_work' // Default fallback
        }
      }
    } else {
      // No labels at all, use AI inference
      try {
        const inference = await inferTaskContext(task.content, task.description)
        contextType = inference.context
        aiInferredContext = true
        console.log(`[Sync] AI inferred context "${contextType}" for "${task.content}"`)
      } catch (error) {
        console.error('[Sync] Error inferring context:', error)
        contextType = 'deep_work' // Default fallback
      }
    }
  }

  // Convert priority to number for consistent type handling
  // Default to 1 (lowest priority) if priority is undefined, null, or invalid
  // Todoist priorities: 1 (lowest) to 4 (highest/P1)
  const priority = Number(task.priority) || 1

  // Determine is_must: Only user can pin via UI (manual action)
  // Priority P1 should NOT auto-pin as MUST
  const isMust = false

  // Determine is_important: priority >= 3
  const isImportant = priority >= 3

  // Derive cognitive load from labels (C1, C2, C3).
  // Default to cognitive load 2 if missing, then clamp to the 1-5 scale used internally.
  const cognitiveFromLabel = parseCognitiveLoadFromLabels(task.labels)
  // Prefer explicit Todoist label, fall back to stored value, then default medium load (2)
  const resolvedCognitive = cognitiveFromLabel ?? existingCognitiveLoad ?? 2
  const cognitiveLoad = clampCognitiveLoad(resolvedCognitive)

  // Parse estimate_min from task
  const estimateMin = parseEstimateFromTodoist(task)

  return {
    user_id: userId,
    assistant_id: assistantId,
    todoist_id: task.id, // Primary reference to Todoist task
    todoist_task_id: task.id, // Legacy field for compatibility with existing code
    title: task.content,
    description: task.description || null,
    priority: priority,
    is_must: isMust,
    is_important: isImportant,
    estimate_min: estimateMin,
    cognitive_load: cognitiveLoad,
    context_type: contextType,
    due_date: task.due?.date || null,
    synced_at: new Date().toISOString(),
    // Add required fields with default values for validation
    tags: [],
    position: 0,
    postpone_count: 0,
    auto_moved: false,
    metadata: {
      ai_inferred_context: aiInferredContext
    },
    completed: false
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Todoist Sync API] Starting sync request')
    
    // Create authenticated Supabase client (uses cookies for session)
    const supabase = await createAuthenticatedSupabaseClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [Todoist Sync API] Authentication failed:', authError?.message || 'No user')
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          details: authError?.message || 'No valid session found'
        },
        { status: 401 }
      )
    }
    
    console.log('✅ [Todoist Sync API] User authenticated:', user.id)

    // Check cache - has sync happened recently?
    const { data: syncMeta } = await supabase
      .from('sync_metadata')
      .select('last_synced_at')
      .eq('user_id', user.id)
      .eq('sync_type', 'todoist')
      .single()

    if (syncMeta?.last_synced_at) {
      const lastSyncTime = new Date(syncMeta.last_synced_at).getTime()
      const now = Date.now()
      const timeSinceSync = now - lastSyncTime

      if (timeSinceSync < SYNC_INTERVAL_MS) {
        const secondsSince = Math.floor(timeSinceSync / 1000)
        console.log(`[Sync] Skipping - last sync was ${secondsSince}s ago`)
        return NextResponse.json({
          message: 'Sync skipped - too soon',
          last_synced: syncMeta.last_synced_at,
          seconds_since: secondsSince
        })
      }
    }

    // Get Todoist token
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('todoist_token')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ [Todoist Sync API] Error fetching Todoist token:', profileError)
    }

    const todoistToken = profile?.todoist_token
    if (!todoistToken) {
      console.error('❌ [Todoist Sync API] No Todoist token found for user')
      return NextResponse.json(
        { 
          error: 'Todoist not connected',
          details: 'Please connect your Todoist account in settings'
        },
        { status: 400 }
      )
    }
    
    console.log('✅ [Todoist Sync API] Todoist token found')

    // Fetch all tasks from Todoist API
    console.log('🔍 [Todoist Sync API] Fetching tasks from Todoist API')
    let todoistResponse = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: {
        Authorization: `Bearer ${todoistToken}`
      },
      cache: 'no-store'
    })

    // Handle 401 Unauthorized - token might be expired or invalid
    if (todoistResponse.status === 401) {
      console.error('❌ [Todoist Sync API] Todoist API 401 Unauthorized - token expired')
      
      // Clear the invalid token
      const { error: clearError } = await supabase
        .from('user_profiles')
        .update({ todoist_token: null })
        .eq('id', user.id)
      
      if (clearError) {
        console.error('❌ [Todoist Sync API] Error clearing invalid token:', clearError)
      } else {
        console.log('✅ [Todoist Sync API] Cleared invalid Todoist token')
      }
      
      return NextResponse.json(
        { 
          error: 'Todoist token expired',
          details: 'Please reconnect your Todoist account in settings',
          error_code: 'TODOIST_AUTH_EXPIRED',
          needs_reconnect: true
        },
        { status: 401 }
      )
    }

    if (!todoistResponse.ok) {
      console.error(`❌ [Todoist Sync API] Todoist API error: ${todoistResponse.status}`)
      return NextResponse.json(
        { 
          error: `Failed to fetch tasks from Todoist (${todoistResponse.status})`,
          error_code: 'TODOIST_API_ERROR',
          status_code: todoistResponse.status
        },
        { status: todoistResponse.status }
      )
    }
    
    console.log('✅ [Todoist Sync API] Successfully fetched tasks from Todoist')

    const todoistTasks: TodoistTask[] = await todoistResponse.json()
    
    // Fetch projects from Todoist for context mapping
    console.log('🔍 [Todoist Sync API] Fetching projects from Todoist API')
    let projectsMap = new Map<string, string>()
    try {
      const projectsResponse = await fetch('https://api.todoist.com/rest/v2/projects', {
        headers: {
          Authorization: `Bearer ${todoistToken}`
        },
        cache: 'no-store'
      })
      
      if (projectsResponse.ok) {
        const projects = await projectsResponse.json()
        projectsMap = new Map(projects.map((p: any) => [p.id, p.name]))
        console.log(`✅ [Todoist Sync API] Fetched ${projectsMap.size} projects`)
      } else {
        console.warn(`⚠️ [Todoist Sync API] Failed to fetch projects: ${projectsResponse.status}`)
      }
    } catch (error) {
      console.error('❌ [Todoist Sync API] Error fetching projects:', error)
      // Continue without projects - will fall back to AI inference
    }
    
    // Calculate today's date for overdue detection
    const todayISO = new Date().toISOString().split('T')[0]

    // Filter out completed tasks for upserting (we don't want to add completed tasks)
    // But keep the full list to identify which tasks were completed since last sync
    const activeTasks = todoistTasks.filter(task => !task.is_completed)
    
    // Detailed breakdown of fetched tasks (gated for performance in production)
    if (process.env.NODE_ENV !== 'production') {
      const overdueTasks = activeTasks.filter(task => task.due?.date && task.due.date < todayISO)
      const todayTasks = activeTasks.filter(task => task.due?.date === todayISO)
      const futureTasks = activeTasks.filter(task => task.due?.date && task.due.date > todayISO)
      const noDateTasks = activeTasks.filter(task => !task.due?.date)
      
      console.log('📥 [Todoist Sync] Fetching tasks...')
      console.log('📊 [Todoist Sync] Fetched from API:', {
        total: todoistTasks.length,
        active: activeTasks.length,
        completed: todoistTasks.length - activeTasks.length,
        overdue: overdueTasks.length,
        today: todayTasks.length,
        future: futureTasks.length,
        noDate: noDateTasks.length
      })
      
      if (overdueTasks.length > 0) {
        const nowTime = new Date().getTime()
        const msPerDay = 1000 * 60 * 60 * 24
        console.log('⚠️ [Todoist Sync] Overdue tasks from Todoist:', overdueTasks.slice(0, 5).map(t => ({
          content: t.content,
          due_date: t.due?.date,
          days_overdue: t.due?.date ? Math.floor((nowTime - new Date(t.due.date).getTime()) / msPerDay) : 0
        })))
      }
    }
    
    console.log(`✅ [Todoist Sync] Tasks to import: ${activeTasks.length}`)

    // Get or create assistant
    let { data: assistant } = await supabase
      .from('assistant_config')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'asystent dnia v2')
      .single()

    if (!assistant) {
      // Create assistant if it doesn't exist
      const { data: newAssistant, error: createError } = await supabase
        .from('assistant_config')
        .insert({
          user_id: user.id,
          name: 'asystent dnia v2',
          type: 'day_planner',
          settings: {
            undo_window_seconds: 15,
            max_postpones: 5,
            morning_must_block: true,
            light_task_limit_minutes: 120
          },
          is_active: true
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[Sync] Error creating assistant:', createError)
        return NextResponse.json(
          { error: 'Failed to create assistant' },
          { status: 500 }
        )
      }

      assistant = newAssistant
    }

    const assistantId = assistant.id

    // Fetch existing tasks to preserve custom estimate_min, context_type AND cognitive_load values
    const { data: existingTasksData } = await supabase
      .from('day_assistant_v2_tasks')
      .select('todoist_id, estimate_min, context_type, cognitive_load')
      .eq('user_id', user.id)
      .eq('assistant_id', assistantId)
      .not('todoist_id', 'is', null)
    
    // Create maps for quick lookup
    const existingEstimates = new Map<string, number>()
    const existingContexts = new Map<string, string>()
    const existingCognitiveLoads = new Map<string, number>()
    if (existingTasksData) {
      existingTasksData.forEach(task => {
        if (task.todoist_id) {
          existingEstimates.set(task.todoist_id, task.estimate_min)
          if (task.context_type) {
            existingContexts.set(task.todoist_id, task.context_type)
          }
          if (typeof task.cognitive_load === 'number') {
            existingCognitiveLoads.set(task.todoist_id, task.cognitive_load)
          }
        }
      })
    }

    // Map Todoist tasks to DayAssistantV2Task format with AI inference
    // Filter out invalid tasks that couldn't be mapped
    const mappedTasksPromises = activeTasks.map(async (task) => {
      try {
        const existingContext = task.id ? existingContexts.get(task.id) : undefined
        const existingCognitive = task.id ? existingCognitiveLoads.get(task.id) : undefined
        return await mapTodoistToDayAssistantTask(task, user.id, assistantId, projectsMap, existingContext, existingCognitive)
      } catch (error) {
        console.error('[Sync] Error mapping task:', task.id, error)
        return null
      }
    })
    
    const mappedTasks = (await Promise.all(mappedTasksPromises))
      .filter((task): task is Partial<DayAssistantV2Task> => task !== null)
    
    const skippedCount = activeTasks.length - mappedTasks.length
    if (skippedCount > 0) {
      console.warn(`[Sync] Skipped ${skippedCount} invalid tasks out of ${activeTasks.length}`)
    }
    console.log(`[Sync] Mapped ${mappedTasks.length} valid tasks from ${activeTasks.length} active Todoist tasks`)

    // Preserve existing estimate_min values for tasks that already exist
    const mappedTasksWithPreservedEstimates = mappedTasks.map(task => {
      if (task.todoist_id && existingEstimates.has(task.todoist_id)) {
        const existingEstimate = existingEstimates.get(task.todoist_id)!
        console.log(`[Sync] Preserving estimate_min ${existingEstimate} for task "${task.title}"`)
        return {
          ...task,
          estimate_min: existingEstimate
        }
      }
      return task
    })

    // Delete old synced tasks that are no longer in Todoist
    const todoistIds = activeTasks.map(t => t.id)
    
    // Get all existing synced tasks
    const { data: existingTasks } = await supabase
      .from('day_assistant_v2_tasks')
      .select('id, todoist_id')
      .eq('user_id', user.id)
      .eq('assistant_id', assistantId)
      .not('todoist_id', 'is', null)
    
    // Find tasks to delete (tasks that exist in DB but not in Todoist)
    if (existingTasks && existingTasks.length > 0) {
      const tasksToDelete = existingTasks
        .filter(task => task.todoist_id && !todoistIds.includes(task.todoist_id))
        .map(task => task.id)
      
      if (tasksToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('day_assistant_v2_tasks')
          .delete()
          .in('id', tasksToDelete)

        if (deleteError) {
          console.error('[Sync] Error deleting old tasks:', deleteError)
        } else {
          console.log(`[Sync] Deleted ${tasksToDelete.length} stale tasks`)
        }
      }
    }

    // Mark tasks as completed if they're completed in Todoist
    const todoistCompletedIds = todoistTasks
      .filter(task => task.is_completed)
      .map(task => task.id)

    if (todoistCompletedIds.length > 0 && existingTasks) {
      const tasksToComplete = existingTasks
        .filter(task => task.todoist_id && todoistCompletedIds.includes(task.todoist_id))
        .map(task => task.id)
      
      if (tasksToComplete.length > 0) {
        const { error: completeError } = await supabase
          .from('day_assistant_v2_tasks')
          .update({ 
            completed: true,
            // ISO timestamp in UTC - PostgreSQL TIMESTAMP stores in UTC and converts on retrieval
            completed_at: new Date().toISOString() 
          })
          .in('id', tasksToComplete)

        if (completeError) {
          console.error('[Sync] Error marking tasks as completed:', completeError)
        } else {
          console.log(`[Sync] Marked ${tasksToComplete.length} tasks as completed`)
        }
      }
    }

    // Upsert tasks with native conflict resolution
    if (mappedTasksWithPreservedEstimates.length > 0) {
      console.log(`[Sync] Upserting ${mappedTasksWithPreservedEstimates.length} tasks`)
      
      // Log first task as sample to verify data structure
      const firstTask = mappedTasksWithPreservedEstimates[0]
      console.log('💾 [Todoist Sync] Sample task being upserted:', {
        todoist_id: firstTask.todoist_id,
        title: firstTask.title,
        due_date: firstTask.due_date,
        is_overdue: firstTask.due_date && firstTask.due_date < todayISO,
        estimate_min: firstTask.estimate_min,
        priority: firstTask.priority
      })
      
      // Log overdue tasks being imported (gated for performance)
      if (process.env.NODE_ENV !== 'production') {
        const overdueBeingImported = mappedTasksWithPreservedEstimates.filter(t => t.due_date && t.due_date < todayISO)
        if (overdueBeingImported.length > 0) {
          console.log(`⚠️ [Todoist Sync] Importing ${overdueBeingImported.length} overdue tasks:`)
          const nowTime = new Date().getTime()
          const msPerDay = 1000 * 60 * 60 * 24
          overdueBeingImported.slice(0, 5).forEach(t => {
            console.log('  💾 [Todoist Sync] Importing:', {
              title: t.title,
              due_date: t.due_date,
              days_overdue: t.due_date ? Math.floor((nowTime - new Date(t.due_date).getTime()) / msPerDay) : 0
            })
          })
        }
      }

      const { data, error } = await supabase
        .from('day_assistant_v2_tasks')
        .upsert(mappedTasksWithPreservedEstimates, {
          onConflict: 'user_id,assistant_id,todoist_id',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error('[Sync] ❌ Error upserting tasks:', error)
        return NextResponse.json(
          { 
            error: 'Failed to sync tasks', 
            details: error.message,
            error_code: error.code
          },
          { status: 500 }
        )
      }

      console.log(`[Sync] ✅ Successfully upserted ${data?.length || mappedTasksWithPreservedEstimates.length} tasks`)
      
      // Log first returned task to verify what was stored
      if (data && data.length > 0) {
        console.log('[Sync] Sample task after upsert:', {
          id: data[0].id,
          todoist_id: data[0].todoist_id,
          title: data[0].title,
          estimate_min: data[0].estimate_min,
          tags: data[0].tags,
          tags_type: Array.isArray(data[0].tags) ? 'array' : typeof data[0].tags,
          position: data[0].position,
          position_type: typeof data[0].position,
          postpone_count: data[0].postpone_count,
          postpone_count_type: typeof data[0].postpone_count
        })
      } else {
        console.warn('[Sync] ⚠️  Upsert succeeded but no data returned (this might be normal for ignoreDuplicates mode)')
      }
    }

    // Update sync metadata
    const now = new Date().toISOString()
    const { error: metaError } = await supabase
      .from('sync_metadata')
      .upsert({
        user_id: user.id,
        sync_type: 'todoist',
        last_synced_at: now,
        task_count: mappedTasksWithPreservedEstimates.length
      }, {
        onConflict: 'user_id,sync_type'
      })

    if (metaError) {
      console.error('[Sync] Error updating sync metadata:', metaError)
    }

    console.log(`[Sync] ✅ Synced ${mappedTasksWithPreservedEstimates.length} tasks from Todoist`)

    return NextResponse.json({
      success: true,
      synced_at: now,
      task_count: mappedTasksWithPreservedEstimates.length,
      message: `Successfully synced ${mappedTasksWithPreservedEstimates.length} tasks`
    })

  } catch (error) {
    console.error('❌ [Todoist Sync API] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error during sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
