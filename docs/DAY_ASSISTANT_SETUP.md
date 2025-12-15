# Day Assistant - Setup Guide

This guide explains how to set up and use the enhanced Day Assistant with Chat and Timeline features.

## Database Setup

### 1. Apply Migration

Run the SQL migration to create the required tables:

```sql
-- In Supabase SQL Editor or via CLI
-- Run: supabase/migrations/20231218_day_assistant_chat_timeline.sql
```

This migration creates:
- `day_chat_messages` - Stores chat conversations for today
- `day_timeline_events` - Stores timeline events (meetings, task blocks, ghost proposals)

### 2. Verify Tables

Check that the tables were created successfully:

```sql
SELECT * FROM day_chat_messages LIMIT 1;
SELECT * FROM day_timeline_events LIMIT 1;
```

## Features Overview

### 1. Chat Interface

The chat provides a command-first interface for interacting with the Day Assistant.

**Quick Commands:**
- "co teraz?" - Get recommendation for current task
- "jest mi ciężko" - Switch to crisis mode and get smaller steps
- "mam flow" - Switch to flow mode and get batching recommendations
- "znajdź czas na spotkanie X min" - Find available meeting slots

**Intent Classification:**
The chat automatically detects your intent and provides appropriate actions:
- `WHAT_NOW` - Recommends next task
- `I_AM_STUCK` - Suggests energy mode change and smaller tasks
- `FLOW_MODE` - Suggests task batching
- `MEGA_IMPORTANT` - Finds urgent task slot
- `GROUP_TASKS` - Groups similar tasks
- `SCHEDULE_SLOT` - Finds meeting times
- `MOVE_TASK` - Reschedules task
- `BREAKDOWN_TASK` - Generates subtasks
- `STATUS_UPDATE` - Updates task status

### 2. Timeline View

The timeline shows your daily schedule visually with hourly markers.

**Event Types:**
- 🔵 **Meeting** (blue) - Immutable calendar events
- 🟢 **Event** (green) - Semi-fixed events
- 🟣 **Task Block** (purple) - Mutable task groups
- ⚪ **Ghost Proposal** (gray dashed) - AI suggestions

**Interactions:**
- Click event to see details
- Approve ghost proposals (converts to task block)
- Reject ghost proposals (removes suggestion)
- View current time indicator (red line)

### 3. Tabs

Switch between three views:
- **📝 Zadania** - NOW/NEXT/LATER task queue (original view)
- **📅 Harmonogram** - Visual timeline of the day
- **💬 Czat** - Command-first chat interface

## How It Works

### Orchestration Engine

The Day Assistant uses several intelligent systems:

**1. Day Context**
Tracks runtime state:
- Current energy mode (crisis/normal/flow)
- Momentum (stuck/neutral/flow)
- Active task and context
- Next fixed event
- Available time windows
- Overload score (0-100)

**2. Recommendation Engine**
Generates actionable recommendations:
- Energy mode changes based on momentum
- Task grouping by context type
- Schedule simplification
- Meeting slot finding
- Break suggestions

**3. Timeline Engine**
Handles scheduling logic:
- Collision detection
- Buffer management (10-15 min between tasks)
- Slot finding algorithm
- Task block movement
- Time until next event

### Context Types

Tasks are automatically classified into context types:
- **deep** - Programming, complex work (10 min buffer)
- **admin** - Paperwork, forms (5 min buffer)
- **comms** - Email, messages (5 min buffer)
- **ops** - Meetings, calls (15 min buffer)
- **creative** - Design, brainstorming (10 min buffer)
- **unknown** - Default (10 min buffer)

### Momentum Detection

The system infers your momentum from recent activity:
- **stuck** - Interruptions > completions, or 90+ min idle
- **flow** - 2+ completions with no interruptions
- **neutral** - Normal state

The AI uses this to suggest appropriate actions.

## API Endpoints

### Chat

```
GET  /api/day-assistant/chat?userId={id}
POST /api/day-assistant/chat
```

### Timeline

```
GET  /api/day-assistant/timeline?userId={id}&date={YYYY-MM-DD}
POST /api/day-assistant/timeline
POST /api/day-assistant/timeline/approve
POST /api/day-assistant/timeline/reject
```

### Recommendations

```
GET  /api/day-assistant/recommendations?userId={id}
POST /api/day-assistant/recommendations  # For meeting slots
```

## Usage Tips

### 1. Start Your Day

1. Open Day Assistant
2. Switch to **Timeline** tab to see your schedule
3. Check for ghost proposals (AI suggestions)
4. Approve proposals that make sense
5. Switch to **Chat** and ask "co teraz?"

### 2. During the Day

**If stuck:**
- Say "jest mi ciężko" in chat
- System switches to crisis mode
- Get smaller 5-15 min tasks

**If in flow:**
- Say "mam flow" in chat
- System switches to flow mode
- Get batched similar tasks

### 3. Finding Meeting Times

In chat:
```
znajdź czas na spotkanie 30 min
```

The AI will return 3 best slots based on:
- Available time windows
- Preferred hours (10am-4pm by default)
- Distance from optimal time
- Buffer requirements

### 4. Task Grouping

If you have multiple tasks of similar type (e.g., 3 emails to write), the system will recommend grouping them:

```
Recommendation: Zgrupuj komunikację (3 zadań)
Reason: Zmniejszysz przełączanie kontekstu
Action: Create block 60 min
```

Click "Zastosuj" to create the task block on your timeline.

## Customization

### Working Hours

Default: 9am - 5pm

To change, modify in timeline component or add to user preferences:
```typescript
const workingHours = { start: 8, end: 18 }
```

### Preferred Meeting Hours

Default: 10am - 4pm

To change when finding meeting slots:
```typescript
preferredHours: [9, 17]  // 9am - 5pm
```

### Buffer Times

Buffers are automatically calculated based on context type. See context types above.

## Troubleshooting

### Chat not responding

1. Check OpenAI API key is set in environment
2. Verify database migration was applied
3. Check browser console for errors

### Timeline not showing events

1. Verify Google Calendar is connected
2. Check timeline API endpoint is accessible
3. Verify `day_timeline_events` table exists

### Recommendations not appearing

1. Check you have tasks in NOW/NEXT queue
2. Verify energy mode is set
3. Check recommendations API endpoint

## Security

All endpoints are protected by Row Level Security (RLS):
- Users can only see their own chat messages
- Users can only see their own timeline events
- All operations require authenticated user

## Performance

- Chat history limited to today's messages
- Conversation history in context limited to last 5 messages
- Recommendations limited to top 3
- Timeline events limited to working hours

## Future Enhancements

Planned features:
- [ ] Pomodoro timer integration
- [ ] Auto-triggers (before/after meetings)
- [ ] Drag & drop timeline events
- [ ] Calendar sync for task blocks
- [ ] Mobile-optimized views
- [ ] Voice commands
- [ ] Smart break reminders
