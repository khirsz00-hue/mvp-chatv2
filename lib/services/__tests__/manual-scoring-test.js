#!/usr/bin/env node
/**
 * Manual test script for Advanced Task Scoring System
 * Run with: node lib/services/__tests__/manual-scoring-test.js
 */

const { 
  calculateDeadlineScore,
  calculatePriorityScore,
  calculateCognitiveLoadPenalty,
  calculatePostponeBonus,
  calculateTaskScore
} = require('../advancedTaskScoring')

console.log('🧪 Testing Advanced Task Scoring System\n')

// Test 1: Deadline scoring
console.log('📅 Test 1: Deadline Scoring')
const now = new Date()
const overdue = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
const in1Hour = new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()
const in3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()
const in5Hours = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString()
const tomorrow = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString()

console.log(`  Overdue: ${calculateDeadlineScore(overdue)} (expected 150)`)
console.log(`  In 1 hour: ${calculateDeadlineScore(in1Hour)} (expected 100)`)
console.log(`  In 3 hours: ${calculateDeadlineScore(in3Hours)} (expected 80)`)
console.log(`  In 5 hours: ${calculateDeadlineScore(in5Hours)} (expected 60)`)
console.log(`  Tomorrow: ${calculateDeadlineScore(tomorrow)} (expected 30)`)
console.log(`  No deadline: ${calculateDeadlineScore(null)} (expected 10)\n`)

// Test 2: Priority scoring
console.log('🚩 Test 2: Priority Scoring')
console.log(`  P1 (priority 4): ${calculatePriorityScore(4)} (expected 50)`)
console.log(`  P2 (priority 3): ${calculatePriorityScore(3)} (expected 30)`)
console.log(`  P3 (priority 2): ${calculatePriorityScore(2)} (expected 10)`)
console.log(`  Default: ${calculatePriorityScore(0)} (expected 5)\n`)

// Test 3: Cognitive load penalty
console.log('🧠 Test 3: Cognitive Load Penalty')
console.log(`  Load 1: ${calculateCognitiveLoadPenalty(1)} (expected 2)`)
console.log(`  Load 3: ${calculateCognitiveLoadPenalty(3)} (expected 6)`)
console.log(`  Load 5: ${calculateCognitiveLoadPenalty(5)} (expected 10)`)
console.log(`  Load "3/5": ${calculateCognitiveLoadPenalty('3/5')} (expected 6)\n`)

// Test 4: Postpone bonus
console.log('⏭️ Test 4: Postpone Bonus')
console.log(`  0 postpones: ${calculatePostponeBonus(0)} (expected 0)`)
console.log(`  3 postpones: ${calculatePostponeBonus(3)} (expected 15)`)
console.log(`  5 postpones: ${calculatePostponeBonus(5)} (expected 25)\n`)

// Test 5: Complete task scoring - Scenario 1
console.log('🎯 Test 5: Scenario 1 - Same deadline, different priorities')
const taskA = {
  id: 'a',
  due_date: in3Hours,
  priority: 4, // P1
  cognitive_load: 3,
  postpone_count: 0
}
const taskB = {
  id: 'b',
  due_date: in3Hours,
  priority: 3, // P2
  cognitive_load: 3,
  postpone_count: 0
}
const scoreA = calculateTaskScore(taskA)
const scoreB = calculateTaskScore(taskB)
console.log(`  Task A (P1): ${scoreA.total} (expected 124)`)
console.log(`    Breakdown: deadline=${scoreA.breakdown.deadline}, priority=${scoreA.breakdown.priority}, cogLoad=${scoreA.breakdown.cognitiveLoad}, postpone=${scoreA.breakdown.postpone}`)
console.log(`  Task B (P2): ${scoreB.total} (expected 104)`)
console.log(`    Breakdown: deadline=${scoreB.breakdown.deadline}, priority=${scoreB.breakdown.priority}, cogLoad=${scoreB.breakdown.cognitiveLoad}, postpone=${scoreB.breakdown.postpone}`)
console.log(`  ✅ Task A ranks higher: ${scoreA.total > scoreB.total}\n`)

// Test 6: Scenario 2 - Same priority & deadline, different cognitive load
console.log('🎯 Test 6: Scenario 2 - Same priority & deadline, different cognitive load')
const taskC = {
  id: 'c',
  due_date: in3Hours,
  priority: 4, // P1
  cognitive_load: 5,
  postpone_count: 0
}
const taskD = {
  id: 'd',
  due_date: in3Hours,
  priority: 4, // P1
  cognitive_load: 2,
  postpone_count: 0
}
const scoreC = calculateTaskScore(taskC)
const scoreD = calculateTaskScore(taskD)
console.log(`  Task C (CL 5/5): ${scoreC.total} (expected 120)`)
console.log(`    Breakdown: deadline=${scoreC.breakdown.deadline}, priority=${scoreC.breakdown.priority}, cogLoad=${scoreC.breakdown.cognitiveLoad}, postpone=${scoreC.breakdown.postpone}`)
console.log(`  Task D (CL 2/5): ${scoreD.total} (expected 126)`)
console.log(`    Breakdown: deadline=${scoreD.breakdown.deadline}, priority=${scoreD.breakdown.priority}, cogLoad=${scoreD.breakdown.cognitiveLoad}, postpone=${scoreD.breakdown.postpone}`)
console.log(`  ✅ Task D ranks higher (easier): ${scoreD.total > scoreC.total}\n`)

// Test 7: Scenario 3 - Postponed task gets boost
console.log('🎯 Test 7: Scenario 3 - Postponed task gets boost')
const taskE = {
  id: 'e',
  due_date: in5Hours,
  priority: 3, // P2
  cognitive_load: 3,
  postpone_count: 3
}
const taskF = {
  id: 'f',
  due_date: in3Hours,
  priority: 2, // P3
  cognitive_load: 2,
  postpone_count: 0
}
const scoreE = calculateTaskScore(taskE)
const scoreF = calculateTaskScore(taskF)
console.log(`  Task E (3 postpones): ${scoreE.total} (expected 99)`)
console.log(`    Breakdown: deadline=${scoreE.breakdown.deadline}, priority=${scoreE.breakdown.priority}, cogLoad=${scoreE.breakdown.cognitiveLoad}, postpone=${scoreE.breakdown.postpone}`)
console.log(`  Task F (0 postpones): ${scoreF.total} (expected 86)`)
console.log(`    Breakdown: deadline=${scoreF.breakdown.deadline}, priority=${scoreF.breakdown.priority}, cogLoad=${scoreF.breakdown.cognitiveLoad}, postpone=${scoreF.breakdown.postpone}`)
console.log(`  ✅ Task E ranks higher (postpone bonus): ${scoreE.total > scoreF.total}\n`)

console.log('✅ All tests completed!')
