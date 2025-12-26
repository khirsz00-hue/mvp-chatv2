# Visual Changes - AI Task Understanding Flow

## UI Changes Overview

### 1. Enhanced AI Understanding Display

**Before:**
```
🤖 AI rozumie to jako:
Zrobic trening hokeja  <-- Just echoes the title
```

**After:**
```
🤖 AI rozumie to jako:
Zaplanować i przeprowadzić sesję treningową hokeja na lodzie, 
uwzględniając rozgrzewkę, ćwiczenia techniczne i mecz treningowy.  <-- 1-2 sentences of understanding
```

### 2. Three-Button Layout

**Before:**
```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI rozumie to jako:                                │
│  Zrobic trening hokeja                                 │
│                                                         │
│  ┌──────────────┐  ┌─────────────────────────────┐   │
│  │ ✨ Doprecyzuj│  │ ⚡ Wygeneruj plan           │   │
│  └──────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🤖 AI rozumie to jako:                                                │
│  Zaplanować i przeprowadzić sesję treningową hokeja...                │
│                                                                         │
│  ┌──────────────────┐ ┌──────────────┐ ┌─────────────────────────┐  │
│  │ ✓ Uzupełnij      │ │ ✏️ Doprecyzuj│ │ ⚡ Wygeneruj plan       │  │
│  │   parametry      │ │              │ │                         │  │
│  └──────────────────┘ └──────────────┘ └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Action Plan Information

**Before:**
```
📋 Twój plan działania
1. Step 1
2. Step 2
3. Step 3

💡 Ten plan zostanie automatycznie dodany do opisu zadania  <-- Overwrites description
```

**After:**
```
📋 Twój plan działania
1. Step 1
2. Step 2
3. Step 3

💡 Ten plan zostanie automatycznie dodany jako komentarz do zadania  <-- Added as comment
```

### 4. Labels Selector

**Before:**
```
Etykiety (oddzielone przecinkami)
┌─────────────────────────────────────────┐
│ praca, pilne, spotkanie                 │  <-- Free text input
└─────────────────────────────────────────┘
```

**After:**
```
Etykiety

[praca ×] [pilne ×] [spotkanie ×]  <-- Selected labels as removable badges

Wybierz etykietę z Todoist...
┌─────────────────────────────────────────┐
│ ▼ Wybierz etykietę z Todoist...        │  <-- Dropdown with Todoist labels
│   - @now                                │
│   - @next                               │
│   - @later                              │
│   - praca                               │
│   - osobiste                            │
└─────────────────────────────────────────┘

Kliknij na wybraną etykietę aby ją usunąć
```

## Button Behavior

### "Uzupełnij parametry" Button (NEW)
- **Icon**: ✓ CheckCircle
- **Color**: Blue border, ghost variant
- **Action**: 
  - Applies all AI suggestions (priority, time estimate, project, due date, labels, description)
  - Does NOT generate action plan
  - Hides the AI suggestion box
  - User can manually edit all fields afterward

### "Doprecyzuj" Button (EXISTING)
- **Icon**: ✏️ PencilSimple
- **Color**: Purple border, ghost variant
- **Action**:
  - Opens correction modal
  - User can clarify what AI should understand differently
  - Regenerates suggestions based on correction

### "Wygeneruj plan" Button (EXISTING)
- **Icon**: ⚡ Lightning
- **Color**: Blue-purple gradient
- **Action**:
  - Generates detailed action plan
  - Auto-applies all suggestions
  - Shows action plan steps
  - Plan will be added as comment after task creation

## Data Flow Changes

### Task Creation Flow

**Before:**
```
1. User clicks "Utwórz zadanie"
2. Task data prepared with description + action plan appended
3. Task created in Todoist
4. Modal closes
```

**After:**
```
1. User clicks "Utwórz zadanie"
2. Task data prepared with ONLY user's description
3. Task created in Todoist → Returns task object with ID
4. If action plan exists:
   - Format action plan as comment text
   - POST to /api/todoist/comments with task_id
   - Comment added to task in Todoist
5. Modal closes
```

### Labels Flow

**Before:**
```
1. User types labels as comma-separated text
2. Labels parsed on submit: "praca, pilne" → ["praca", "pilne"]
3. Labels sent to Todoist
```

**After:**
```
1. On modal open: Fetch labels from Todoist API
2. User selects labels from dropdown
3. Selected labels shown as badges
4. Click badge to remove label
5. Labels already in array format: ["praca", "pilne"]
6. Labels sent to Todoist
```

## API Integration

### New Endpoints

#### GET /api/todoist/labels
```
Request: GET /api/todoist/labels?token=<todoist_token>
Response: {
  "labels": [
    { "id": "123", "name": "@now", "color": "red" },
    { "id": "124", "name": "praca", "color": "blue" }
  ]
}
```

#### POST /api/todoist/comments
```
Request: POST /api/todoist/comments
Body: {
  "token": "<todoist_token>",
  "task_id": "<task_id>",
  "content": "📋 Plan działania:\n1. Step 1\n2. Step 2"
}

Response: {
  "success": true,
  "comment": { "id": "...", "content": "..." }
}
```

### Modified Endpoint

#### POST /api/ai/suggest-task
```
Request: (unchanged)
Response: {
  "understanding": "1-2 sentence summary...",  // NEW FIELD
  "priority": 2,
  "estimatedMinutes": 60,
  "description": "...",
  "suggestedProject": "...",
  "suggestedDueDate": "2025-12-27",
  "suggestedLabels": ["label1", "label2"],
  "reasoning": "..."
}
```

## Styling Details

### Button Styles
```css
/* Uzupełnij parametry */
.flex-1 .gap-2 .border .border-blue-300 .hover:bg-blue-50

/* Doprecyzuj */
.flex-1 .gap-2 .border .border-purple-300 .hover:bg-purple-50

/* Wygeneruj plan */
.flex-1 .gap-2 .bg-gradient-to-r .from-blue-500 .to-purple-500
```

### Label Badges
```css
/* Selected label badge */
.bg-blue-100 .text-blue-700 .cursor-pointer
.hover:bg-red-100 .hover:text-red-700  /* On hover for removal */
```

## User Experience Improvements

1. **Clear AI Understanding**: Users see exactly what AI interpreted, not just their input echoed back
2. **Flexible Workflow**: 
   - Quick apply without plan (Uzupełnij parametry)
   - Correct misunderstanding (Doprecyzuj)
   - Generate detailed plan (Wygeneruj plan)
3. **Description Preserved**: User's description never gets mixed with AI-generated content
4. **Easy Label Selection**: Visual dropdown instead of memorizing label names
5. **Visual Feedback**: Labels shown as badges, easy to remove
6. **Non-blocking**: Comment creation failure doesn't prevent task creation

## Backward Compatibility

- ✅ Existing tasks unaffected
- ✅ Works with or without AI suggestions
- ✅ Falls back gracefully if labels can't be fetched
- ✅ Falls back to title if understanding field missing
- ✅ All existing features still work
