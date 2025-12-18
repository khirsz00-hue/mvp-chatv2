# Day Assistant v2 Architecture

**Status:** ✅ Active Version  
**Last Updated:** 2025-12-18

## Overview

Day Assistant v2 is an ADHD-friendly day planner that helps users manage their tasks with dual sliders (energy/focus), soft warnings, undo functionality, and intelligent recommendations.

---

## Architecture

### Frontend

**Main Component:** `components/day-assistant-v2/DayAssistantV2View.tsx`

**Routing:**
- Primary entry: `/app/day-assistant-v2/page.tsx` (redirects to main layout with v2 active)
- Navigation: Handled via Sidebar in MainLayout with `activeView: 'day-assistant-v2'`

**Key Features:**
- Dual sliders for energy (1-5) and focus (1-5) levels
- Task filtering by context type (code, admin, komunikacja, prywatne)
- MUST task tracking (max 1-3 per day)
- Postpone tracking with warnings
- Undo functionality (configurable window)
- Real-time Todoist sync every 10 seconds

---

### Backend API

**Base Path:** `app/api/day-assistant-v2/`

#### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/dayplan` | GET | Fetch day plan, tasks, and proposals for a specific date |
| `/dayplan` | POST | Update day plan (energy/focus sliders) |
| `/task` | POST | Create a new task |
| `/task` | PUT | Update task (complete, edit, etc.) |
| `/postpone` | POST | Move task(s) to tomorrow |
| `/proposal` | POST | Accept or reject AI recommendations |
| `/undo` | POST | Undo last action within window |
| `/init` | GET/POST | Initialize assistant and day plan |

#### Todoist Integration

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/todoist/sync` | POST | Sync Todoist tasks to Supabase |

**Sync Strategy:**
- Cache-aware: only syncs if >10 seconds since last sync
- Bidirectional: syncs tasks from Todoist to `test_day_assistant_tasks`
- Handles: create, update, delete operations
- Auto-creates 'asystent dnia v2' assistant if missing

---

### Database Schema

**Core Tables:**

#### `assistant_config`
Stores assistant configurations for each user.

```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users
name            TEXT (e.g., 'asystent dnia v2')
type            TEXT (day_planner, week_planner, journal, decision)
settings        JSONB (undo_window, max_postpones, etc.)
is_active       BOOLEAN
created_at      TIMESTAMP
updated_at      TIMESTAMP
UNIQUE(user_id, name)
```

**Important:** The assistant name **must** be exactly `'asystent dnia v2'` for v2 functionality.

#### `test_day_assistant_tasks`
Main task table with ADHD-friendly metadata.

```sql
id                UUID PRIMARY KEY
user_id           UUID REFERENCES auth.users
assistant_id      UUID REFERENCES assistant_config (FK enforced)
todoist_id        TEXT (Todoist task reference)
todoist_task_id   TEXT (legacy, same as todoist_id)
title             TEXT
description       TEXT
priority          INTEGER (1-4, Todoist priority)
is_must           BOOLEAN (MUST task flag)
is_important      BOOLEAN
estimate_min      INTEGER (estimated duration)
cognitive_load    INTEGER (1-5: light to heavy)
tags              TEXT[]
context_type      TEXT (code, admin, komunikacja, prywatne)
due_date          DATE
completed         BOOLEAN
completed_at      TIMESTAMP
position          INTEGER (ordering)
postpone_count    INTEGER (tracks how many times postponed)
moved_from_date   DATE
moved_reason      TEXT
last_moved_at     TIMESTAMP
auto_moved        BOOLEAN
metadata          JSONB
synced_at         TIMESTAMPTZ
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

**Indexes:**
- `idx_test_day_tasks_user_assistant` on (user_id, assistant_id)
- `idx_test_day_tasks_due` on (due_date)
- `idx_test_day_tasks_must` on (is_must) WHERE is_must = TRUE
- `idx_tasks_todoist_id` on (todoist_id)
- `idx_tasks_user_assistant_todoist` UNIQUE on (user_id, assistant_id, todoist_id) WHERE todoist_id IS NOT NULL

#### `test_day_plan`
Daily plan with energy/focus levels and timeline blocks.

```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users
assistant_id    UUID REFERENCES assistant_config
plan_date       DATE
energy          INTEGER (1-5)
focus           INTEGER (1-5)
blocks          JSONB (timeline blocks array)
metadata        JSONB
created_at      TIMESTAMP
updated_at      TIMESTAMP
UNIQUE(user_id, assistant_id, plan_date)
```

#### `test_day_proposals`
AI-generated recommendations with alternatives.

