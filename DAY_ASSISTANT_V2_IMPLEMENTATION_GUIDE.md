# Day Assistant V2 Complete Overhaul - Implementation Guide

## 🎉 What's Been Built

This PR implements the foundational components and algorithms for the Day Assistant V2 complete overhaul, including:

- ✅ **New task card components** with comprehensive badges
- ✅ **Work Mode system** (Low Focus / Standard / HyperFocus)
- ✅ **Context filtering** with project-based detection
- ✅ **Scoring Algorithm V3** with cognitive load matching
- ✅ **Timer sessions** with database persistence
- ✅ **Todoist sync improvements** for C1/C2/C3 labels and context inference

## 📦 New Components

### Task Card Components
- `DayAssistantV2TaskCard.tsx` - Main task card with all badges
- `DayAssistantV2TaskBadges.tsx` - Individual badge components:
  - PositionBadge (#1, #2, etc.)
  - MustBadge (📌 MUST)
  - PriorityBadge (P1-P4)
  - DeadlineBadge (⏰ Dziś, 📅 Jutro, etc.)
  - CognitiveLoadBadge (🧠 3/5)
  - DurationBadge (⏱ 30m)
  - ContextBadge (📁 KAMPANIE with ✨ for AI-inferred)
  - PostponeAlertBanner (⚠️ warning at 3+ postpones)
- `DayAssistantV2TaskMenu.tsx` - Context menu (⋮) with all actions
- `DayAssistantV2TaskTooltip.tsx` - Score breakdown tooltip

### UI Components
- `DayAssistantV2WorkModeSelector.tsx` - Work mode buttons
- `DayAssistantV2ContextFilter.tsx` - Context dropdown filter

### Hooks & Services
- `hooks/useTimeSessions.ts` - Timer with database persistence
- `lib/services/aiContextInference.ts` - AI context detection
- `lib/services/dayAssistantV2RecommendationEngine.ts` - Updated with V3 scoring

### Database
- `supabase/migrations/20251228_time_sessions.sql` - Time sessions table

## 🧮 Scoring Algorithm V3

The new scoring algorithm in `calculateTaskScoreV3()` uses these weights:

| Factor | Points | Condition |
|--------|--------|-----------|
| MUST | +50 | `is_must = true` |
| Priority P1 | +30 | `priority = 4` |
| Priority P2 | +20 | `priority = 3` |
| Priority P3 | +10 | `priority = 2` |
| Priority P4 | +5 | `priority = 1` |
| Overdue | +40 | `due_date < todayDate` |
| Due today | +30 | `due_date = todayDate` |
| Due tomorrow | +20 | `due_date = todayDate + 1` |
| Due 2-7 days | +10 | `2 ≤ daysUntil ≤ 7` |
| Cognitive match (Low Focus) | +15 | `cognitive_load < 3` AND `workMode = 'low_focus'` |
| Cognitive match (HyperFocus) | +15 | `cognitive_load > 3` AND `workMode = 'hyperfocus'` |
| Context match | +10 | `context_type = contextFilter` |
| Short task (Standard) | +5 | `estimate_min ≤ 40` AND `workMode = 'standard'` |
| Long task penalty | -10 | `estimate_min > 90` |
| Postponed | -5 × count | `postpone_count` |

**Key Features:**
- Generates reasoning array for tooltip display
- Filters tasks by work mode BEFORE scoring
- Sorts MUST tasks to top regardless of score

## 🔄 Todoist Sync Updates

The sync now:
1. **Fetches projects** from Todoist API
2. **Uses project name** as context_type (Priority #1)
3. **Falls back to labels** (admin, komunikacja, prywatne, code)
4. **Uses AI inference** when no project/labels exist
5. **Marks AI-inferred contexts** in `metadata.ai_inferred_context`
6. **Parses C1/C2/C3 labels** correctly (already working)

## ⏱️ Timer System

The new `useTimeSessions` hook:
- **Saves to database** (`time_sessions` table)
- **Syncs across tabs** via localStorage + events
- **Tracks session type** (manual or pomodoro)
- **Stores task info** (id, title, source)
- **Calculates duration** on stop

## 🚀 Integration Steps

### Step 1: Database Migration

Run the migration to create the `time_sessions` table:

```bash
# Apply migration
psql $DATABASE_URL -f supabase/migrations/20251228_time_sessions.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

### Step 2: Update DayAssistantV2View.tsx

Add these imports:

```typescript
import { DayAssistantV2TaskCard } from './DayAssistantV2TaskCard'
import { DayAssistantV2ContextFilter } from './DayAssistantV2ContextFilter'
import { DayAssistantV2WorkModeSelector } from './DayAssistantV2WorkModeSelector'
import { scoreAndSortTasksV3 } from '@/lib/services/dayAssistantV2RecommendationEngine'
import { useTimeSessions } from '@/hooks/useTimeSessions'
```

Add state for context filter:

```typescript
const [contextFilter, setContextFilter] = useState<string | null>(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('day_assistant_v2_context_filter')
  }
  return null
})

