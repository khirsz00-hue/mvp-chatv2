/**
 * Manual verification script for buildSmartQueue
 * Run with: npx ts-node hooks/__tests__/verify-queue-logic.ts
 */

import { buildSmartQueue } from '../useTaskQueue'
import { TestDayTask } from '@/lib/types/dayAssistantV2'

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
  completed_at: null,
  position: 0,
  postpone_count: 0,
  auto_moved: false,
  metadata: {},
  created_at: todayISO,
  updated_at: todayISO
} as any)

console.log('🧪 Testing buildSmartQueue logic...\n')

// Test 1: Normal capacity
console.log('📊 Test 1: Normal capacity - 1 MUST + 5 unpinned tasks')
const test1Tasks = [
  createTask('1', 'MUST Task', 120, true, todayISO, 100),
  createTask('2', 'High Score Task', 60, false, todayISO, 90),
  createTask('3', 'Medium Score Task', 60, false, todayISO, 80),
  createTask('4', 'Low Score Task', 60, false, todayISO, 70),
  createTask('5', 'Lower Score Task', 60, false, todayISO, 60),
  createTask('6', 'Lowest Score Task', 60, false, todayISO, 50)
]

const result1 = buildSmartQueue(test1Tasks, 480, todayISO)
console.log('  Queue (Top 3):', result1.queue.map(t => t.title))
console.log('  Remaining Today:', result1.remainingToday.map(t => t.title))
console.log('  Later:', result1.later.map(t => t.title))
console.log('  Used Time:', result1.usedTime, '/', result1.capacity)
console.log('  Overflow Count:', result1.overflowCount)
console.log('  ✅ Expected: Queue=3, Remaining=3, Later=0\n')

// Test 2: Overloaded day
console.log('📊 Test 2: Overloaded day - 1 MUST task using all capacity')
const test2Tasks = [
  createTask('1', 'Big MUST Task', 480, true, todayISO, 100),
  createTask('2', 'Task 1', 30, false, todayISO, 90),
  createTask('3', 'Task 2', 30, false, todayISO, 80),
  createTask('4', 'Task 3', 30, false, todayISO, 70),
  createTask('5', 'Task 4', 30, false, todayISO, 60),
  createTask('6', 'Task 5', 30, false, todayISO, 50),
  createTask('7', 'Task 6', 30, false, todayISO, 40),
  createTask('8', 'Task 7', 30, false, todayISO, 30)
]

const result2 = buildSmartQueue(test2Tasks, 480, todayISO)
console.log('  Queue (Top 3):', result2.queue.map(t => t.title))
console.log('  Remaining Today:', result2.remainingToday.map(t => t.title))
console.log('  Later (first 3):', result2.later.slice(0, 3).map(t => t.title))
console.log('  Used Time:', result2.usedTime, '/', result2.capacity)
console.log('  Overflow Count:', result2.overflowCount)
console.log('  ✅ Expected: Queue=1 (MUST only), Remaining=0, Later=7 (all overflow)\n')

// Test 3: Future tasks
console.log('📊 Test 3: Future tasks - mix of today and future')
const test3Tasks = [
  createTask('1', 'Today Task 1', 60, false, todayISO, 90),
  createTask('2', 'Today Task 2', 60, false, todayISO, 80),
  createTask('3', 'Today Task 3', 60, false, todayISO, 70),
  createTask('4', 'Tomorrow Task', 30, false, '2025-12-26', 60),
  createTask('5', 'Next Week Task', 30, false, '2026-01-01', 50)
]

const result3 = buildSmartQueue(test3Tasks, 180, todayISO)
console.log('  Queue (Top 3):', result3.queue.map(t => t.title))
console.log('  Remaining Today:', result3.remainingToday.map(t => t.title))
console.log('  Later:', result3.later.map(t => `${t.title} (${t.due_date})`))
console.log('  Used Time:', result3.usedTime, '/', result3.capacity)
console.log('  Overflow Count:', result3.overflowCount)
console.log('  ✅ Expected: Queue=3 (all today), Remaining=0, Later=2 (future only)\n')

// Test 4: No duplicates
console.log('📊 Test 4: No duplicates - verify each task appears only once')
const test4Tasks = [
  createTask('1', 'MUST Task', 100, true, todayISO, 100),
  createTask('2', 'Task 1', 50, false, todayISO, 90),
  createTask('3', 'Task 2', 50, false, todayISO, 80),
  createTask('4', 'Task 3', 50, false, todayISO, 70),
  createTask('5', 'Task 4', 50, false, todayISO, 60),
  createTask('6', 'Task 5', 250, false, todayISO, 50)
]

const result4 = buildSmartQueue(test4Tasks, 300, todayISO)
const allIds = [
  ...result4.queue.map(t => t.id),
  ...result4.remainingToday.map(t => t.id),
  ...result4.later.map(t => t.id)
]
const uniqueIds = new Set(allIds)

console.log('  Total tasks:', test4Tasks.length)
console.log('  Tasks in all sections:', allIds.length)
console.log('  Unique task IDs:', uniqueIds.size)
console.log('  Queue:', result4.queue.map(t => t.id))
console.log('  Remaining:', result4.remainingToday.map(t => t.id))
console.log('  Later:', result4.later.map(t => t.id))
console.log('  ✅ Expected: All counts = 6, no duplicates\n')

// Test 5: Overflow sorting
console.log('📊 Test 5: Overflow tasks sorted before future tasks')
const test5Tasks = [
  createTask('1', 'Today Task 1', 200, false, todayISO, 90),
  createTask('2', 'Today Task 2', 200, false, todayISO, 80),
  createTask('3', 'Today Task 3', 200, false, todayISO, 70),
  createTask('4', 'Tomorrow Task', 30, false, '2025-12-26', 60)
]

const result5 = buildSmartQueue(test5Tasks, 400, todayISO)
console.log('  Queue (Top 2):', result5.queue.map(t => t.title))
console.log('  Remaining Today:', result5.remainingToday.map(t => t.title))
console.log('  Later:', result5.later.map(t => `${t.title} (${t.due_date})`))
console.log('  Overflow Count:', result5.overflowCount)
console.log('  ✅ Expected: Queue=2, Remaining=0, Later=2 (overflow first, then future)\n')

console.log('🎉 All tests completed! Review output to verify logic is correct.')