```sql
id                UUID PRIMARY KEY
user_id           UUID REFERENCES auth.users
assistant_id      UUID REFERENCES assistant_config
plan_date         DATE
reason            TEXT (AI explanation)
primary_action    JSONB (recommended action)
alternatives      JSONB (alternative options)
status            TEXT (pending, accepted, rejected, expired)
created_at        TIMESTAMP
expires_at        TIMESTAMP
responded_at      TIMESTAMP
```

#### `test_day_decision_log`
Audit trail of all user decisions for ML learning.

```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users
assistant_id    UUID REFERENCES assistant_config
task_id         UUID REFERENCES test_day_assistant_tasks
action          TEXT (postpone, unmark_must, accept_proposal, etc.)
from_date       DATE
to_date         DATE
reason          TEXT
context         JSONB (energy, focus, time_of_day, etc.)
timestamp       TIMESTAMP
```

#### `test_day_undo_history`
Short-term undo buffer (5-15 seconds).

```sql
id                      UUID PRIMARY KEY
user_id                 UUID REFERENCES auth.users
assistant_id            UUID REFERENCES assistant_config
decision_log_id         UUID REFERENCES test_day_decision_log
previous_state          JSONB (state snapshot)
undo_window_expires     TIMESTAMP
undone                  BOOLEAN
undone_at               TIMESTAMP
created_at              TIMESTAMP
```

#### `sync_metadata`
Tracks last sync timestamp for cache invalidation.

```sql
id                UUID PRIMARY KEY
user_id           UUID REFERENCES auth.users
sync_type         TEXT (e.g., 'todoist')
last_synced_at    TIMESTAMPTZ
task_count        INTEGER
created_at        TIMESTAMPTZ
UNIQUE(user_id, sync_type)
```

---

## Key Services

### `lib/services/dayAssistantV2Service.ts`

Core business logic:
- `getOrCreateDayAssistantV2(userId)` - Get or create assistant config
- `getOrCreateDayPlan(userId, assistantId, date)` - Get or create day plan
- `getTasks(userId, assistantId, options)` - Fetch tasks with filters
- `getActiveProposals(userId, assistantId, date)` - Fetch pending proposals
- `updateDayPlan(...)` - Update energy/focus sliders
- `createTask(...)` - Create new task
- `updateTask(...)` - Update existing task
- `postponeTask(...)` - Move task to tomorrow
- `logDecision(...)` - Record user decision
- `createUndoPoint(...)` - Save undo state
- `performUndo(...)` - Restore previous state

### `lib/services/dayAssistantV2RecommendationEngine.ts`

AI recommendation engine:
- `generateSliderChangeRecommendation(...)` - Suggest tasks based on energy/focus
- `checkLightTaskLimit(...)` - Warn when light task limit exceeded
- `generateUnmarkMustWarning(...)` - Warn when unmarking MUST task
- `checkPostponeLimit(...)` - Warn on excessive postpones

### `lib/todoistSync.ts`

Centralized Todoist synchronization:
- `syncTodoist(token)` - Trigger sync via API
- `startBackgroundSync(token, interval)` - Start periodic sync
- Global coordinator prevents duplicate syncs across components

---

## Data Flow

### Task Sync Flow

```
Todoist API
    ↓
/api/todoist/sync (POST)
    ↓
Fetch tasks from Todoist
    ↓
Get/Create 'asystent dnia v2' assistant
    ↓
Map Todoist tasks → test_day_assistant_tasks
    ↓
Upsert tasks (by todoist_id)
    ↓
Delete stale tasks (removed from Todoist)
    ↓
Update sync_metadata
```

### Day Plan Flow

```
User opens Day Assistant v2
    ↓
DayAssistantV2View.tsx
    ↓
GET /api/day-assistant-v2/dayplan?date=YYYY-MM-DD
    ↓
Get/Create assistant ('asystent dnia v2')
    ↓
Get/Create day_plan for date
    ↓
Fetch tasks (due today + manually added)
    ↓
Fetch active proposals
    ↓
Return: { assistant, dayPlan, tasks, proposals }
```

### User Action Flow (Example: Postpone Task)

```
User clicks "Jutro" button
    ↓
POST /api/day-assistant-v2/postpone
    ↓
Validate task belongs to user
    ↓
Log decision to test_day_decision_log
    ↓
Create undo point in test_day_undo_history
    ↓
Update task: due_date = tomorrow, postpone_count++
    ↓
Check if exceeds max_postpones
    ↓
Generate proposal if needed
    ↓
Return updated task + proposal (if any)
```

---

## Configuration

### Assistant Settings (JSONB)

```json
{
  "undo_window_seconds": 15,
  "max_postpones": 5,
  "morning_must_block": true,
  "light_task_limit_minutes": 120,
  "auto_decompose_threshold": 45
}
```

### Energy/Focus Presets

Defined in `lib/types/dayAssistantV2.ts`:

