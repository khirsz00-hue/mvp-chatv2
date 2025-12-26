# DEBUG Logging Guide

## Overview
This document explains the comprehensive debug logging that has been added to track insights and scoring system behavior.

---

## 🔍 Console Output Examples

### 1. **Successful Insight Generation**

When insights are generated successfully, you'll see:

```
🔍 [Insights Debug] ========== START ==========
🔍 [Insights Debug] Checking conditions: {
  queueLength: 5,
  dayPlanExists: true,
  tasksCount: 12,
  availableMinutes: 480,
  usedMinutes: 180,
  dismissedCount: 1
}
✅ [Insights Debug] Conditions met - generating insights...

📊 [Insights Debug] Queue composition:
  #1: {
    id: "task-123",
    title: "Review pull requests",
    context_type: "deep_work",
    cognitive_load: 4,
    estimate_min: 45,
    score: 68.45,
    hasReasoning: true
  }
  #2: {
    id: "task-456",
    title: "Write documentation",
    context_type: "deep_work",
    cognitive_load: 3,
    estimate_min: 30,
    score: 62.78,
    hasReasoning: true
  }
  #3: {
    id: "task-789",
    title: "Code review meeting",
    context_type: "deep_work",
    cognitive_load: 3,
    estimate_min: 25,
    score: 55.12,
    hasReasoning: true
  }

🔮 [Insight Engine] ========== GENERATE START ==========
🔮 [Insight Engine] Input: {
  queueLength: 5,
  allTasksLength: 12,
  context: { energy: 4, capacity: 480, usedTime: 180 }
}

🔮 [Insight Engine] Checking CONTEXT_PATTERN...
  ✅ Found context pattern: {
    count: 3,
    contextType: "deep_work",
    taskIds: ["task-123", "task-456", "task-789"],
    timeSaved: 30
  }

🔮 [Insight Engine] Checking ENERGY_OBSERVATION...
  ✅ Found energy observation: Dobre dopasowanie energii

🔮 [Insight Engine] Checking DEADLINE_WARNING...
  ❌ No deadline warnings

🔮 [Insight Engine] Checking QUICK_WINS...
  ❌ No quick wins detected

🔮 [Insight Engine] Checking LONG_TASK_ALERT...
  ❌ No long tasks

🔮 [Insight Engine] Checking OVERLOAD_WARNING...
  ❌ No overload

🔮 [Insight Engine] Checking FLOW_STATE_OPPORTUNITY...
  ✅ Found flow state opportunity

🔮 [Insight Engine] ========== GENERATE END ==========
🔮 [Insight Engine] Total insights generated: 3

💡 [Insights Debug] Generated insights:
  1. [CONTEXT_PATTERN] Seria zadań w tym samym kontekście
     Priority: medium
     Message: Kolejka zawiera 3 zadań "deep_work" pod rząd. Idealne do flow state - spróbuj je zrobić bez przerwy!
     Highlighted tasks: 3
  2. [ENERGY_OBSERVATION] Dobre dopasowanie energii
     Priority: low
     Message: Pierwsze 3 zadania mają średnie cognitive load 3.3, co dobrze pasuje do Twojej energii (4/5).
     Highlighted tasks: 3
  3. [FLOW_STATE_OPPORTUNITY] Okazja do flow state
     Priority: medium
     Message: Masz 3 zadań "deep_work" (1.7h total). Idealny blok do flow state!
     Highlighted tasks: 3

💡 [Insights Debug] Total generated: 3
✅ [Insights Debug] After filtering dismissed: 3
✅ [Insights Debug] State updated with 3 insights

🔍 [Insights Debug] ========== END ==========
```

---

### 2. **Scoring System Output**

When tasks are scored, you'll see:

```
🎯 [Scoring Debug] ========== START ==========
🎯 [Scoring Debug] Input: {
  tasksCount: 12,
  dayPlan: {
    energy: 4,
    focus: 3,
    workMode: "focused"
  },
  selectedDate: "2025-12-26"
}
✅ [Scoring Debug] Calculating scores for 12 tasks

📊 [Scoring Debug] Top scored tasks:
  #1. "Fix critical bug in payment system"
      Score: 75.50
      Reasoning: [
        "Priorytet P4: +20",
        "⏰ Deadline dziś: +22.5",
        "📌 Przypięty (MUST): +30",
        "⚡ Idealne dopasowanie energii (4/5): +15"
      ]
  #2. "Review pull requests"
      Score: 68.45
      Reasoning: [
        "Priorytet P3: +15",
        "📅 Deadline za 1d: +15",
        "⭐ Ważny: +15",
        "⚡ Dobre dopasowanie energii: +12",
        "🎭 Kontynuacja deep_work (0 pod rząd): +0 (flow state)"
      ]
  #3. "Write documentation"
      Score: 62.78
      Reasoning: [
        "Priorytet P3: +15",
        "⚡ Dobre dopasowanie energii: +12",
        "🎭 Kontynuacja deep_work (1 pod rząd): +5 (flow state)"
      ]

✅ [Scoring Debug] All scores are unique!

🎯 [Scoring Debug] ========== END ==========
```

---

### 3. **Duplicate Scores Detected (Problem Case)**

If scores are not unique, you'll see warnings:

