# Advanced Task Scoring System

## Overview

This scoring system prioritizes tasks in the Day Assistant V2 queue based on multiple weighted factors. The goal is to ensure the most urgent and important tasks appear at the top while preventing tasks from being perpetually postponed.

## Scoring Formula

```
final_score = deadline_score + priority_score - cognitive_load_penalty + postpone_bonus
```

## Components

### 1. Deadline Score (0-150 points)

The highest-weighted component. Calculated based on **hours** until the deadline (not just days).

| Time Until Deadline | Points | Description |
|---------------------|--------|-------------|
| Overdue (< 0h) | 150 | Highest priority |
| < 2 hours | 100 | Urgent - due very soon |
| 2-4 hours | 80 | Due today - near term |
| 4-8 hours | 60 | Due today - mid-term |
| 8-24 hours | 40 | Due today - later |
| 24-48 hours | 30 | Due tomorrow |
| 2-7 days | 15 | Due this week |
| > 7 days | 10 | Due later |
| No deadline | 10 | Lowest priority |

**Key Innovation**: Unlike the previous day-based system, this uses hour-based scoring for more precise urgency detection.

### 2. Priority Score (5-50 points)

Based on Todoist priority levels:

| Priority Level | Todoist Value | Points |
|----------------|---------------|--------|
| P1 (Highest) | 4 | 50 |
| P2 | 3 | 30 |
| P3 | 2 | 10 |
| P4 (Lowest) | 1 | 5 |

Also supports string format (`'P1'`, `'P2'`, `'P3'`).

### 3. Cognitive Load Penalty (-2 to -10 points)

**Subtracted** from the score to prioritize easier tasks when scores are equal.

Formula: `penalty = cognitive_load * 2`

| Cognitive Load | Penalty | Effect |
|----------------|---------|--------|
| 1/5 (Very easy) | -2 | Least penalty |
| 2/5 (Easy) | -4 | |
| 3/5 (Medium) | -6 | |
| 4/5 (Hard) | -8 | |
| 5/5 (Very hard) | -10 | Most penalty |

**Rationale**: When two tasks have similar deadlines and priorities, the easier task should be done first to build momentum.

### 4. Postpone Bonus (+5 per postponement)

**Added** to the score to prevent perpetual postponement.

Formula: `bonus = postpone_count * 5`

| Postpone Count | Bonus | Effect |
|----------------|-------|--------|
| 0 | +0 | No bonus |
| 1 | +5 | Small boost |
| 3 | +15 | Moderate boost |
| 5 | +25 | Significant boost |

**Key Innovation**: Unlike the old system which penalized postponed tasks (making them less likely to be done), this **rewards** them, ensuring they eventually get completed.

## Example Scenarios

### Scenario 1: Same Deadline, Different Priorities

**Task A**: Due in 3h, P1, CL 3/5, 0 postpones
```
Score = 80 + 50 - 6 + 0 = 124
```

**Task B**: Due in 3h, P2, CL 3/5, 0 postpones
```
Score = 80 + 30 - 6 + 0 = 104
```

**Result**: Task A ranks higher due to higher priority ✅

### Scenario 2: Same Priority & Deadline, Different Cognitive Load

**Task A**: Due in 3h, P1, CL 5/5, 0 postpones
```
Score = 80 + 50 - 10 + 0 = 120
```

**Task B**: Due in 3h, P1, CL 2/5, 0 postpones
```
Score = 80 + 50 - 4 + 0 = 126
```

**Result**: Task B ranks higher (easier task preferred) ✅

### Scenario 3: Postponed Task Gets Boost

**Task A**: Due in 5h, P2, CL 3/5, 3 postpones
```
Score = 60 + 30 - 6 + 15 = 99
```

**Task B**: Due in 3h, P3, CL 2/5, 0 postpones
```
Score = 80 + 10 - 4 + 0 = 86
```

**Result**: Task A ranks higher despite less urgent deadline (postpone bonus helps) ✅

### Scenario 4: Overdue Tasks Always on Top

**Task A**: Overdue, P4, CL 5/5, 0 postpones
```
Score = 150 + 5 - 10 + 0 = 145
```

**Task B**: Tomorrow, P1, CL 1/5, 5 postpones
```
Score = 30 + 50 - 2 + 25 = 103
```

**Result**: Overdue task ranks higher ✅

## Integration

### In Code

```typescript
import { calculateTaskScore, sortTasksByScore } from '@/lib/services/advancedTaskScoring'

// Calculate score for a single task
const scoreResult = calculateTaskScore(task)
console.log('Total score:', scoreResult.total)
console.log('Breakdown:', scoreResult.breakdown)

// Sort multiple tasks
const sortedTasks = sortTasksByScore(tasks)
```

### In Recommendation Engine

The scoring is integrated into `calculateTaskScoreV3` in `dayAssistantV2RecommendationEngine.ts`, which adds additional factors:
- MUST task bonus (+50)
- Work mode matching bonus (+15)
- Context filter bonus (+10)
- Short/long task adjustments (±5 to ±10)

## Key Differences from Previous System

| Aspect | Previous System | New System |
|--------|----------------|------------|
| Deadline | Day-based (0-40 points) | Hour-based (0-150 points) |
| Priority | P1=30, P2=20, P3=10 | P1=50, P2=30, P3=10 |
| Cognitive Load | Bonus for matching | Always penalty (easier preferred) |
| Postpone | Penalty (-5 per postpone) | **Bonus** (+5 per postpone) |
| Max Base Score | ~70 points | ~200+ points |

## Testing

Run the test suite:
```bash
node lib/services/__tests__/standalone-scoring-test.js
```

All scenarios from the problem statement are verified ✅

## Future Enhancements

Potential improvements:
1. Dynamic weights based on user behavior
2. Time-of-day adjustments (morning vs evening)
3. Energy level integration
4. Dependency chain scoring
5. Historical completion patterns
