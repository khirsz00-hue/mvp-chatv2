# CreateTaskModal UX Implementation Summary

## Overview
This document summarizes the changes made to the `CreateTaskModal.tsx` component to implement the new UX design for AI Understanding and Action Plan generation.

## Changes Implemented

### 1. New API Endpoint: `/api/ai/generate-action-plan`
**Location:** `app/api/ai/generate-action-plan/route.ts`

**Purpose:** Generates a detailed action plan with AI suggestions for a task.

**Request:**
```json
{
  "title": "string",
  "description": "string (optional)",
  "understanding": "string (optional)",
  "userId": "string",
  "userContext": {
    "projects": [{ "id": "string", "name": "string" }]
  }
}
```

**Response:**
```json
{
  "actionPlan": ["Step 1", "Step 2", "Step 3", ...],
  "priority": 1-4,
  "cognitiveLoad": 1-4,
  "estimatedMinutes": number,
  "suggestedDueDate": "YYYY-MM-DD",
  "suggestedProject": "string or null",
  "suggestedLabels": ["label1", "label2"],
  "description": "string"
}
```

### 2. CreateTaskModal.tsx - State Management

**New State Variables:**
- `planGenerated: boolean` - Tracks if action plan has been generated
- `generatingPlan: boolean` - Loading state for plan generation
- `showCorrectionModal: boolean` - Shows/hides correction overlay
- `correctionText: string` - User's correction input
- `aiUnderstanding: string` - AI's understanding of the task
- `cognitiveLoad: 1 | 2 | 3 | 4 | null` - Selected cognitive load level

**Updated aiSuggestions Type:**
```typescript
{
  priority?: number
  estimatedMinutes?: number
  description?: string
  suggestedProject?: string
  suggestedDueDate?: string
  suggestedLabels?: string[]
  actionPlan?: string[]      // NEW
  cognitiveLoad?: number     // NEW
}
```

### 3. UI Changes - AI Understanding Box

**Old Behavior:**
- Displayed AI suggestions as clickable badges
- No clear call-to-action buttons

**New Behavior:**
- Shows "🤖 AI rozumie to jako:" with the task title
- **Two primary action buttons:**
  1. **"✨ Doprecyzuj"** - Opens correction overlay (purple ghost button)
  2. **"⚡ Wygeneruj plan"** - Generates action plan (gradient blue-purple button)

### 4. Action Plan Display

**When plan is generated, displays two boxes:**

#### Box 1: Applied Parameters (Gray theme)
- Shows all auto-applied parameters as badges
- Text: "💡 Parametry zostały automatycznie ustawione (możesz je zmienić)"
- Badges: P1, C2, 30 min, 📅 date, 📁 project, 🏷️ labels

#### Box 2: Action Plan (Green theme)
- Title: "📋 Twój plan działania"
- Numbered steps with green circular badges (1, 2, 3...)
- Info footer: "💡 Ten plan zostanie automatycznie dodany do opisu zadania"

### 5. Cognitive Load Field

**New form section added with 4 levels:**

| Level | Label | Color | Description |
|-------|-------|-------|-------------|
| C1 | Proste | Green | Zadania rutynowe, jasne instrukcje |
| C2 | Umiarkowane | Blue | Wymaga uwagi, trochę planowania |
| C3 | Złożone | Orange | Wymaga skupienia, wiele etapów |
| C4 | Bardzo złożone | Red | Głęboka koncentracja, kreatywność |

**Layout:**
- Grid: 2 columns on mobile, 4 columns on desktop
- Icon: Brain from @phosphor-icons/react
- Selected state: Colored border and background

### 6. Correction Modal

**Implementation:** Overlay within main dialog

**Features:**
- Purple theme
- PencilSimple icon in header
- Shows AI understanding in purple box with "🤖" emoji
- Textarea with label "✍️ Co AI powinno zrozumieć inaczej?"
- Example placeholder text
- Button: "Popraw i wygeneruj ponownie" with Lightning icon
- Gradient purple-to-pink button styling

### 7. Task Submission Updates

