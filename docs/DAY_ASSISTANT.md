# Asystent Dnia (Day Assistant) - MVP Documentation

## Overview

The Day Assistant is an AI-powered task management system that helps users organize their day using the NOW/NEXT/LATER framework. It operates in "co-pilot" mode - the agent recommends and organizes, while the user maintains full control.

## Core Principles

### Shared Control
- **Agent**: Recommends, organizes, proposes next moves, maintains flow, prevents overload
- **User**: Sees the plan, chooses, overrides, reports priority changes, switches energy modes
- **Agent never takes the wheel**
- **Agent always provides minimum 2 options** at key moments (except crisis mode where 1 option is OK)

## Key Features

### 1. NOW/NEXT/LATER Interface

The interface is divided into three sections:

#### NOW (Teraz)
- **1 active task** + current step (subtask)
- Displayed at the top of the interface
- User sees exactly **what they're doing now**

#### NEXT (Następne)
- **2-5 tasks in queue**
- Short list of what's planned for later
- User sees **what's coming up**

#### LATER (Później)
- **Rest of tasks (collapsed)**
- Only shows a counter (e.g., `+12`)
- User knows **there's more, but isn't overwhelmed**

**Rules:**
- Agent can change the queue, but user **always sees** the current state
- User can drag tasks between sections (or use buttons)

### 2. User Controls: Task Actions

Users have 3 quick actions on each task:

#### 📌 MUST TODAY (pin)
- User marks task as **critical for today**
- Agent treats this as a **hard constraint**
- Task moves to **NOW** or **NEXT** (depending on current state)

#### 🧊 NOT TODAY (postpone)
- User postpones task to **another day**
- Task moves from NOW/NEXT to **LATER** or **backlog**

#### 🔥 MEGA IMPORTANT (escalate)
- User escalates task to **highest priority**
- Agent immediately:
  1. Updates NOW/NEXT
  2. Informs what dropped from the queue
  3. Proposes the safest change

**Example agent response:**
```
OK, this is 🔥 mega important. Moving it to NOW, and 'Prepare report' drops to LATER.
Want a 15-min step or a 45 min block right away?
```

**When everything is 🔥 mega important:**
- Agent asks: `"You have 5 things marked 🔥 mega important. Which MUST be FIRST?"`
- User chooses 1. Rest goes to NEXT.

### 3. Energy Modes: Manual Switch (🔴🟡🟢)

**Switch always visible** (e.g., in header):

#### 🔴 Crisis (Zjazd)
- **Steps ≤5 min**
- NEXT max **2 items**
- Agent proposes **micro-victory** ("one move and done")
- Option: **"Quick Win"** (one task ≤5 min)

#### 🟡 Normal (Normalnie)
- **Steps 5-20 min**
- NEXT **2-5 items**
- Standard flow

#### 🟢 Flow
- **Steps up to 25 min** (with user consent)
- Agent can propose **blocks of similar tasks**
- Push within the same context (without adding new categories)

**Rules:**
- User **manually switches** mode (agent **DOES NOT switch automatically**)
- After mode change, agent **immediately**:
  1. Recalculates queue
  2. Adjusts step duration
  3. Proposes new "Next action"

**Agent DOES NOT suggest mode changes** (we resign from automation).

### 4. Chat + UI = One System

**Chat cannot be "another application".**  
Everything agreed in chat must:
- Update the queue (NOW/NEXT/LATER)
- Update the journal (if user wants)
- Leave a trace in **"Decision History"** for the task

#### Chat Commands (must-have)

Agent recognizes intents and executes actions in UI:

| User Command | Agent Action |
|--------------|-------------|
| `"this is mega important today"` | Mark 🔥 MEGA IMPORTANT + move to NOW/NEXT |
| `"crisis, nothing's working"` | Confirm energy change to 🔴 (user must click switch) |
| `"I have flow, let's go"` | Confirm energy change to 🟢 (user must click switch) |
| `"postpone this"` | 🧊 NOT TODAY |
| `"pin this for today"` | 📌 MUST TODAY |
| `"make a block of similar things"` | Launch BLOCK mode (if user is on 🟢 or 🟡) |
| `"when can I fit 30 min today/tomorrow?"` | Find 3 meeting slots |

**Agent always responds:**
- Short confirmation
- What changed
- **Action proposal** (button/command)

**Example:**
```
OK. Set as 🔥 mega important and moved to NOW.

[Button: 15-min step] [Button: 45 min block]
```

### 5. Subtask Generator: Quality + User Feedback

**Subtask generation rules:**

#### Detail level slider (user control)
In the 🧠 modal (or quick menu) user chooses:
- **"Minimum"** (1 step)
- **"Standard"** (1-2 steps) ← default
- **"More detailed"** (max 3 steps)

#### Agent generates 1 step (best guess)
- Agent generates **1 step** based on user preferences
- Step has duration **5-20 min** (normal) or **≤5 min** (crisis 🔴)
- User has immediate feedback:

**Buttons after generating step:**
- ✅ **OK, START** (accept step)
- ⬇️ **Simplify step** (split into smaller parts)
- ⬆️ **Split into more** (more detailed)
- ❌ **Nonsense** (regenerate different style)

#### User feedback on step (after completion)

After finishing (or rejecting) step, user chooses:
- 👍 **OK**
- 👎 **Too small**
- 👎 **Too big**
- 🚫 **Nonsense**

**"Nonsense" automatically triggers:**
- Step regeneration **in different style** (more result-oriented)
- Saves signal to user profile (agent learns preferences)

#### Hard limits
- **Max 3 steps** per task at a time (not a half-day plan)
- **Steps 5-20 min** (normal) or **≤5 min** (crisis 🔴)

## Journal Integration

