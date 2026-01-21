# Meeting Notification System - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MEETING NOTIFICATION SYSTEM                      │
│                  (ADHD-Friendly Active Notifications)                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ DayAssistantV2View.tsx                                       │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │ MeetingNotificationBanner                            │   │  │
│  │  │ - Fixed position (z-index: 999)                     │   │  │
│  │  │ - Slide-down animation                              │   │  │
│  │  │ - Color-coded urgency                               │   │  │
│  │  │ - Join button (online meetings)                     │   │  │
│  │  │ - Dismissible                                       │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │  [Focus Bar]                                                 │  │
│  │  [Status Bar]                                                │  │
│  │  [Main Content...]                                           │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │ NotificationSettings (in sidebar/modal)              │   │  │
│  │  │ - Enable/disable toggle                              │   │  │
│  │  │ - Reminder time selector                             │   │  │
│  │  │ - Notification type checkboxes                       │   │  │
│  │  │ - Save button                                        │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          BUSINESS LOGIC LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ useMeetingNotifications Hook                                 │  │
│  │                                                              │  │
│  │  Input:                                                      │  │
│  │  - meetings: Meeting[]                                       │  │
│  │  - settings: NotificationSettings                            │  │
│  │                                                              │  │
│  │  Logic:                                                      │  │
│  │  1. Check meetings every 30 seconds                          │  │
│  │  2. Calculate minutesUntil for each meeting                  │  │
│  │  3. Match against reminderTimes                              │  │
│  │  4. Prevent duplicates (Set)                                 │  │
│  │  5. Trigger notifications                                    │  │
│  │                                                              │  │
│  │  Output:                                                     │  │
│  │  - upcomingNotification: UpcomingNotification | null         │  │
│  │  - dismissNotification: () => void                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION CHANNELS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │ 🔊 Sound        │  │ 🌐 Browser     │  │ 📢 In-App Banner   │   │
│  │                │  │                │  │                    │   │
│  │ - Play MP3     │  │ - Permission   │  │ - Show banner      │   │
│  │ - Fallback     │  │ - Desktop      │  │ - Persistent       │   │
│  │   beep         │  │   notification │  │ - Dismissible      │   │
│  │                │  │ - Click focus  │  │                    │   │
│  └────────────────┘  └────────────────┘  └────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Supabase Database                                            │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │ user_notification_settings                             │ │  │
│  │  │ - user_id                                              │ │  │
│  │  │ - enabled: boolean                                     │ │  │
│  │  │ - default_reminder_times: integer[]                    │ │  │
│  │  │ - sound_enabled: boolean                               │ │  │
│  │  │ - browser_notifications: boolean                       │ │  │
│  │  │ - in_app_banner: boolean                               │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │ meeting_custom_reminders                               │ │  │
│  │  │ - id                                                   │ │  │
│  │  │ - meeting_id                                           │ │  │
│  │  │ - user_id                                              │ │  │
│  │  │ - reminder_times: integer[]                            │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │ day_assistant_v2_meetings                              │ │  │
│  │  │ - id, user_id, assistant_id                            │ │  │
│  │  │ - google_event_id, title                               │ │  │
│  │  │ - start_time, end_time                                 │ │  │
│  │  │ - type: 'on-site' | 'online' | 'in-office'            │ │  │
│  │  │ - location, meeting_link                               │ │  │
│  │  │ - metadata                                             │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Notification Check Flow

```
Every 30 seconds:
  ↓
useMeetingNotifications
  ↓
Get current time
  ↓
For each meeting:
  ↓
  Calculate minutesUntil
  ↓
  Is minutesUntil ≈ reminderTime?
    ↓ YES
    ┌─────────────────────────────────────┐
    │ Check if already notified            │
    │ (notifiedMeetings Set)               │
    └─────────────────────────────────────┘
      ↓ NOT NOTIFIED
      ┌─────────────────────────────────────┐
      │ Trigger Notifications:               │
      │                                     │
      │ 1. Show in-app banner               │
      │    setUpcomingNotification()        │
      │                                     │
      │ 2. Play sound                       │
      │    playNotificationSound()          │
      │                                     │
      │ 3. Show browser notification        │
      │    showBrowserNotification()        │
      │                                     │
      │ 4. Mark as notified                 │
      │    Add to notifiedMeetings Set      │
      └─────────────────────────────────────┘
```

### 2. Banner Display Flow

```
upcomingNotification changes
  ↓
MeetingNotificationBanner receives new meeting
  ↓
setIsVisible(true)
  ↓
Slide-down animation triggers
  ↓
Banner displays at top of screen
  ↓
User actions:
  ├─ Click [X] → dismissNotification()
  ├─ Click [Join] → open link + dismissNotification()
  └─ Wait → stays visible until dismissed
```