// Persist context filter
useEffect(() => {
  if (contextFilter) {
    localStorage.setItem('day_assistant_v2_context_filter', contextFilter)
  } else {
    localStorage.removeItem('day_assistant_v2_context_filter')
  }
}, [contextFilter])
```

Update work mode to use 'standard' instead of 'focus':

```typescript
// Change this:
const [workMode, setWorkMode] = useState<WorkMode>('focus')

// To this:
const [workMode, setWorkMode] = useState<WorkMode>('standard')
```

Replace scoring with V3:

```typescript
// Find the useScoredTasks or similar scoring logic and replace with:
const scoredTasks = useMemo(() => {
  if (!dayPlan) return []
  return scoreAndSortTasksV3(tasks, dayPlan, selectedDate, contextFilter)
}, [tasks, dayPlan, selectedDate, contextFilter])
```

Get unique contexts for filter:

```typescript
const uniqueContexts = useMemo(() => {
  const contexts = tasks
    .map(t => t.context_type)
    .filter((c): c is string => !!c)
  return Array.from(new Set(contexts))
}, [tasks])
```

Add context filter to UI (near WorkModeSelector):

```tsx
<div className="flex gap-4 mb-6">
  <DayAssistantV2WorkModeSelector
    currentMode={workMode}
    onChange={setWorkMode}
  />
  
  <DayAssistantV2ContextFilter
    contexts={uniqueContexts}
    selected={contextFilter}
    onChange={setContextFilter}
  />
</div>
```

Replace TaskRow with DayAssistantV2TaskCard:

```tsx
{scoredTasks.map((task, index) => (
  <DayAssistantV2TaskCard
    key={task.id}
    task={task}
    queuePosition={index + 1}
    onStartTimer={handleStartTimer}
    onComplete={() => completeTaskMutation.mutate(task.id)}
    onHelp={() => setHelpMeTask(task)}
    onPin={() => pinTaskMutation.mutate(task.id)}
    onPostpone={() => postponeTaskMutation.mutate(task.id)}
    onDelete={() => deleteTaskMutation.mutate(task.id)}
    onOpenDetails={() => setSelectedTask(task)}
  />
))}
```

Update handleStartTimer to use new hook:

```typescript
const handleStartTimer = async (taskId: string) => {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return
  
  // Use the new timer hook
  const { startSession } = useTimeSessions(
    taskId, 
    'day_assistant_v2', 
    task.title
  )
  
  try {
    await startSession('manual')
    toast.success('Timer started!')
  } catch (error) {
    console.error('Failed to start timer:', error)
    toast.error('Failed to start timer')
  }
}
```

### Step 3: Clean Up Old Components

Consider removing or deprecating:
- `EnergyFocusControls` component (if exists)
- Old energy/focus slider references
- Consolidate `WorkModeSelector.tsx` with new version if needed

### Step 4: Update Work Mode in DayPlan

Ensure `day_assistant_v2_plan.metadata` stores work mode:

```typescript
// When updating day plan:
await supabase
  .from('test_day_plan')
  .update({
    metadata: {
      ...dayPlan.metadata,
      work_mode: workMode  // 'low_focus', 'standard', or 'hyperfocus'
    }
  })
  .eq('id', dayPlan.id)