**Journal already exists in the system.**  
User:
- In the morning fills **basic information** (energy, sleep, etc.)
- Can **add notes**
- Completed tasks **jump into journal**
- Periodically an **analysis** is done: plan vs. reality relative to energy, motivation, etc.
- AI extracts **insights and patterns**

**Collaboration with agent = valuable source of information for journal analysis.**

#### What agent sends to journal:
- **Completed tasks** (automatically)
- **Energy mode changes** (user switches manually)
- **Escalations** (🔥 MEGA IMPORTANT)
- **Similar task blocks** (start/end)
- **Step feedback** (too small/OK/too big/nonsense)
- **Interrupted timers** (if user interrupts work)

**Agent DOES NOT write auto-notes to journal** (user decides what to record).

## API Endpoints

### Task Management
- `GET /api/day-assistant/queue` - Get NOW/NEXT/LATER state
- `POST /api/day-assistant/tasks` - Create task
- `PUT /api/day-assistant/tasks` - Update task
- `DELETE /api/day-assistant/tasks` - Delete task

### Task Actions
- `POST /api/day-assistant/actions` - Perform action (pin/postpone/escalate)
- `POST /api/day-assistant/undo` - Undo last action

### Energy Mode
- `GET /api/day-assistant/energy-mode` - Get current energy mode
- `POST /api/day-assistant/energy-mode` - Update energy mode

### Subtasks
- `POST /api/day-assistant/subtasks/generate` - Generate subtasks with AI
- `POST /api/day-assistant/subtasks` - Create subtasks
- `POST /api/day-assistant/subtasks/feedback` - Record feedback

## Database Schema

### Tables

#### `day_assistant_tasks`
Main tasks table with priority, pinned status, and mega importance flags.

#### `day_assistant_subtasks`
Subtasks for each task with estimated duration and completion status.

#### `user_energy_state`
Current energy mode for each user.

#### `subtask_feedback`
User feedback on subtasks for AI learning.

#### `task_action_history`
History of all task actions for undo functionality.

#### `user_day_preferences`
User preferences for subtask generation.

#### `flow_blocks` (optional)
Groups of similar tasks for flow mode.

## Setup Instructions

### 1. Run Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Execute: supabase/migrations/20231217_day_assistant.sql
```

### 2. Configure Environment Variables

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

### 3. Access the Feature

Navigate to the application and click on **"Asystent Dnia"** in the sidebar (☀️ Sun icon).

## Usage Guide

### Creating a Task

1. Click **"+ Dodaj zadanie"** button
2. Fill in task title, description (optional), and estimated duration
3. Task is added to LATER by default

### Working with Energy Modes

1. Check your current energy level
2. Click the appropriate mode button in the header (🔴🟡🟢)
3. Queue automatically adjusts to mode constraints

### Managing Task Priority

- **Pin for today**: Click 📌 button on a task
- **Postpone**: Click 🧊 button to move to LATER
- **Escalate**: Click 🔥 button to move to NOW immediately

### Generating Subtasks

1. Click 🧠 **"Generuj kroki"** on a task
2. Choose detail level (Minimum/Standard/Detailed)
3. Review generated steps
4. Provide feedback (OK/Simplify/Split more/Nonsense)
5. Steps are saved and displayed on the task

### Undo Functionality

Click the ↩️ **"Cofnij"** button in the header to undo the last action.

## Best Practices

1. **Start with energy mode** - Set your current energy level first
2. **Keep NOW focused** - Only one task active at a time
3. **Use pins sparingly** - Too many pins defeats the purpose
4. **Provide feedback** - Help the AI learn your preferences
5. **Review LATER periodically** - Don't let tasks accumulate

## Troubleshooting

### Tasks not appearing
- Check if database migration was run successfully
- Verify user authentication is working
- Check browser console for errors

### AI not generating subtasks
- Verify `OPENAI_API_KEY` is set correctly
- Check API rate limits
- Review backend logs for errors

### Energy mode not saving
- Check database connection
- Verify RLS policies are set up correctly
- Check user authentication

## Future Enhancements

### Phase 2 Features
- Chat interface with intent recognition
- Meeting slot finder (Google Calendar integration)
- Flow blocks for similar tasks
- Deep Work mode (🔇 silence)
- Journal integration for completed tasks

### Long-term Roadmap
- Advanced AI learning from feedback
- Team collaboration features
- Analytics and insights
- Mobile app support
- Voice commands

## Architecture Notes

### Component Structure
```
components/day-assistant/
├── DayAssistantView.tsx      # Main view with NOW/NEXT/LATER
├── DayTaskCard.tsx            # Task card with actions
├── EnergyModeSwitcher.tsx    # Energy mode switcher
├── CreateTaskModal.tsx        # Task creation modal
└── SubtaskModal.tsx           # Subtask generation modal
```

### Service Layer
```
lib/services/
├── dayAssistantService.ts    # Database operations
└── dayAssistantAI.ts          # AI operations (OpenAI)
```

### API Routes
```
app/api/day-assistant/
├── queue/route.ts             # Queue state
├── tasks/route.ts             # Task CRUD
├── actions/route.ts           # Task actions
├── energy-mode/route.ts       # Energy mode
├── undo/route.ts              # Undo functionality
└── subtasks/
    ├── route.ts               # Subtask CRUD
    ├── generate/route.ts      # AI generation
    └── feedback/route.ts      # User feedback
```

## Contributing

When extending the Day Assistant:

1. Follow existing patterns for API routes
2. Use TypeScript types from `lib/types/dayAssistant.ts`
3. Add RLS policies for new tables
4. Update this documentation
5. Write tests for new features

## Support

For issues or questions:
- Check the troubleshooting section above
- Review browser console and server logs
- Check database migrations are applied
- Verify environment variables are set

## License

Part of the AI Assistants PRO platform.
