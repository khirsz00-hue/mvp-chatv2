/**
 * Verification Script: Test Enhanced Scoring System
 * Tests unique scores, context grouping bonus, and tie-breakers
 */

import { calculateTaskScore } from '../lib/services/dayAssistantV2RecommendationEngine'
import { TestDayTask, DayPlan } from '../lib/types/dayAssistantV2'

// Mock day plan
const mockDayPlan: DayPlan = {
  id: 'test-plan',
  user_id: 'test-user',
  assistant_id: 'test-assistant',
  date: '2025-12-25',
  energy: 3,
  focus: 3,
  work_hours: 8,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

// Create test tasks with same priority but different contexts
const createTestTask = (id: string, title: string, context: string, priority: number = 3): TestDayTask => ({
  id,
  user_id: 'test-user',
  assistant_id: 'test-assistant',
  title,
  priority,
  is_must: false,
  is_important: false,
  estimate_min: 30,
  cognitive_load: 3,
  tags: [],
  context_type: context,
  due_date: '2025-12-25',
  completed: false,
  position: 0,
  postpone_count: 0,
  auto_moved: false,
  metadata: {},
  created_at: new Date(Date.now() - Math.random() * 1000000).toISOString(),
  updated_at: new Date().toISOString()
})

console.log('🧪 Testing Enhanced Scoring System\n')
console.log('=' .repeat(60))

// Test 1: Unique Scores
console.log('\n📊 TEST 1: Unique Scores (No More All 45!)')
console.log('-'.repeat(60))

const taskA = createTestTask('task-a', 'Task A', 'deep_work', 3)
const taskB = createTestTask('task-b', 'Task B', 'admin', 3)
const taskC = createTestTask('task-c', 'Task C', 'communication', 3)

const scoreA = calculateTaskScore(taskA, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 3,
  lightMinutesToday: 0
})

const scoreB = calculateTaskScore(taskB, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 3,
  lightMinutesToday: 0
})

const scoreC = calculateTaskScore(taskC, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 3,
  lightMinutesToday: 0
})

console.log(`Task A: ${scoreA.score.toFixed(2)} ${scoreA.score === scoreB.score ? '❌ SAME' : '✅ UNIQUE'}`)
console.log(`Task B: ${scoreB.score.toFixed(2)} ${scoreB.score === scoreC.score ? '❌ SAME' : '✅ UNIQUE'}`)
console.log(`Task C: ${scoreC.score.toFixed(2)} ${scoreC.score === scoreA.score ? '❌ SAME' : '✅ UNIQUE'}`)

const allUnique = scoreA.score !== scoreB.score && scoreB.score !== scoreC.score && scoreA.score !== scoreC.score
console.log(`\n${allUnique ? '✅ PASS' : '❌ FAIL'}: All scores are unique!`)

// Test 2: Context Grouping Bonus
console.log('\n\n🎭 TEST 2: Context Grouping Bonus')
console.log('-'.repeat(60))

const deepWork1 = createTestTask('dw-1', 'Deep Work 1', 'deep_work', 2)
const deepWork2 = createTestTask('dw-2', 'Deep Work 2', 'deep_work', 2)
const deepWork3 = createTestTask('dw-3', 'Deep Work 3', 'deep_work', 2)
const adminTask = createTestTask('admin-1', 'Admin Task', 'admin', 2)

// First task - no context bonus
const score1 = calculateTaskScore(deepWork1, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 4,
  lightMinutesToday: 0,
  tasksAlreadyInQueue: []
})

// Second task - continuing same context (+5 bonus)
const score2 = calculateTaskScore(deepWork2, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 4,
  lightMinutesToday: 0,
  tasksAlreadyInQueue: [deepWork1]
})

// Third task - continuing same context (+10 bonus)
const score3 = calculateTaskScore(deepWork3, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 4,
  lightMinutesToday: 0,
  tasksAlreadyInQueue: [deepWork1, deepWork2]
})

// Fourth task - context switch (-3 penalty)
const score4 = calculateTaskScore(adminTask, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 4,
  lightMinutesToday: 0,
  tasksAlreadyInQueue: [deepWork1, deepWork2, deepWork3]
})

console.log('Deep Work 1 (first):     ', score1.score.toFixed(2))
console.log('Deep Work 2 (continue):  ', score2.score.toFixed(2), score2.score > score1.score ? '✅ +5 bonus' : '❌')
console.log('Deep Work 3 (continue):  ', score3.score.toFixed(2), score3.score > score2.score ? '✅ +10 bonus' : '❌')
console.log('Admin Task (switch):     ', score4.score.toFixed(2), score4.score < score3.score ? '✅ -3 penalty' : '❌')

if (score1.reasoning) {
  console.log('\n📝 Reasoning for Deep Work 2:')
  score2.reasoning?.forEach(r => console.log(`  • ${r}`))
}

const contextTest = score2.score > score1.score && score3.score > score2.score && score4.score < score3.score
console.log(`\n${contextTest ? '✅ PASS' : '❌ FAIL'}: Context grouping works correctly!`)

// Test 3: Tie-breaker Uniqueness
console.log('\n\n🎲 TEST 3: Tie-breaker Ensures Deterministic Ordering')
console.log('-'.repeat(60))

const identical1 = createTestTask('id-1', 'Identical Task 1', 'deep_work', 3)
const identical2 = createTestTask('id-2', 'Identical Task 2', 'deep_work', 3)

const identicalScore1 = calculateTaskScore(identical1, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 2,
  lightMinutesToday: 0
})

const identicalScore2 = calculateTaskScore(identical2, mockDayPlan, {
  todayDate: '2025-12-25',
  totalTasksToday: 2,
  lightMinutesToday: 0
})

console.log(`Identical Task 1: ${identicalScore1.score.toFixed(6)}`)
console.log(`Identical Task 2: ${identicalScore2.score.toFixed(6)}`)

const tiebreakerTest = identicalScore1.score !== identicalScore2.score
console.log(`\n${tiebreakerTest ? '✅ PASS' : '❌ FAIL'}: Tie-breaker makes them unique!`)

// Summary
console.log('\n\n' + '='.repeat(60))
console.log('📊 SUMMARY')
console.log('='.repeat(60))
console.log(`✅ Unique Scores:         ${allUnique ? 'PASS' : 'FAIL'}`)
console.log(`✅ Context Grouping:      ${contextTest ? 'PASS' : 'FAIL'}`)
console.log(`✅ Tie-breaker:           ${tiebreakerTest ? 'PASS' : 'FAIL'}`)
console.log('='.repeat(60))

const allPass = allUnique && contextTest && tiebreakerTest
if (allPass) {
  console.log('\n🎉 ALL TESTS PASSED! Enhanced scoring system works correctly!')
} else {
  console.log('\n⚠️  SOME TESTS FAILED - Please review the scoring logic')
  process.exit(1)
}