```typescript
export const ENERGY_FOCUS_PRESETS = {
  emergency: { energy: 1, focus: 1 },
  low_battery: { energy: 2, focus: 2 },
  coasting: { energy: 3, focus: 3 },
  productive: { energy: 4, focus: 4 },
  peak_flow: { energy: 5, focus: 5 }
}
```

---

## RLS (Row Level Security)

All tables have RLS enabled with policies:
- Users can only SELECT/INSERT/UPDATE/DELETE their own data
- Enforced via `auth.uid() = user_id`
- Foreign key constraints ensure data integrity

---

## Migration Strategy

### From v1 to v2

**Database Migration:** `supabase/migrations/20251218_cleanup_assistant_conflict.sql`

**Actions:**
1. Create 'asystent dnia v2' assistant for all users (if missing)
2. Fix assistant_id for all tasks in test_day_assistant_tasks
3. Add foreign key constraint on assistant_id
4. Mark old v1 assistants as inactive

**Frontend Changes:**
1. Sidebar now only shows "Asystent Dnia" (v2)
2. Old v1 components marked with @deprecated
3. MainLayout auto-redirects 'day-assistant' → 'day-assistant-v2'

---

## API Authentication

All API routes require:
```typescript
Authorization: Bearer <supabase_access_token>
```

Token obtained via:
```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session.access_token
```

---

## Troubleshooting

### "Asystent Dnia v2 shows 0 tasks"

**Possible causes:**
1. Tasks have wrong assistant_id → Run migration
2. Tasks have NULL due_date → Set due_date or use includeAllDates=true
3. RLS policy issue → Check user is authenticated
4. Todoist not synced → Check sync_metadata table

**Debug queries:**
```sql
-- Check assistant exists
SELECT * FROM assistant_config 
WHERE user_id = '<uuid>' AND name = 'asystent dnia v2';

-- Check tasks
SELECT id, title, assistant_id, due_date, todoist_id 
FROM test_day_assistant_tasks 
WHERE user_id = '<uuid>';

-- Check sync status
SELECT * FROM sync_metadata 
WHERE user_id = '<uuid>' AND sync_type = 'todoist';
```

### "Tasks not syncing from Todoist"

1. Check Todoist integration token exists
2. Check sync endpoint logs: `[Sync] ✅ Synced X tasks`
3. Verify assistant name is exactly 'asystent dnia v2'
4. Check sync_metadata.last_synced_at is updating

---

## Testing

### Manual Testing Checklist

- [ ] Todoist sync creates/updates/deletes tasks correctly
- [ ] Day plan loads with correct energy/focus
- [ ] Tasks appear in task list
- [ ] Can create manual task
- [ ] Can mark task as complete
- [ ] Can postpone task to tomorrow
- [ ] Undo works within window
- [ ] Proposals appear and can be accepted/rejected
- [ ] MUST task warnings work
- [ ] Light task limit warnings work

---

## Performance

### Caching Strategy

- Todoist sync: 10-second cache (via sync_metadata)
- Background sync: Global coordinator prevents duplicate requests
- API responses: No aggressive caching (real-time updates prioritized)

### Indexes

All critical queries are indexed:
- User + assistant lookups
- Date-based task queries  
- MUST task filters
- Todoist ID lookups

---

## Security

### Data Protection

- All tables have RLS enabled
- Users can only access their own data
- Foreign keys prevent orphaned records
- ON DELETE CASCADE handles cleanup

### Input Validation

- Task titles: required, max length enforced
- Energy/focus: validated 1-5 range
- Dates: ISO format validation
- Assistant ID: foreign key constraint

---

## Future Enhancements

### Planned Features

- [ ] Subtask decomposition (auto-break large tasks)
- [ ] Calendar integration (Google Calendar)
- [ ] Advanced AI recommendations (ML-based)
- [ ] Task templates
- [ ] Recurring tasks
- [ ] Team/shared tasks
- [ ] Mobile app

### Performance Optimizations

- [ ] Implement edge functions for sync
- [ ] Add Redis caching layer
- [ ] Batch API operations
- [ ] Optimize RLS policies

---

## References

- Main Component: `components/day-assistant-v2/DayAssistantV2View.tsx`
- API Routes: `app/api/day-assistant-v2/`
- Services: `lib/services/dayAssistantV2Service.ts`
- Types: `lib/types/dayAssistantV2.ts`
- Sync: `lib/todoistSync.ts`
- Migrations: `supabase/migrations/20251218_cleanup_assistant_conflict.sql`

---

## Support

For issues or questions:
1. Check console logs for `[DayAssistantV2]` and `[Sync]` messages
2. Verify database schema matches this documentation
3. Run migration if assistant_id issues persist
4. Check Vercel logs for API errors