### 3. Settings Flow

```
User opens NotificationSettings
  ↓
Configure preferences:
  - Enable/disable
  - Select reminder times
  - Toggle channels
  ↓
Click "Save"
  ↓
onSave(newSettings)
  ↓
Parent component updates state
  ↓
useMeetingNotifications receives new settings
  ↓
Future notifications use new settings
```

## Component Hierarchy

```
DayAssistantV2View
  │
  ├─ MeetingNotificationBanner
  │  └─ Props: { meeting, onDismiss, onJoin }
  │
  ├─ useMeetingNotifications(meetings, settings)
  │  └─ Returns: { upcomingNotification, dismissNotification }
  │
  ├─ NotificationSettings (optional sidebar/modal)
  │  └─ Props: { settings, onSave }
  │
  └─ [Rest of day assistant components...]
```

## State Management

```typescript
// In DayAssistantV2View
const [meetings, setMeetings] = useState<Meeting[]>([])
const [notificationSettings, setNotificationSettings] = useState({
  enabled: true,
  defaultReminderTimes: [30, 15, 5],
  soundEnabled: true,
  browserNotifications: true,
  inAppBanner: true
})

// Hook provides
const { upcomingNotification, dismissNotification } = 
  useMeetingNotifications(meetings, notificationSettings)
```

## Urgency Classification

```
minutesUntil  │  Color   │  Text          │  Priority
─────────────────────────────────────────────────────
    ≤5        │  Red     │  🚨 TERAZ!     │  Critical
   ≤15        │  Orange  │  Za 15 min     │  Urgent
   >15        │  Indigo  │  Za 30 min     │  Normal
```

## Files Structure

```
mvp-chatv2/
├── components/
│   └── day-assistant-v2/
│       ├── NotificationSettings.tsx          (187 lines)
│       ├── MeetingNotificationBanner.tsx     (123 lines)
│       └── DayAssistantV2View.tsx            (modified)
│
├── hooks/
│   ├── useMeetingNotifications.ts            (189 lines)
│   └── __tests__/
│       └── useMeetingNotifications.test.ts   (test scenarios)
│
├── supabase/
│   └── migrations/
│       └── 20260121_meeting_notifications.sql
│
├── app/
│   └── globals.css                           (slideDown animation)
│
├── public/
│   ├── sounds/
│   │   └── notification.mp3                  (to be added)
│   └── icons/
│       └── meeting-icon.png                  (to be added)
│
└── docs/
    ├── MEETING_NOTIFICATIONS_IMPLEMENTATION.md
    ├── MEETING_NOTIFICATIONS_VISUAL_GUIDE.md
    └── MEETING_NOTIFICATIONS_SUMMARY.md
```

## Browser APIs Used

```
┌──────────────────────────────────────────────┐
│ Notification API                             │
│ - Request permission                         │
│ - Show desktop notification                  │
│ - Handle click to focus                      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Audio API                                    │
│ - new Audio(src)                             │
│ - audio.play()                               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Web Audio API (fallback)                     │
│ - AudioContext                               │
│ - createOscillator()                         │
│ - Generate beep sound                        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Timer APIs                                   │
│ - setInterval (30s check)                    │
│ - Date/Time calculations                     │
└──────────────────────────────────────────────┘
```

## Error Handling

```
Browser Notifications:
  - Permission denied → Skip silently
  - Not supported → Skip silently
  - Error showing → Log error, continue

Sound Playback:
  - File not found → Use fallback beep
  - Play blocked → Log warning, continue
  - AudioContext error → Log error, continue

Notification Check:
  - Invalid meeting data → Skip meeting
  - Time calculation error → Skip meeting
  - Settings disabled → Skip all checks
```

## Performance Considerations

1. **Check Interval**: 30 seconds (balance between accuracy and performance)
2. **Tolerance Window**: ±1 minute (prevents missing notifications)
3. **Duplicate Prevention**: Set data structure (O(1) lookup)
4. **Memory Management**: Cleanup intervals on unmount
5. **Animation**: CSS-based (GPU accelerated)

## Security Considerations

1. **RLS Policies**: All tables have row-level security
2. **User Isolation**: Users can only access their own settings/reminders
3. **XSS Prevention**: React escapes all rendered text
4. **SQL Injection**: Parameterized queries (Supabase)

## Accessibility

1. **Keyboard Navigation**: All interactive elements keyboard accessible
2. **Screen Readers**: Semantic HTML, ARIA labels
3. **Color Contrast**: WCAG AA compliant
4. **Focus Indicators**: Visible focus rings
5. **Alternative Text**: All icons have text labels

This architecture ensures a robust, performant, and accessible notification system specifically designed for ADHD users who need active, persistent meeting reminders.