**Action Plan Integration:**
```typescript
if (aiSuggestions?.actionPlan && aiSuggestions.actionPlan.length > 0) {
  const planText = '\n\n📋 Plan działania:\n' + 
    aiSuggestions.actionPlan.map((step, i) => `${i + 1}. ${step}`).join('\n')
  finalDescription = (finalDescription || '') + planText
}
```

**Cognitive Load Label:**
```typescript
if (cognitiveLoad) {
  allLabels.push(`cognitive-${cognitiveLoad}`)
}
```

### 8. New Handler Functions

#### `handleGeneratePlan()`
- Calls `/api/ai/generate-action-plan` endpoint
- Auto-applies ALL AI suggestions to form fields:
  - Priority
  - Cognitive Load
  - Estimated Minutes
  - Due Date
  - Project (with fuzzy matching)
  - Labels
  - Description (if empty)
- Sets `planGenerated` to true
- Error handling with user alert

#### `handleCorrection()`
- Opens correction overlay

#### `handleCorrectionSubmit()`
- Closes correction overlay
- Sets AI understanding from correction text
- Re-fetches AI suggestions with correction as description
- Resets plan generation state

## Key Features

### ✅ Removed
- "Zgadza się" button (old accept button)
- Clickable suggestion badges (replaced with auto-apply)

### ✅ Added
- Two-button action flow (Doprecyzuj / Wygeneruj plan)
- Cognitive Load selector (4 levels)
- Action plan generation and display
- Auto-application of ALL AI suggestions
- Correction overlay with better UX
- Plan appended to task description
- Cognitive load as task label

### ✅ Enhanced
- Better visual hierarchy with emojis
- Clear color coding (purple for correction, green for plan)
- Loading states for all async operations
- Responsive grid layouts

## Visual Design Elements

### Colors & Gradients
- **AI Understanding Box:** `from-blue-50 to-purple-50` with `border-blue-200`
- **Generate Plan Button:** `from-blue-500 to-purple-500`
- **Correction Button:** `border-purple-300` with `hover:bg-purple-50`
- **Action Plan Box:** `from-green-50 to-emerald-50` with `border-green-200`
- **Parameters Box:** `bg-gray-50` with `border-gray-200`
- **Correction Modal:** Purple theme with purple-to-pink gradient button

### Icons Used (from @phosphor-icons/react)
- `Brain` - Cognitive Load
- `PencilSimple` - Correction
- `Lightning` - Generate/Regenerate
- `Sparkle` - AI indicator
- `Flag`, `Clock`, `CalendarBlank`, `FolderOpen`, `Tag` - Existing form fields

### Emojis
- 🤖 - AI understanding
- ✨ - Doprecyzuj button
- ⚡ - Wygeneruj plan button
- ✍️ - Correction input label
- 📋 - Action plan title
- 💡 - Info messages
- 📅, 📁, 🏷️ - Parameter badges

## Testing Checklist

- [ ] Enter task title and wait for AI suggestions
- [ ] Click "✨ Doprecyzuj" and submit correction
- [ ] Click "⚡ Wygeneruj plan" and verify:
  - [ ] Plan is displayed in green box
  - [ ] All parameters are auto-applied
  - [ ] Parameters badge box appears
  - [ ] Form fields are updated with suggestions
- [ ] Select cognitive load levels (C1-C4)
- [ ] Submit task and verify:
  - [ ] Action plan is appended to description
  - [ ] Cognitive load label is added
  - [ ] All other fields are saved correctly
- [ ] Test on mobile (responsive layouts)
- [ ] Test correction flow multiple times

## Files Modified

1. `app/api/ai/generate-action-plan/route.ts` - NEW
2. `components/assistant/CreateTaskModal.tsx` - MODIFIED (824 lines, +299 additions)

## Dependencies

No new dependencies added. Uses existing:
- `@phosphor-icons/react` (existing)
- `openai` (existing)
- `date-fns` (existing)
- All existing UI components

## API Integration

The implementation follows existing patterns:
- Uses `getOpenAIClient()` from `@/lib/openai`
- Follows error logging conventions with emoji prefixes
- Uses GPT-4o-mini model
- Returns JSON responses
- Proper error handling and user feedback
