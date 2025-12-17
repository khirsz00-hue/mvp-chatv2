# Test Day Assistant (asystent dnia test)

## Overview

The **Test Day Assistant** is a new, independent ADHD-friendly day planner with advanced features including dual sliders (energy & focus), soft warnings, undo mechanisms, decision logging, and live replanning.

## ✅ Implementation Status

### Core Components Created

1. **Database Schema** (`supabase/migrations/20251217_test_day_assistant.sql`)
   - `assistant_config` - Assistant configuration with customizable settings
   - `test_day_assistant_tasks` - Tasks with ADHD-friendly postpone tracking
   - `test_day_plan` - Daily plans with energy/focus sliders
   - `test_day_proposals` - AI recommendations with alternatives
   - `test_day_decision_log` - Complete audit log of user decisions
   - `test_day_undo_history` - Short-term undo window (5-15s)
   - `test_day_subtasks` - Task decomposition support

2. **TypeScript Types** (`lib/types/testDayAssistant.ts`)
   - Complete type definitions for all entities
   - Constants for default settings
   - Energy/Focus preset configurations
   - API request/response types

3. **Service Layer** (`lib/services/testDayAssistantService.ts`)
   - Assistant creation and management
   - Task CRUD operations
   - Day plan management with dual sliders
   - Postpone functionality with tracking
   - Undo mechanism with time windows
   - Proposal creation and response handling
   - Decision logging
   - Nightly rollover for overdue tasks

4. **Recommendation Engine** (`lib/services/testDayRecommendationEngine.ts`)
   - Task scoring algorithm with multiple factors
   - Live replanning triggers:
     - Task added to "today"
     - "Nie dziś" button clicked
     - Energy/focus sliders changed
   - Escalation logic (postpone_count >= 3)
   - Soft warning generation
   - Alternative action suggestions

5. **API Endpoints** (`app/api/test-day-assistant/`)
   - `POST /api/test-day-assistant/init` - Initialize assistant
   - `GET /api/test-day-assistant/dayplan` - Fetch day plan with timeline
   - `POST /api/test-day-assistant/dayplan` - Update energy/focus sliders
   - `POST /api/test-day-assistant/task` - Create task
   - `PUT /api/test-day-assistant/task` - Update task
   - `POST /api/test-day-assistant/postpone` - Postpone task ("Nie dziś")
   - `POST /api/test-day-assistant/proposal` - Respond to recommendation
   - `POST /api/test-day-assistant/undo` - Undo last action

6. **UI Components**
   - `app/test-day-assistant/page.tsx` - Initialization and documentation page
   - `scripts/init-test-day-assistant.ts` - CLI initialization script

## 🎯 Features

### Implemented

✅ **Dual Sliders System**
- Energy slider (1-5)
- Focus slider (1-5)  
- Affects task scoring and recommendations
- Presets: Pełna moc, Lekko, Zerowe skupienie, Odpoczynek

✅ **MUST Task Management**
- Maximum 1-3 MUST tasks per day (enforced)
- Soft warnings when unmarking MUST
- Automatic validation on task creation

✅ **"Nie Dziś" Button**
- Instant postpone to tomorrow
- Increments postpone_count
- Records moved_reason and moved_from_date
- Creates undo window (5-15s)
- Escalation at postpone_count >= 3

✅ **Live Replanning**
- Triggered by:
  - Adding task with "today" flag
  - Clicking "Nie dziś"
  - Changing energy/focus sliders significantly
- Generates 1 primary recommendation + up to 2 alternatives
- AI-generated reasoning for each recommendation

✅ **Undo Mechanism**
- 5-15 second undo window (configurable)
- Restores previous task state
- Auto-expires after time window
- Logged in decision log

✅ **Decision Logging**
- Every user action logged with context
- Includes: energy, focus, time_of_day, task details
- Used for learning user preferences
- Audit trail for analysis

✅ **Postpone Tracking & Escalation**
- Tracks postpone_count per task
- Escalation at threshold (default: 3)
- Reserves morning slot on escalation
- Suggests task decomposition

✅ **Auto-Decomposition Detection**
- Checks tasks > 60 min threshold
- Suggests splitting into 25-30 min steps
- Provides reason in recommendations

