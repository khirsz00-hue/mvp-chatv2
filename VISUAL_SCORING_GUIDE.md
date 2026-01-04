# Advanced Task Scoring - Visual Examples

## Visual Score Breakdown

This document shows how tasks are scored with visual representations.

### Example 1: Overdue Task (Highest Priority)

```
Task: "Fix critical bug"
- Due: Yesterday (OVERDUE)
- Priority: P2
- Cognitive Load: 4/5
- Postpone Count: 0

┌─────────────────────────────────────────┐
│ SCORE BREAKDOWN                         │
├─────────────────────────────────────────┤
│ 🔴 Deadline (Overdue):         +150    │
│ 🚩 Priority (P2):              +30     │
│ 🧠 Cognitive Load (4/5):       -8      │
│ ⏭️  Postpone Bonus:             +0      │
├─────────────────────────────────────────┤
│ 📊 TOTAL SCORE:                172     │
└─────────────────────────────────────────┘

Result: ⚠️ HIGHEST PRIORITY - Will appear at top of queue
```

### Example 2: Urgent Task (Due Soon)

```
Task: "Submit report"
- Due: In 1 hour
- Priority: P1
- Cognitive Load: 2/5
- Postpone Count: 0

┌─────────────────────────────────────────┐
│ SCORE BREAKDOWN                         │
├─────────────────────────────────────────┤
│ ⏰ Deadline (< 2h):            +100    │
│ 🚩 Priority (P1):              +50     │
│ 🧠 Cognitive Load (2/5):       -4      │
│ ⏭️  Postpone Bonus:             +0      │
├─────────────────────────────────────────┤
│ 📊 TOTAL SCORE:                146     │
└─────────────────────────────────────────┘

Result: 🔥 URGENT - Appears near top
```

### Example 3: Postponed Task Gets Boost

```
Task: "Update documentation"
- Due: In 2 days
- Priority: P3
- Cognitive Load: 1/5 (Easy!)
- Postpone Count: 5

┌─────────────────────────────────────────┐
│ SCORE BREAKDOWN                         │
├─────────────────────────────────────────┤
│ 📅 Deadline (2-7 days):        +15     │
│ 🚩 Priority (P3):              +10     │
│ 🧠 Cognitive Load (1/5):       -2      │
│ ⏭️  Postpone Bonus (5x):        +25     │
├─────────────────────────────────────────┤
│ 📊 TOTAL SCORE:                48      │
└─────────────────────────────────────────┘

Result: ⚡ BOOSTED - Postpone bonus prevents eternal procrastination
```

### Example 4: Easy Task Preferred

When two tasks have similar deadlines and priorities, the easier one wins:

```
Task A: "Review PR"              Task B: "Refactor legacy code"
- Due: In 3 hours               - Due: In 3 hours
- Priority: P1                  - Priority: P1
- Cognitive Load: 2/5 (Easy)    - Cognitive Load: 5/5 (Hard)
- Postpone Count: 0             - Postpone Count: 0

Score A: 80+50-4+0 = 126 ✅      Score B: 80+50-10+0 = 120

Result: Task A ranks higher (easier task builds momentum!)
```

## Score Ranges

### 🔴 Critical (150+)
- Overdue tasks
- Tasks due in < 2 hours with high priority

### 🟠 Urgent (100-149)
- Tasks due soon (2-4 hours)
- High priority tasks due today

### 🟡 Important (50-99)
- Tasks due today
- Medium priority with deadlines
- Postponed tasks (bonus helps)

### 🟢 Normal (0-49)
- Future tasks
- Low priority
- No deadline

## Practical Impact

### Before (Old System)
```
Queue:
1. Task A (Deadline tomorrow, P2) - Score: 50
2. Task B (Deadline in 3 hours, P3) - Score: 45
3. Task C (Deadline today, postponed 3x, P3) - Score: 35 (penalty!)
```

### After (New System)
```
Queue:
1. Task B (Deadline in 3 hours, P3) - Score: 86 ⚡
2. Task C (Deadline today, postponed 3x, P3) - Score: 75 (bonus!) ⚡
3. Task A (Deadline tomorrow, P2) - Score: 60
```

**Key Improvement**: 
- Task B now correctly appears first (more urgent)
- Task C gets bonus for being postponed (prevents eternal postponement)
- More granular scoring allows better prioritization

## Tips for Users

### 🎯 To boost a task's priority:
1. ✅ Set closer deadline
2. ✅ Increase priority (P1 > P2 > P3)
3. ✅ Reduce cognitive load (make it easier)
4. ⚠️  Postponing increases score BUT don't rely on it!

### 🧠 Cognitive Load Guide:
- **1/5**: Quick admin tasks, simple updates
- **2/5**: Standard tasks, routine work
- **3/5**: Tasks requiring focus, moderate complexity
- **4/5**: Complex problem-solving, deep work
- **5/5**: Major features, architecture decisions

### ⏰ Deadline Strategy:
- Use time-specific deadlines (not just dates)
- "Due at 2:00 PM" > "Due today"
- System checks hours, not just days
- Overdue tasks ALWAYS appear at top

## Common Scenarios

### "Why is this easy task ranked so high?"
✅ Easy tasks (low cognitive load) get ranked higher when priorities are equal
✅ This builds momentum and reduces decision fatigue

### "I keep postponing this task - why is it still low?"
✅ Each postponement adds +5 bonus points
✅ After 3 postponements = +15 bonus
✅ Eventually it will rank high enough to do

### "This task is overdue but not urgent"
⚠️  System doesn't know that - overdue = highest priority
💡 Tip: Update the deadline if it's not actually urgent

### "How do I see the score breakdown?"
🔍 Hover over tasks in the UI to see reasoning
📊 Console logs show detailed score breakdowns