```

## 🧪 Testing Checklist

### Visual Testing
- [ ] Task cards display all badges correctly
- [ ] Position badge shows queue number
- [ ] MUST badge appears for pinned tasks
- [ ] Priority badges have correct colors (P1=red, P2=orange, P3=blue, P4=gray)
- [ ] Deadline badges show correct format (Dziś, Jutro, Za Xd, Przeterminowane)
- [ ] Cognitive load badge shows 1-5 scale
- [ ] Duration badge formats time correctly (30m, 1h 30m)
- [ ] Context badge shows project name
- [ ] ✨ sparkle appears for AI-inferred contexts
- [ ] Postpone alert shows at 3+ postpones
- [ ] Context menu opens with all actions
- [ ] Tooltip shows score breakdown on hover

### Functional Testing
- [ ] Work mode Low Focus filters to cognitive < 3
- [ ] Work mode HyperFocus filters to cognitive > 3
- [ ] Work mode Standard shows all tasks
- [ ] Context filter shows unique contexts
- [ ] Context filter persists in localStorage
- [ ] Filtering by context gives +10 score bonus
- [ ] Scoring V3 produces correct scores
- [ ] MUST tasks stay at top regardless of score
- [ ] Timer starts and saves to database
- [ ] Timer syncs across browser tabs
- [ ] Timer calculates duration on stop

### Integration Testing
- [ ] Todoist sync uses project names for context
- [ ] Todoist sync parses C1/C2/C3 labels
- [ ] AI context inference triggers when no project
- [ ] AI-inferred flag saves to metadata
- [ ] Queue sections render correctly (MUST, TOP 3, etc.)
- [ ] All mutations work (complete, pin, postpone, delete)
- [ ] Help modal opens correctly

### Mobile Testing
- [ ] Cards are responsive on mobile
- [ ] Badges wrap properly
- [ ] Context menu is usable on touch
- [ ] Work mode selector works on mobile

## 🐛 Known Issues & Limitations

1. **Old WorkModeSelector exists**: There's an existing `WorkModeSelector.tsx` that uses 'focus' and 'quick_wins'. The new one uses 'standard' and 'hyperfocus'. They need to be consolidated.

2. **Type definitions**: `TestDayTask.metadata` should explicitly type these fields:
   ```typescript
   metadata: {
     _score?: number
     _scoreReasoning?: string[]
     ai_inferred_context?: boolean
     ai_understanding?: string
     [key: string]: any
   }
   ```

3. **Work mode mapping**: The requirement specifies 3 modes (Low Focus, Standard, HyperFocus), but the existing system has different modes. Need to ensure consistency.

4. **Timer integration**: The existing `useTaskTimer` hook is localStorage-only. The new `useTimeSessions` needs to be integrated without breaking existing timer functionality.

## 📚 Additional Documentation

### Badge Styling
All badges use Tailwind CSS classes and are mobile-responsive. Colors follow the design system:
- Purple: `#8B5CF6` (brand)
- Red: `#EF4444` (urgent/must)
- Orange: `#F97316` (high priority)
- Blue: `#3B82F6` (medium priority)
- Gray: `#6B7280` (low priority)
- Green: `#10B981` (success)

### Work Mode Descriptions
- **Low Focus** (🔴): Shows only easy tasks (cognitive load < 3). Best when tired or low energy.
- **Standard** (🟡): Shows all tasks, prioritizes by deadline and priority. Normal work mode.
- **HyperFocus** (⚡): Shows only complex tasks (cognitive load > 3). Best when energized and focused.

### Context Types
The system supports these context types:
- `IT` - Technology work
- `KAMPANIE` - Campaign/marketing work
- `PRYWATNE` - Personal tasks
- `SPOTKANIA` - Meetings
- `code` - Deep coding work
- `deep_work` - Focus-intensive work
- `maintenance` - Maintenance and upkeep
- `communication` - Communication tasks

## 🎯 Next Steps

After integrating these components, consider:

1. **Capacity management**: Enhance the capacity calculation to use work mode preferences
2. **Break recommendations**: Integrate break suggestions based on cognitive load
3. **Analytics**: Add tracking for work mode usage and effectiveness
4. **AI understanding**: Implement AI task understanding and store in metadata
5. **Smart scheduling**: Use scoring to suggest optimal task order throughout the day

## 💬 Support

For questions or issues:
- Check the component source code for inline documentation
- Review the types in `lib/types/dayAssistantV2.ts`
- Test with example tasks that have different properties
- Use browser dev tools to inspect localStorage and database calls
