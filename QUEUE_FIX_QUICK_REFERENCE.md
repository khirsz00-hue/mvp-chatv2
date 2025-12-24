# Queue Fix - Quick Reference Guide

## ✅ What Was Fixed

**Problem:** Queue showed "Brak zadań w kolejce" with 15 available tasks

**Solution:** All tasks now visible in intelligent categories

## 🎯 What You'll See Now

### With Your 15 Tasks (12 overdue, 2 today, 1 no date):

```
╔════════════════════════════════════════════════════════════╗
║  ⚠️  PRZETERMINOWANE (12 zadań)                          ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  #1  Old Task 1    [2025-12-10]  14 dni temu             ║
║  #2  Old Task 2    [2025-12-15]   9 dni temu             ║
║  ... (10 more)                                            ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║  📊  Kolejka NA DZIŚ (Top 3) - 2 zadania                 ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  Zadania zaplanowane na dzisiaj (2025-12-24)             ║
║                                                            ║
║  #1  ZenON 30min                   [30 min] [Load 3]     ║
║  #2  Re: Fwd: Lokalizacje          [20 min] [Load 2]     ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║  🗓️  DOSTĘPNE DO ZAPLANOWANIA (1 zadanie)      [Click ▼] ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  Zadania bez terminu - możesz zrobić dziś jeśli chcesz   ║
║                                                            ║
║  •  Task without date              [15 min] [Load 2]     ║
╚════════════════════════════════════════════════════════════╝
```

## 🎨 Color Guide

| Section | Border Color | Background | Purpose |
|---------|-------------|------------|---------|
| ⚠️ PRZETERMINOWANE | Red | Light red | Overdue - urgent attention needed |
| 📌 MUST | Purple | Light purple | Pinned tasks - must do today (max 3) |
| 📊 Kolejka NA DZIŚ | Purple gradient | White | Top 3 tasks for today |
| 📋 Pozostałe na dziś | Gray | Light gray | Rest of today's tasks (collapsible) |
| 🗓️ DOSTĘPNE | Blue | Light blue | No date or future (collapsible) |
| 📋 Na później | Blue | Light blue | Capacity overflow (collapsible) |

## 🔍 Console Debug Info

Open browser console (F12) to see detailed logs:

```javascript
📊 [Queue Debug] {
  totalTasks: 15,          // All tasks in DB
  filteredTasks: 15,       // After context/mode filtering
  scoredTasks: 15,         // After scoring
  overdueTasks: 12,        // ⚠️ Red section
  mustTasks: 0,            // 📌 Purple section
  todayTasks: 2,           // 📊 Purple gradient section
  availableTasks: 1,       // 🗓️ Blue section
  nonOverdueTasks: 3,      // All non-overdue
  queueTasks: 3,           // Fit in available time
  laterTasks: 0,           // Don't fit (overflow)
  availableMinutes: 480,   // Work time left today
  usedMinutes: 90          // Time used by queue
}
```

## 📱 Interactive Features

1. **Click section headers** to expand/collapse:
   - 📋 Pozostałe na dziś
   - 🗓️ DOSTĘPNE DO ZAPLANOWANIA
   - 📋 Na później

2. **Empty state** only shows when ALL categories are truly empty

3. **Work modes** (Low Focus, Quick Wins) still filter correctly

## ⚙️ How Categorization Works

```
1️⃣  Filter by context & work mode
    ↓
2️⃣  Apply scoring algorithm
    ↓
3️⃣  Split into categories:
    ├─ Overdue: due_date < today
    ├─ MUST: is_must = true
    ├─ Today: due_date = today (non-MUST)
    └─ Available: no date OR future
```

## 🎯 Queue Positions

Tasks are numbered in order:

```
MUST tasks:         #1, #2, #3
Today tasks:        #4, #5, #6, ...
Available tasks:    #(after all today tasks)
```

## 🧪 Testing Steps

1. ✅ **Open the app** - all 15 tasks should be visible
2. ✅ **Check console** - verify counts match
3. ✅ **Test collapsible** - click blue/gray section headers
4. ✅ **Work modes** - try Low Focus/Quick Wins filters
5. ✅ **Complete task** - verify it disappears from sections

## 🐛 Troubleshooting

### "Still seeing empty queue"

**Check console logs:**
- If `filteredTasks: 0` → work mode is filtering all tasks
- If `scoredTasks: 0` → scoring issue
- If all categories show `0` → tasks are completed or filtered

**Solutions:**
- Switch work mode to "Focus" (default)
- Check context filter (set to "all")
- Verify tasks aren't all completed

### "Tasks in wrong section"

**Check task properties:**
- Overdue: `due_date` < today
- Today: `due_date` = today
- Available: no `due_date` OR `due_date` > today

### "Missing tasks after work mode change"

**Expected behavior:**
- Low Focus: only shows tasks with `cognitive_load ≤ 2`
- Quick Wins: only shows tasks with `estimate_min ≤ 20`
- Solution: Switch back to "Focus" mode to see all tasks

## 📞 Support

If issues persist:
1. Share console logs (📊 [Queue Debug] section)
2. Share which tasks are missing
3. Share which work mode is active
4. Share task properties (due_date, is_must, cognitive_load)

## 🎉 Success Criteria

✅ All tasks visible across sections
✅ Correct categorization (overdue, today, available)
✅ Collapsible sections work
✅ Empty state only when NO tasks
✅ Work modes filter correctly
✅ Queue positions are logical

## 📚 See Also

- `QUEUE_FIX_IMPLEMENTATION.md` - Full technical documentation
- `QUEUE_FIX_DATAFLOW.md` - Visual data flow diagram
