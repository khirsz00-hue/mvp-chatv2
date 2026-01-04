/**
 * Test for buildSmartQueue function
 * Tests the queue distribution logic
 */

import { buildSmartQueue } from '../useTaskQueue'
import { TestDayTask } from '@/lib/types/dayAssistantV2'

describe('buildSmartQueue', () => {
  const todayISO = '2025-12-25'
  
  // Helper to create a mock task
  const createTask = (
    id: string, 
    title: string, 
    estimate_min: number, 
    is_must: boolean, 
    due_date: string | null,
    score: number = 50
  ): TestDayTask => ({
    id,
    user_id: 'test-user',
    assistant_id: 'test-assistant',
    title,
    description: null,
    priority: 3,
    is_must,
    is_important: is_must,
    estimate_min,
    cognitive_load: 2,
    tags: [],
    context_type: 'deep_work',
    due_date,
    completed: false,
    position: 0,
    postpone_count: 0,
    auto_moved: false,
    metadata: {},
    created_at: todayISO,
    updated_at: todayISO,
    _score: score
  } as any)

  test('Test 1: Normal capacity - 1 MUST + 5 unpinned tasks', () => {
    const tasks = [
      createTask('1', 'MUST Task', 120, true, todayISO, 100),
      createTask('2', 'High Score Task', 60, false, todayISO, 90),
      createTask('3', 'Medium Score Task', 60, false, todayISO, 80),
      createTask('4', 'Low Score Task', 60, false, todayISO, 70),
      createTask('5', 'Lower Score Task', 60, false, todayISO, 60),
      createTask('6', 'Lowest Score Task', 60, false, todayISO, 50)
    ]
    
    const capacity = 480 // 8 hours
    const result = buildSmartQueue(tasks, capacity, todayISO)
    
    // Queue should have top 3: MUST + 2 highest scored
    expect(result.queue.length).toBe(3)
    expect(result.queue[0].is_must).toBe(true)
    expect(result.queue[1].title).toBe('High Score Task')
    expect(result.queue[2].title).toBe('Medium Score Task')
    
    // Remaining should have tasks that fit in capacity
    expect(result.remainingToday.length).toBe(3) // 3 more tasks fit
    expect(result.usedTime).toBe(360) // 120 + 60 + 60 + 60 + 60 + 60 = 420
    
    // Later should be empty (all fit in capacity)
    expect(result.later.length).toBe(0)
    expect(result.overflowCount).toBe(0)
  })

  test('Test 2: Overloaded day - 1 MUST task using all capacity', () => {
    const tasks = [
      createTask('1', 'Big MUST Task', 480, true, todayISO, 100),
      createTask('2', 'Task 1', 30, false, todayISO, 90),
      createTask('3', 'Task 2', 30, false, todayISO, 80),
      createTask('4', 'Task 3', 30, false, todayISO, 70),
      createTask('5', 'Task 4', 30, false, todayISO, 60),
      createTask('6', 'Task 5', 30, false, todayISO, 50),
      createTask('7', 'Task 6', 30, false, todayISO, 40),
      createTask('8', 'Task 7', 30, false, todayISO, 30)
    ]
    
    const capacity = 480
    const result = buildSmartQueue(tasks, capacity, todayISO)
    
    // Queue should have only MUST task (fills capacity)
    expect(result.queue.length).toBe(1)
    expect(result.queue[0].is_must).toBe(true)
    expect(result.usedTime).toBe(480)
    
    // Remaining should be empty (no room)
    expect(result.remainingToday.length).toBe(0)
    
    // Later should have all 7 overflow tasks
    expect(result.later.length).toBe(7)
    expect(result.overflowCount).toBe(7)
  })

  test('Test 3: Future tasks - mix of today and future', () => {
    const tasks = [
      createTask('1', 'Today Task 1', 60, false, todayISO, 90),
      createTask('2', 'Today Task 2', 60, false, todayISO, 80),
      createTask('3', 'Today Task 3', 60, false, todayISO, 70),
      createTask('4', 'Tomorrow Task', 30, false, '2025-12-26', 60),
      createTask('5', 'Next Week Task', 30, false, '2026-01-01', 50)
    ]
    
    const capacity = 180 // Only 3 hours
    const result = buildSmartQueue(tasks, capacity, todayISO)
    
    // Queue should have top 3 from today
    expect(result.queue.length).toBe(3)
    expect(result.queue.every(t => t.due_date === todayISO)).toBe(true)
    
    // Remaining should be empty (all today tasks in queue)
    expect(result.remainingToday.length).toBe(0)
    
    // Later should have 2 future tasks
    expect(result.later.length).toBe(2)
    expect(result.overflowCount).toBe(0) // No overflow from today
    
    // Future tasks should be sorted by date
    expect(result.later[0].due_date).toBe('2025-12-26')
    expect(result.later[1].due_date).toBe('2026-01-01')
  })

  test('Test 4: No duplicates - tasks appear only once', () => {
    const tasks = [
      createTask('1', 'MUST Task', 100, true, todayISO, 100),
      createTask('2', 'Task 1', 50, false, todayISO, 90),
      createTask('3', 'Task 2', 50, false, todayISO, 80),
      createTask('4', 'Task 3', 50, false, todayISO, 70),
      createTask('5', 'Task 4', 50, false, todayISO, 60),
      createTask('6', 'Task 5', 250, false, todayISO, 50), // Large task that won't fit
    ]
    
    const capacity = 300
    const result = buildSmartQueue(tasks, capacity, todayISO)
    
    // Collect all task IDs from all sections
    const queueIds = result.queue.map(t => t.id)
    const remainingIds = result.remainingToday.map(t => t.id)
    const laterIds = result.later.map(t => t.id)
    
    const allIds = [...queueIds, ...remainingIds, ...laterIds]
    const uniqueIds = new Set(allIds)
    
    // No duplicates - set size should equal array length
    expect(uniqueIds.size).toBe(allIds.length)
    expect(allIds.length).toBe(tasks.length)
  })

  test('Test 5: Overflow tasks sorted before future tasks', () => {
    const tasks = [
      createTask('1', 'Today Task 1', 200, false, todayISO, 90),
      createTask('2', 'Today Task 2', 200, false, todayISO, 80),
      createTask('3', 'Today Task 3', 200, false, todayISO, 70),
      createTask('4', 'Tomorrow Task', 30, false, '2025-12-26', 60)
    ]
    
    const capacity = 400 // Only room for 2 today tasks
    const result = buildSmartQueue(tasks, capacity, todayISO)
    
    // Queue should have 2 tasks
    expect(result.queue.length).toBe(2)
    
    // Remaining should be empty
    expect(result.remainingToday.length).toBe(0)
    
    // Later should have 1 overflow + 1 future = 2 tasks
    expect(result.later.length).toBe(2)
    expect(result.overflowCount).toBe(1)
    
    // First task in later should be overflow from today
    expect(result.later[0].due_date).toBe(todayISO)
    expect(result.later[1].due_date).toBe('2025-12-26')
  })

  test('Test 6: Zero capacity - all tasks go to later', () => {
    const tasks = [
      createTask('1', 'MUST Task', 60, true, todayISO, 100),
      createTask('2', 'Task 1', 30, false, todayISO, 90),
      createTask('3', 'Task 2', 30, false, todayISO, 80),
      createTask('4', 'Task 3', 30, false, todayISO, 70),
      createTask('5', 'Future Task', 30, false, '2025-12-26', 60)
    ]
    
    const capacity = 0 // No capacity (work hours ended)
    const result = buildSmartQueue(tasks, capacity, todayISO)
    
    // Queue should be empty
    expect(result.queue.length).toBe(0)
    
    // Remaining should be empty
    expect(result.remainingToday.length).toBe(0)
    
    // All tasks should be in later (4 today + 1 future = 5)
    expect(result.later.length).toBe(5)
    expect(result.overflowCount).toBe(4) // 4 today tasks are overflow
    
    // Today tasks should come first
    const todayTasksInLater = result.later.filter(t => t.due_date === todayISO)
    expect(todayTasksInLater.length).toBe(4)
    
    // Used time should be 0
    expect(result.usedTime).toBe(0)
    expect(result.capacity).toBe(0)
  })
})