```
🎯 [Scoring Debug] ========== START ==========
🎯 [Scoring Debug] Input: { tasksCount: 10, dayPlan: {...}, selectedDate: "2025-12-26" }
✅ [Scoring Debug] Calculating scores for 10 tasks

📊 [Scoring Debug] Top scored tasks:
  #1. "Task A"
      Score: 45.00
      Reasoning: ["Priorytet P1: +5", "MUST: +30", ...]
  #2. "Task B"
      Score: 45.00
      Reasoning: ["Priorytet P1: +5", "MUST: +30", ...]
  #3. "Task C"
      Score: 35.00
      Reasoning: [...]

⚠️ [Scoring Debug] DUPLICATE SCORES DETECTED!
  Unique scores: 3 / 10
  Score distribution: [45.00, 35.00, 25.00]
  Score 45.00 appears 4 times: ["Task A", "Task B", "Task D"]
  Score 35.00 appears 3 times: ["Task C", "Task E", "Task F"]

🎯 [Scoring Debug] ========== END ==========
```

---

### 4. **No Insights Generated (Empty Queue)**

When conditions aren't met:

```
🔍 [Insights Debug] ========== START ==========
🔍 [Insights Debug] Checking conditions: {
  queueLength: 0,
  dayPlanExists: true,
  tasksCount: 5,
  availableMinutes: 480,
  usedMinutes: 0,
  dismissedCount: 0
}
⚠️ [Insights Debug] Skipping - queue is empty
```

---

### 5. **No Day Plan**

When there's no day plan:

```
🔍 [Insights Debug] ========== START ==========
🔍 [Insights Debug] Checking conditions: {
  queueLength: 3,
  dayPlanExists: false,
  tasksCount: 5,
  availableMinutes: 0,
  usedMinutes: 0,
  dismissedCount: 0
}
⚠️ [Insights Debug] Skipping - no dayPlan
```

---

### 6. **Insights Filtered Out**

When insights are dismissed:

```
💡 [Insights Debug] Total generated: 5
✅ [Insights Debug] After filtering dismissed: 3
🚫 [Insights Debug] Filtered out: ["CONTEXT_PATTERN", "QUICK_WINS"]
✅ [Insights Debug] State updated with 3 insights
```

---

### 7. **Error During Insight Generation**

When an error occurs:

```
🔍 [Insights Debug] ========== START ==========
🔍 [Insights Debug] Checking conditions: {...}
✅ [Insights Debug] Conditions met - generating insights...
📊 [Insights Debug] Queue composition: [...]
❌ [Insights Debug] Error generating insights: Error: Cannot read property 'context_type' of undefined
    at detectContextPattern (passiveInsightEngine.ts:167)
    ...
🔍 [Insights Debug] ========== END ==========
```

---

## 🔎 How to Use This for Debugging

### Step 1: Check if insights are being generated
Look for: `🔮 [Insight Engine]` logs

### Step 2: Check if conditions are met
Look for: `✅ [Insights Debug] Conditions met`

### Step 3: Check queue composition
Look for: `📊 [Insights Debug] Queue composition`
- Verify tasks have scores
- Verify tasks have reasoning

### Step 4: Check if scores are unique
Look for: `⚠️ [Scoring Debug] DUPLICATE SCORES DETECTED!`

### Step 5: Check if insights are filtered
Look for: `🚫 [Insights Debug] Filtered out`

---

## 📋 Debugging Checklist

After deployment, check console for:

- [ ] ✅ Are insights being generated? (look for `🔮 [Insight Engine]`)
- [ ] ✅ Are conditions met? (look for `✅ [Insights Debug] Conditions met`)
- [ ] ✅ Are insights filtered out? (look for `🚫 [Insights Debug] Filtered out`)
- [ ] ⚠️ Are scores unique? (look for `⚠️ DUPLICATE SCORES`)
- [ ] 📊 What's the queue composition? (look for `📊 [Insights Debug] Queue composition`)
- [ ] 🎯 Are scores being calculated? (look for `🎯 [Scoring Debug]`)
- [ ] 💡 How many insights were generated? (look for `💡 [Insights Debug] Total generated`)

---

## 🎨 Emoji Legend

- 🔍 = Debug/Investigation
- ✅ = Success
- ❌ = Not found/Error
- ⚠️ = Warning
- 📊 = Data/Statistics
- 💡 = Insights
- 🎯 = Scoring
- 🔮 = Insight Engine
- 🚫 = Filtered out
- 🎭 = Context
- ⚡ = Energy
- 📌 = Must/Pinned
- ⭐ = Important
- ⏰ = Deadline

---

## 🔧 Modified Files

1. **`components/day-assistant-v2/DayAssistantV2View.tsx`** (lines 546-619)
   - Added comprehensive insight generation logging
   - Logs conditions, queue composition, generated insights, and filtering

2. **`hooks/useScoredTasks.ts`** (entire file)
   - Added scoring input/output logging
   - Detects and warns about duplicate scores
   - Shows top scored tasks with reasoning

3. **`lib/services/passiveInsightEngine.ts`** (lines 39-200)
   - Added logging for each insight type check
   - Shows which insights are found vs not found
   - Logs entry/exit of insight generation

---

## 🎯 Expected Benefits

1. **Full Visibility**: See exactly what's happening in the insights and scoring system
2. **Problem Detection**: Quickly identify if insights aren't being generated or scores are duplicated
3. **Debugging Aid**: Understand why features aren't showing up in production
4. **Performance Insights**: See how many tasks are being scored and how many insights are generated
5. **Filter Transparency**: See which insights are being filtered out and why

---

This gives us **FULL VISIBILITY** into what's happening!