✅ **Nightly Rollover**
- Automatic migration of incomplete tasks
- Flags with auto_moved=true
- Records moved_from_date
- Morning banner for transferred tasks

✅ **Soft Warnings**
- No hard blocks on user actions
- Contextual warnings with recommendations
- User can always override

### To Be Implemented

🔲 **UI Views**
- Full day planner interface with timeline
- Task cards with action buttons
- Recommendation panel with acceptance options
- Slider controls with visual feedback
- Undo toast notifications

🔲 **AI Subtask Generation**
- Integration with OpenAI for task decomposition
- Context-aware step generation
- "Start 10 min" option for low focus

🔲 **Context Filtering**
- Filter by: code, admin, komunikacja, prywatne
- Context-based task visibility

🔲 **Rewards & Nudges**
- Streak tracking
- Neutral encouragement messages
- Progress visualization

🔲 **Morning Slot Reservation**
- Automatic time blocking for escalated tasks
- Calendar integration

🔲 **Nightly Rollover Scheduler**
- Automated daily job
- Email/notification for moved tasks

## 🚀 Getting Started

### Prerequisites

1. Supabase database with migrations applied
2. Environment variables configured:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for CLI script)

### Database Setup

Apply the migration:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually
psql $DATABASE_URL -f supabase/migrations/20251217_test_day_assistant.sql
```

### Initialize Assistant (Option 1: UI)

1. Navigate to `/test-day-assistant`
2. Click "Utwórz Asystenta Dnia Test"
3. View confirmation message

### Initialize Assistant (Option 2: CLI)

```bash
npx tsx scripts/init-test-day-assistant.ts <user_id>
```

Expected output:
```
╔════════════════════════════════════════════════════════════════════════╗
║                    🎉 ASSISTANT CREATED SUCCESSFULLY 🎉                ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  Utworzyłem asystenta: asystent dnia test — gotowy do działania.      ║
║                                                                        ║
║  Domyślne ustawienia:                                                  ║
║    • undo: 15s                                                         ║
║    • max_postpones_before_escalation: 3                                ║
║    • morning_must_block: 30 min                                        ║
║                                                                        ║
║  Chcesz zmienić progi lub presety?                                    ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
```

## 📖 API Documentation

### Initialize Assistant

**POST** `/api/test-day-assistant/init`

Creates or retrieves the test day assistant for the authenticated user.

**Response:**
```json
{
  "success": true,
  "assistant": {
    "id": "uuid",
    "name": "asystent dnia test",
    "type": "day_planner",
    "settings": {
      "undo_window": 15,
      "max_postpones_before_escalation": 3,
      "morning_must_block_default": 30,
      "auto_decompose_threshold": 60,
      "light_task_limit_minutes": 30,
      "max_daily_recommendations": 5
    }
  },
  "message": "Utworzyłem asystenta: asystent dnia test — gotowy do działania..."
}
```

### Get Day Plan

**GET** `/api/test-day-assistant/dayplan?date=YYYY-MM-DD`

Fetches day plan with timeline and active proposals.

**Response:**
```json
{
  "dayPlan": {
    "id": "uuid",
    "plan_date": "2024-01-15",
    "energy": 3,
    "focus": 3,
    "blocks": []
  },
  "tasks": [],
  "proposals": [],
  "assistant": {}
}
```

### Update Day Plan

**POST** `/api/test-day-assistant/dayplan`

Updates energy/focus sliders, triggers live replanning.

**Request:**
```json
{
  "date": "2024-01-15",
  "energy": 4,
  "focus": 5
}
```

**Response:**
```json
{
  "dayPlan": {},
  "proposal": {
    "reason": "Przy wysokiej energii zalecam...",
    "primary_action": {},
    "alternatives": []
  }
}
```

### Create Task

**POST** `/api/test-day-assistant/task`

Creates a new task, may trigger recommendation.

**Request:**
```json
{
  "title": "Implement feature X",
  "estimate_min": 45,
  "cognitive_load": 4,
  "is_must": true,
  "due_date": "2024-01-15"
}
```

### Postpone Task

**POST** `/api/test-day-assistant/postpone`

Moves task to tomorrow, creates undo window.

**Request:**
```json
{
  "task_id": "uuid",
  "reason": "Not feeling focused",
  "reserve_morning": false
}
```

**Response:**
```json
{
  "success": true,
  "task": {},
  "decision_log_id": "uuid",
  "undo_window_expires": "2024-01-15T10:15:30Z",
  "proposal": null,
  "message": "🧊 Zadanie przeniesione na jutro"
}
```

### Undo Action

**POST** `/api/test-day-assistant/undo`

Undoes the last action within the undo window.

**Response:**
```json
{
  "success": true,
  "message": "Cofnięto ostatnią akcję"
}
```

### Respond to Proposal

**POST** `/api/test-day-assistant/proposal`

Accept or reject a recommendation.

**Request:**
```json
{
  "proposal_id": "uuid",
  "action": "accept_primary",  // or "accept_alt", "reject"
  "alternative_index": 0  // if accepting alternative
}
```

## ⚙️ Configuration

### Default Settings

```typescript
{
  undo_window: 15,  // seconds
  max_postpones_before_escalation: 3,
  max_daily_recommendations: 5,
  light_task_limit_minutes: 30,
  morning_must_block_default: 30,  // minutes
  auto_decompose_threshold: 60  // minutes
}
```

### Modifying Settings

Update via API or directly in database:

```sql
UPDATE assistant_config 
SET settings = jsonb_set(settings, '{undo_window}', '20')
WHERE name = 'asystent dnia test' AND user_id = '<user_id>';
```

## 🧠 Scoring Algorithm

Tasks are scored based on:

1. **Base Score** (priority + deadline + impact)
   - Priority: 1-4 (Todoist) × 10
   - Deadline proximity: Overdue (30), Today (22.5), Tomorrow (15)
   - Impact: is_must (+20), is_important (+10)

2. **Energy/Focus Fit Bonus** (max +20)
   - Perfect match: cognitive_load matches avg(energy, focus)
   - Bonus for short tasks when focus is low
   - Penalty for long tasks when focus is low

3. **Avoidance Penalty** (postpone_count × 5)
   - Reduced by 50% at escalation threshold
   - Encourages completing repeatedly postponed tasks

**Formula:**
```
score = base_score + fit_bonus - avoidance_penalty
```

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- API routes validate authentication via Supabase
- Service role key required for CLI scripts

## 📊 Database Schema

See `supabase/migrations/20251217_test_day_assistant.sql` for complete schema.

**Key Tables:**
- `assistant_config` - Assistant settings per user
- `test_day_assistant_tasks` - Tasks with postpone tracking
- `test_day_plan` - Daily plans with energy/focus state
- `test_day_proposals` - AI recommendations
- `test_day_decision_log` - Audit trail
- `test_day_undo_history` - Short-term undo records

## 🧪 Testing

### Manual Testing Checklist

- [ ] Initialize assistant via UI
- [ ] Initialize assistant via CLI
- [ ] Create task with MUST flag
- [ ] Verify MUST limit (max 3)
- [ ] Use "Nie dziś" button
- [ ] Verify undo window
- [ ] Change energy/focus sliders
- [ ] Accept/reject proposals
- [ ] Test postpone escalation (3+ times)
- [ ] Verify decision logging

### Integration Testing

```bash
# Run TypeScript compilation check
npm run build

# Check for errors
npx tsc --noEmit --skipLibCheck
```

## 📝 Next Steps

1. **Complete UI Implementation**
   - Build full day planner view
   - Implement timeline with blocks
   - Add task cards with actions
   - Create recommendation panel

2. **AI Integration**
   - Connect OpenAI for subtask generation
   - Implement "Start 10 min" suggestions
   - Add context-aware decomposition

3. **Scheduling**
   - Set up nightly rollover cron job
   - Add morning notification system
   - Implement calendar integration

4. **Testing & Refinement**
   - User acceptance testing
   - Tune scoring weights
   - Optimize recommendation frequency
   - A/B test different nudge messages

## 📄 License

Part of MVP ChatV2 project. See main repository for license details.

## 👥 Contributors

- Agent: Implementation of test day assistant system
- Karol (khirsz00-hue): Requirements and specifications
