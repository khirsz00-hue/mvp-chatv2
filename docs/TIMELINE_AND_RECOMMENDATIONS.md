# Day Assistant: Timeline & Recommendations Guide

This document explains how the Timeline feature works in Day Assistant and how to accept AI recommendations.

## Table of Contents
1. [Timeline Overview](#timeline-overview)
2. [How Timeline is Built](#how-timeline-is-built)
3. [Priority Ordering](#priority-ordering)
4. [Accepting Recommendations](#accepting-recommendations)
5. [Authentication](#authentication)
6. [API Reference](#api-reference)

---

## Timeline Overview

The Timeline tab in Day Assistant provides a visual schedule view of your tasks for the day. Unlike traditional calendars, it intelligently builds your schedule based on your task queue (NOW/NEXT/LATER) and priority ordering.

**Key Features:**
- 📅 Visual time-based layout showing when tasks should be done
- 🎯 Automatic scheduling based on task priority (NOW → NEXT → LATER)
- ⚡ Real-time updates when you accept recommendations
- 🔐 Secure, user-specific data (authentication required)

---

## How Timeline is Built

The Timeline is dynamically generated from your task queue using the following logic:

### Data Source: Queue State
Timeline events are built from the `/api/day-assistant/queue` endpoint, which returns:
- **NOW**: 1 task (currently active)
- **NEXT**: 2-5 tasks (based on energy mode constraints)
- **LATER**: Remaining tasks (shown on demand)

### Scheduling Algorithm

```
Start Time: Current time OR 9:00 AM (whichever is later)

1. Schedule NOW task first
   - Allocate time = task.estimated_duration
   - Mark with 🎯 icon and purple color

2. Schedule NEXT tasks in order
   - For each task in queue order
   - Allocate time = task.estimated_duration
   - Mark with ⏭️ icon and green color

3. (Optional) Schedule LATER tasks
   - Only when includeAll=true
   - Limited to first 5 tasks
   - Mark with 📋 icon and gray color
```

### Example
```
User's Queue:
- NOW: "Write report" (30 min)
- NEXT: 
  1. "Review PR" (15 min)
  2. "Email client" (10 min)
- LATER: 3 tasks...

Timeline Generated:
9:00 - 9:30   🎯 NOW: Write report
9:30 - 9:45   ⏭️ NEXT: Review PR
9:45 - 9:55   ⏭️ NEXT: Email client
```

### Timeline Endpoint

**GET** `/api/day-assistant/timeline`

**Query Parameters:**
- `date` (optional): ISO date string (default: today)
- `includeAll` (optional): Include LATER tasks (default: false)

**Response:**
```json
{
  "events": [
    {
      "id": "task-123",
      "type": "queue-task",
      "title": "🎯 NOW: Write report",
      "startTime": "09:00",
      "endTime": "09:30",
      "duration": 30,
      "priority": "now",
      "taskIds": ["task-123"]
    }
  ],
  "queueSummary": {
    "nowCount": 1,
    "nextCount": 2,
    "laterCount": 5
  }
}
```

---

## Priority Ordering

Task priority determines the order in Timeline and follows these rules:

### Priority Levels

| Priority | Description | Timeline Position | Color |
|----------|-------------|-------------------|-------|
| **NOW** | Current active task | First slot | 🟣 Purple |
| **NEXT** | Upcoming tasks | After NOW, in order | 🟢 Green |
| **LATER** | Backlog tasks | After NEXT (optional) | ⚪ Gray |

### Energy Mode Constraints

The number of tasks in NEXT is limited by your current Energy Mode:

| Energy Mode | NEXT Limit | Max Step Duration |
|-------------|------------|-------------------|
| 🔴 Crisis | 2 tasks | 5 minutes |
| 🟡 Normal | 5 tasks | 20 minutes |
| 🟢 Flow | 5 tasks | 25 minutes |

**Example:**
- User in Crisis mode (🔴)
- Has 10 incomplete tasks
- Timeline shows: 1 NOW + 2 NEXT + "8 more in LATER"

### Task Ordering Within Priority

Within each priority level, tasks are ordered by:
1. **Pinned status** (📌 pinned tasks first)
2. **Mega Important** flag (🔥)
3. **Position** (user-defined order)

---

## Accepting Recommendations

The AI Chat Assistant provides actionable recommendations that you can accept with one click.

### How It Works

```
User: "grupuj podobne zadania"
         ↓
AI generates recommendation:
{
  "type": "GROUP_TASKS",
  "title": "Zgrupuj emaile",
  "reason": "Podobny kontekst: 'Email A', 'Email B', 'Email C'",
  "actions": [
    { "op": "CREATE_BLOCK", "start": "14:00", "durationMin": 30, "taskIds": [...] }
  ]
}
         ↓
User clicks [Zastosuj]
         ↓
POST /api/day-assistant/recommendations/apply
         ↓
Actions executed:
- Creates time block at 14:00
- Groups specified tasks
- Updates queue
         ↓
UI refreshes (no page reload)
Toast: "Zastosowano 1 z 1 akcji ✅"
```

### Recommendation Types

The AI can suggest various action types:

#### 1. GROUP_TASKS
Groups similar tasks into a time block.

**Actions:**
- `CREATE_BLOCK`: Creates a timeline event with multiple tasks

**Example:**
```
"Zgrupuj emaile: 'Odpowiedź klientowi', 'Newsletter', 'Oferta dla XYZ'"
→ Creates block at 14:00 for 30 min with 3 tasks
```

#### 2. MOVE_TASK
Changes task priority.

**Actions:**
- `MOVE_TASK`: Updates task priority (now/next/later)

**Example:**
```
"Przesuń 'Spotkanie' na później"
→ Moves task to LATER priority
```

#### 3. ENERGY_CHANGE
Switches energy mode based on user state.

**Actions:**
- `CHANGE_ENERGY_MODE`: Updates energy state (crisis/normal/flow)

**Example:**
```
User: "jest mi ciężko"
→ Switches to Crisis mode (🔴)
→ Limits NEXT to 2 tasks
→ Suggests smaller steps
```

#### 4. SCHEDULE_SLOT
Finds available time for meetings/tasks.

**Actions:**
- `CREATE_BLOCK`: Creates proposal in timeline

**Example:**
```
"znajdź czas na spotkanie 30 min"
→ Returns 3 best time slots
→ User can accept one
```

#### 5. SIMPLIFY
Marks task as mega important and moves to NOW.

**Actions:**
- `MARK_MEGA_IMPORTANT`: Sets flag
- `ESCALATE_TASK`: Moves to NOW

---

## Authentication

All Timeline and Recommendations endpoints require authentication via session cookies.

### How Authentication Works

```typescript
// Backend (API Route)
const supabase = await createAuthenticatedSupabaseClient()
const user = await getAuthenticatedUser(supabase)

if (!user?.id) {
  return NextResponse.json(
    { error: 'Unauthorized - Please log in' },
    { status: 401 }
  )
}

// Use user.id for RLS-filtered queries
const queueState = await getQueueState(user.id, false, supabase)
```

### Row Level Security (RLS)

All database tables use RLS policies:
- Users can only see their own tasks
- `user_id` is automatically filtered by `auth.uid()`
- No need to pass userId in API calls (taken from session)

### Frontend Usage

```typescript
// Client-side (React component)
const response = await apiGet('/api/day-assistant/timeline')
// No need to pass userId - handled by cookies

if (response.status === 401) {
  showToast('Please log in to use Day Assistant', 'error')
}
```

---

## API Reference

### Timeline Endpoints

#### GET /api/day-assistant/timeline
Build and retrieve timeline from queue.

**Auth:** Required (session cookies)

**Query Params:**
- `date`: string (optional, default: today)
- `includeAll`: boolean (optional, default: false)

**Response:** `{ events: TimelineEvent[], queueSummary: {...} }`

---

#### POST /api/day-assistant/timeline
Create a manual timeline event.

**Auth:** Required

**Body:**
```json
{
  "date": "2024-12-17",
  "type": "task-block",
  "title": "Focus time",
  "startTime": "14:00",
  "duration": 60,
  "taskIds": ["task-1", "task-2"]
}
```

---

### Recommendations Endpoints

#### POST /api/day-assistant/recommendations/apply
Apply AI recommendation actions to tasks.

**Auth:** Required

**Body:**
```json
{
  "recommendation": {
    "id": "rec_123",
    "type": "GROUP_TASKS",
    "actions": [
      {
        "op": "CREATE_BLOCK",
        "start": "14:00",
        "durationMin": 30,
        "taskIds": ["task-1", "task-2"]
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "action": "CREATE_BLOCK", "success": true, "blockId": "..." }
  ],
  "message": "Zastosowano 1 z 1 akcji"
}
```

**Supported Actions:**
- `MOVE_TASK`: Change task priority
- `PIN_TASK`: Mark as mega important
- `ESCALATE_TASK`: Move to NOW/NEXT
- `POSTPONE_TASK`: Move to LATER
- `CREATE_BLOCK`: Create time block
- `CHANGE_ENERGY_MODE`: Switch energy mode
- `MARK_MEGA_IMPORTANT`: Flag as urgent

---

### Queue Endpoints

#### GET /api/day-assistant/queue
Get current task queue state.

**Auth:** Required

**Query Params:**
- `includeLater`: boolean (optional, default: false)

**Response:**
```json
{
  "now": { "id": "...", "title": "...", ... },
  "next": [...],
  "later": [...],
  "laterCount": 5
}
```

---

## Visual Reference

### Timeline UI Components

```
┌─────────────────────────────────────────────────┐
│ 📅 Harmonogram dnia - 17 grudnia 2024    [🔄]  │ ← Header with refresh
├─────┬───────────────────────────────────────────┤
│ 9:00│                                           │ ← Hour markers
├─────┤ ┌───────────────────────────────────┐    │
│10:00│ │ 🎯 NOW: Write report              │    │ ← NOW task (purple)
│     │ │ 9:00 - 9:30 (30 min)              │    │
│     │ └───────────────────────────────────┘    │
├─────┤ ┌───────────────────────────────────┐    │
│10:30│ │ ⏭️ NEXT: Review PR                 │    │ ← NEXT task (green)
│     │ │ 9:30 - 9:45 (15 min)              │    │
│     │ └───────────────────────────────────┘    │
├─────┤                                           │
│11:00│ ━━━━━━━ Teraz ━━━━━━━                   │ ← Current time indicator
├─────┤                                           │
│     │                                           │
└─────┴───────────────────────────────────────────┘
```

### Recommendation Card in Chat

```
┌───────────────────────────────────────────────┐
│ 🤖 AI: Polecam zgrupować podobne zadania...  │
│                                               │
│ ┌───────────────────────────────────────┐   │
│ │ 📌 Rekomendacja: Zgrupuj emaile       │   │ ← Recommendation
│ │ Powód: Podobny kontekst - Email A,    │   │
│ │        Email B, Email C               │   │
│ │                                       │   │
│ │ Zadania:                              │   │ ← Task details
│ │ • Odpowiedź klientowi                 │   │
│ │ • Newsletter                          │   │
│ │ • Oferta dla XYZ                      │   │
│ │                                       │   │
│ │                    [Zastosuj]         │   │ ← Accept button
│ └───────────────────────────────────────┘   │
└───────────────────────────────────────────────┘
```

---

## Implementation Notes

### No Global Reloads
All operations (accepting recommendations, refreshing timeline) happen via API calls without full page reloads:

```typescript
// ✅ Good: Targeted refresh
await apiPost('/api/day-assistant/recommendations/apply', { ... })
await refreshQueue()  // Only updates queue state

// ❌ Bad: Full page reload
window.location.reload()
```

### Error Handling
All endpoints return proper HTTP status codes:
- `200`: Success
- `400`: Bad request (missing params)
- `401`: Unauthorized (not logged in)
- `500`: Server error

### Performance
- Timeline builds from cached queue state
- No N+1 queries (uses single query with joins)
- Client-side caching via React state

---

## Troubleshooting

### Timeline shows no tasks
**Problem:** Timeline is empty even though queue has tasks.

**Solution:** 
1. Check if user is logged in (auth required)
2. Verify queue has tasks: `GET /api/day-assistant/queue`
3. Check console for errors

### Recommendation doesn't apply
**Problem:** Click "Zastosuj" but nothing happens.

**Solution:**
1. Check network tab for API errors
2. Verify recommendation has valid actions array
3. Check task IDs exist in database

### Timeline shows wrong order
**Problem:** Tasks appear in wrong priority order.

**Solution:**
1. Verify queue endpoint returns correct order
2. Check energy mode constraints (NEXT limit)
3. Look for pinned/mega_important flags affecting order

---

## Future Enhancements

Planned improvements:
- [ ] Google Calendar integration (meetings overlay)
- [ ] Drag-and-drop task rescheduling
- [ ] Multi-day timeline view
- [ ] Automatic buffer time between tasks
- [ ] Smart break suggestions

---

*Last updated: 2024-12-17*
