# Morning Brief - Daily Recap Feature

## 🎯 Overview

The **Morning Brief** (Poranny Brief) is a daily recap feature designed specifically for users with ADHD to help them quickly get context about their tasks and start their day with a clear focus.

## 🚀 Features

### 1. Daily Task Summary
- **Yesterday's Recap**: Shows completed tasks from the previous day
- **Today's Plan**: Displays tasks scheduled for today, sorted by priority
- **Focus Task**: AI-suggested task to start with (highest priority)
- **Last Activity**: Shows where you left off yesterday

### 2. Text-to-Speech (TTS)
- **Voice Playback**: Listen to your daily summary in Polish
- **Controls**: Play, Pause, Resume, and Stop functionality
- **Smart Rate**: Slightly slower speech (0.9x) for better comprehension
- **Polish Language**: Native `pl-PL` voice support

### 3. Smart Caching
- **Daily Cache**: Data is cached per day to minimize API calls
- **Auto-Refresh**: Automatically fetches fresh data on the first visit each day
- **Manual Refresh**: Button to refresh data on demand

### 4. ADHD-Friendly Design
- **Quick Actions**: "Only Today" toggle to hide yesterday's data
- **Visual Indicators**: Priority-based color coding (red for high priority)
- **Progress Bars**: Visual representation of completion rates
- **Helpful Tips**: Built-in productivity tips for ADHD users
- **Large Buttons**: Easy-to-click interface elements

## 📂 File Structure

```
app/morning-brief/
├── page.tsx                    # Main Morning Brief page
├── components/
│   ├── RecapCard.tsx          # Task list card component (yesterday/today)
│   ├── TTSPlayer.tsx          # Text-to-speech player component
│   └── QuickStats.tsx         # Statistics and progress bars
└── hooks/
    └── useMorningBrief.ts     # Data fetching and caching hook

app/api/recap/
├── yesterday/route.ts          # API: Yesterday's completed tasks
├── today/route.ts             # API: Today's scheduled tasks
└── summary/route.ts           # API: Complete TTS-ready summary
```

## 🔌 API Endpoints

### POST /api/recap/yesterday
Returns completed tasks from yesterday with statistics.

**Request Body:**
```json
{
  "token": "todoist_api_token"
}
```

**Response:**
```json
{
  "tasks": [...],
  "lastActiveTask": { ... },
  "stats": {
    "completed": 5,
    "total": 5
  }
}
```

### POST /api/recap/today
Returns today's scheduled tasks with focus task suggestion.

**Request Body:**
```json
{
  "token": "todoist_api_token"
}
```

**Response:**
```json
{
  "tasks": [...],
  "focusTask": { ... },
  "stats": {
    "total": 8,
    "highPriority": 3
  }
}
```

### POST /api/recap/summary
Returns a complete summary ready for text-to-speech.

**Request Body:**
```json
{
  "token": "todoist_api_token"
}
```

**Response:**
```json
{
  "textToSpeak": "Dzień dobry! Wczoraj ukończyłeś...",
  "yesterdayData": { ... },
  "todayData": { ... }
}
```

## 🔒 Security

All API endpoints use **POST requests** with the Todoist token in the request body (not in URL parameters) to prevent:
- Token exposure in server logs
- Token leakage through browser history
- Token exposure in referrer headers

## 🎨 UI Components

### RecapCard
Displays a list of tasks for a specific day with:
- Priority indicators (colored dots)
- Task content
- Due dates (if available)
- Icon differentiation (CheckCircle for yesterday, Clock for today)

### TTSPlayer
Text-to-speech player with:
- Play/Pause/Stop controls
- Auto-play support (with delay to allow page render)
- Polish language voice
- Error handling for unsupported browsers

### QuickStats
Statistics panel showing:
- Yesterday's completion rate with progress bar
- Today's task count
- High vs. normal priority breakdown
- Visual indicators using color-coded boxes

## 🎯 Usage

1. **Access**: Click "Poranny Brief" in the sidebar (below "AI Insights")
2. **Listen**: Click "Odtwórz dzień" to hear your daily summary
3. **Review**: Scroll through yesterday's completed tasks and today's plan
4. **Focus**: Check the highlighted "Focus Task" suggestion
5. **Toggle**: Use "Tylko dzisiaj" to show only today's tasks

## 🔧 Integration

The feature integrates with:
- **Todoist API**: Fetches tasks via existing `/api/todoist/tasks` endpoint
- **Supabase Auth**: Requires authenticated user session
- **localStorage**: Caches daily data and stores Todoist token
- **Web Speech API**: Browser-native TTS functionality

## 📱 Responsive Design

The Morning Brief is fully responsive:
- **Desktop**: Full-width layout with all features visible
- **Mobile**: Stacked layout with touch-friendly buttons
- **Tablet**: Optimized for medium-sized screens

## ♿ Accessibility

ADHD-friendly design principles:
- **Large targets**: Easy-to-tap buttons (lg size)
- **Clear hierarchy**: Visual separation of sections
- **Minimal cognitive load**: Shows most important info first
- **Progress indicators**: Visual feedback on completion
- **Color coding**: Priority-based visual cues

## 🐛 Error Handling

The feature gracefully handles:
- Missing Todoist token (redirects to login or shows helpful message)
- API failures (shows error with retry button)
- No tasks (displays friendly empty state messages)
- Unsupported TTS (silently degrades, buttons still work)

## 🔄 Caching Strategy

- **Cache Key**: `morning_brief_date` (date string)
- **Cache Data**: `morning_brief_data` (full recap data)
- **Cache Duration**: Until midnight (new day)
- **Cache Invalidation**: Manual refresh or new day detected
- **Cache Storage**: Browser localStorage

## 📊 Data Flow

1. User opens Morning Brief page
2. `useMorningBrief` hook checks cache
3. If cached data is from today → use cached data
4. If no cache or old data → fetch from API
5. API fetches from Todoist using POST method
6. Data is processed and cached
7. UI renders with data
8. TTS summary is generated and ready

## 🎓 Best Practices

The implementation follows:
- ✅ Secure token handling (POST body, not URL)
- ✅ Proper error boundaries and fallbacks
- ✅ Responsive and accessible design
- ✅ Emoji logging conventions (🔍, ✅, ❌, ⚠️)
- ✅ TypeScript for type safety
- ✅ React best practices (hooks, memoization)
- ✅ Consistent with existing codebase style

## 🚧 Future Enhancements

Potential improvements (not implemented):
- Push notifications for morning brief
- End-of-day note saving for next morning
- Floating Action Button (FAB) on mobile
- Integration with Day Assistant v2
- Customizable TTS voice and rate
- Weekly recap in addition to daily

## 📝 Notes

- Requires Todoist account and connected token
- TTS requires browser support (most modern browsers)
- Best used first thing in the morning
- Designed for daily routine establishment
- Optimized for ADHD productivity patterns
