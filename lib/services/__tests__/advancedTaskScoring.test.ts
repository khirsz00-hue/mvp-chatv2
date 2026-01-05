/**
 * Tests for Advanced Task Scoring System
 * Validates scenarios from the problem statement
 */

import {
  calculateDeadlineScore,
  calculatePriorityScore,
  calculateCognitiveLoadPenalty,
  calculatePostponeBonus,
  calculateTaskScore
} from '../advancedTaskScoring'
import { TestDayTask } from '@/lib/types/dayAssistantV2'

// Helper to create a test task
function createTestTask(overrides: Partial<TestDayTask>): TestDayTask {
  return {
    id: 'test-task',
    user_id: 'test-user',
    assistant_id: 'test-assistant',
    title: 'Test Task',
    priority: 3,
    is_must: false,
    is_important: false,
    estimate_min: 30,
    cognitive_load: 3,
    tags: [],
    completed: false,
    position: 0,
    postpone_count: 0,
    auto_moved: false,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  } as TestDayTask
}

describe('Advanced Task Scoring', () => {
  describe('calculateDeadlineScore', () => {
    test('overdue tasks get 150 points', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      expect(calculateDeadlineScore(yesterday)).toBe(150)
    })

    test('tasks due in less than 2 hours get 100 points', () => {
      const soon = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
      expect(calculateDeadlineScore(soon)).toBe(100)
    })

    test('tasks due in 2-4 hours get 80 points', () => {
      const soon = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      expect(calculateDeadlineScore(soon)).toBe(80)
    })

    test('tasks due in 4-8 hours get 60 points', () => {
      const soon = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
      expect(calculateDeadlineScore(soon)).toBe(60)
    })

    test('tasks due in less than 24 hours get 40 points', () => {
      const soon = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      expect(calculateDeadlineScore(soon)).toBe(40)
    })

    test('tasks due tomorrow get 30 points', () => {
      const tomorrow = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()
      expect(calculateDeadlineScore(tomorrow)).toBe(30)
    })

    test('tasks due this week get 15 points', () => {
      const thisWeek = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      expect(calculateDeadlineScore(thisWeek)).toBe(15)
    })

    test('tasks due later get 10 points', () => {
      const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      expect(calculateDeadlineScore(later)).toBe(10)
    })

    test('tasks with no deadline get 10 points', () => {
      expect(calculateDeadlineScore(null)).toBe(10)
      expect(calculateDeadlineScore(undefined)).toBe(10)
    })
  })

  describe('calculatePriorityScore', () => {
    test('P1 priority (1 in app) gets 50 points', () => {
      expect(calculatePriorityScore(1)).toBe(50)
      expect(calculatePriorityScore('P1')).toBe(50)
      expect(calculatePriorityScore('1')).toBe(50)
    })

    test('P2 priority (2 in app) gets 30 points', () => {
      expect(calculatePriorityScore(2)).toBe(30)
      expect(calculatePriorityScore('P2')).toBe(30)
    })

    test('P3 priority (3 in app) gets 10 points', () => {
      expect(calculatePriorityScore(3)).toBe(10)
      expect(calculatePriorityScore('P3')).toBe(10)
    })

    test('default priority gets 5 points', () => {
      expect(calculatePriorityScore(0)).toBe(5)
      expect(calculatePriorityScore(undefined)).toBe(5)
    })
  })

  describe('calculateCognitiveLoadPenalty', () => {
    test('cognitive load 1 gives 2 point penalty', () => {
      expect(calculateCognitiveLoadPenalty(1)).toBe(2)
      expect(calculateCognitiveLoadPenalty('1/5')).toBe(2)
    })

    test('cognitive load 3 gives 6 point penalty', () => {
      expect(calculateCognitiveLoadPenalty(3)).toBe(6)
      expect(calculateCognitiveLoadPenalty('3/5')).toBe(6)
    })

    test('cognitive load 5 gives 10 point penalty', () => {
      expect(calculateCognitiveLoadPenalty(5)).toBe(10)
      expect(calculateCognitiveLoadPenalty('5/5')).toBe(10)
    })
  })

  describe('calculatePostponeBonus', () => {
    test('no postpones gives 0 bonus', () => {
      expect(calculatePostponeBonus(0)).toBe(0)
      expect(calculatePostponeBonus(undefined)).toBe(0)
    })

    test('3 postpones gives 15 point bonus', () => {
      expect(calculatePostponeBonus(3)).toBe(15)
    })

    test('5 postpones gives 25 point bonus', () => {
      expect(calculatePostponeBonus(5)).toBe(25)
    })
  })

  describe('calculateTaskScore - Problem Statement Scenarios', () => {
    test('Scenario 1: Same deadline, different priorities', () => {
      const threeHoursFromNow = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      
      // Task A: Due today 3h, P1, CL 3/5, 0 postpones = 80 + 50 - 6 + 0 = 124
      const taskA = createTestTask({
        due_date: threeHoursFromNow,
        priority: 1, // P1 in app's internal model
        cognitive_load: 3,
        postpone_count: 0
      })
      const scoreA = calculateTaskScore(taskA)
      expect(scoreA.total).toBe(124)
      expect(scoreA.breakdown.deadline).toBe(80)
      expect(scoreA.breakdown.priority).toBe(50)
      expect(scoreA.breakdown.cognitiveLoad).toBe(-6)
      expect(scoreA.breakdown.postpone).toBe(0)

      // Task B: Due today 3h, P2, CL 3/5, 0 postpones = 80 + 30 - 6 + 0 = 104
      const taskB = createTestTask({
        due_date: threeHoursFromNow,
        priority: 2, // P2 in app's internal model
        cognitive_load: 3,
        postpone_count: 0
      })
      const scoreB = calculateTaskScore(taskB)
      expect(scoreB.total).toBe(104)
      
      // Task A should rank higher
      expect(scoreA.total).toBeGreaterThan(scoreB.total)
    })

    test('Scenario 2: Same priority & deadline, different cognitive load', () => {
      const threeHoursFromNow = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      
      // Task A: Due today 3h, P1, CL 5/5, 0 postpones = 80 + 50 - 10 + 0 = 120
      const taskA = createTestTask({
        due_date: threeHoursFromNow,
        priority: 1, // P1 in app's internal model
        cognitive_load: 5,
        postpone_count: 0
      })
      const scoreA = calculateTaskScore(taskA)
      expect(scoreA.total).toBe(120)

      // Task B: Due today 3h, P1, CL 2/5, 0 postpones = 80 + 50 - 4 + 0 = 126
      const taskB = createTestTask({
        due_date: threeHoursFromNow,
        priority: 1, // P1 in app's internal model
        cognitive_load: 2,
        postpone_count: 0
      })
      const scoreB = calculateTaskScore(taskB)
      expect(scoreB.total).toBe(126)
      
      // Task B should rank higher (easier task preferred)
      expect(scoreB.total).toBeGreaterThan(scoreA.total)
    })

    test('Scenario 3: Postponed task gets boost', () => {
      const fiveHoursFromNow = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
      const threeHoursFromNow = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      
      // Task A: Due today 5h, P2, CL 3/5, 3 postpones = 60 + 30 - 6 + 15 = 99
      const taskA = createTestTask({
        due_date: fiveHoursFromNow,
        priority: 2, // P2 in app's internal model
        cognitive_load: 3,
        postpone_count: 3
      })
      const scoreA = calculateTaskScore(taskA)
      expect(scoreA.total).toBe(99)
      expect(scoreA.breakdown.postpone).toBe(15)

      // Task B: Due today 3h, P3, CL 2/5, 0 postpones = 80 + 10 - 4 + 0 = 86
      const taskB = createTestTask({
        due_date: threeHoursFromNow,
        priority: 3, // P3 in app's internal model
        cognitive_load: 2,
        postpone_count: 0
      })
      const scoreB = calculateTaskScore(taskB)
      expect(scoreB.total).toBe(86)
      
      // Task A should rank higher (postpone bonus helps)
      expect(scoreA.total).toBeGreaterThan(scoreB.total)
    })

    test('Overdue tasks always appear at top', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      
      // Overdue task with low priority
      const overdueTask = createTestTask({
        due_date: yesterday,
        priority: 4, // P4 in app's internal model (lowest)
        cognitive_load: 5, // Highest load
        postpone_count: 0
      })
      const overdueScore = calculateTaskScore(overdueTask)
      // 150 + 5 - 10 + 0 = 145
      expect(overdueScore.total).toBe(145)

      // Future task with high priority
      const futureTask = createTestTask({
        due_date: tomorrow,
        priority: 1, // P1 in app's internal model (highest)
        cognitive_load: 1, // Lowest load
        postpone_count: 5 // 5 postpones
      })
      const futureScore = calculateTaskScore(futureTask)
      // 30 + 50 - 2 + 25 = 103
      expect(futureScore.total).toBe(103)
      
      // Overdue task should rank higher
      expect(overdueScore.total).toBeGreaterThan(futureScore.total)
    })
  })
})
