# Meeting Notification System - ADHD-Friendly Implementation

## Overview

This notification system is designed specifically for people with ADHD who often miss meetings even when looking at their calendar. It provides **active, persistent notifications** that ensure meetings are not overlooked.

## Features

### 1. Meeting Types with Default Notification Times

- 🏢 **On-site** (physical visit): Default reminder **40 min before** (travel time)
- 💻 **Online** (Google Meet, Zoom): Default reminder **15 min before**
- 🏠 **In-office** (in office): Default reminder **10 min before**

### 2. Multiple Reminders per Meeting

Users can set multiple reminders for each meeting:
- **60 min before** - first warning
- **30 min before** - second warning
- **15 min before** - third warning
- **5 min before** - "NOW!"

### 3. Three Notification Channels

1. **🔊 Sound Notification** - Audio alert
2. **🌐 Browser Notification** - Desktop notification (requires permission)
3. **📢 In-App Banner** - Large, prominent banner at top of screen

### 4. Urgency-Based Styling

- **Red (≤5 min)**: Critical - "🚨 TERAZ!"
- **Orange (≤15 min)**: Urgent
- **Indigo (>15 min)**: Normal

## Components

### NotificationSettings.tsx

Global settings component for configuring notification preferences:
- Enable/disable notifications
- Select default reminder times (5, 10, 15, 30, 60, 120 minutes)
- Toggle sound, browser notifications, and in-app banner
- Save settings to user preferences

**Location**: `components/day-assistant-v2/NotificationSettings.tsx`

### MeetingNotificationBanner.tsx

Prominent banner component that appears at the top of the screen:
- Displays meeting details (title, time, location)
- Color-coded by urgency
- "Join" button for online meetings
- Dismissible with X button
- Slide-down animation

**Location**: `components/day-assistant-v2/MeetingNotificationBanner.tsx`

### useMeetingNotifications.ts

Custom React hook that manages notification logic:
- Monitors meetings and triggers notifications at configured times
- Handles browser notification permissions
- Plays sound alerts
- Tracks which notifications have been shown (prevents duplicates)
- Checks every 30 seconds

**Location**: `hooks/useMeetingNotifications.ts`

## Database Schema

### user_notification_settings

Stores per-user notification preferences:

```sql
CREATE TABLE user_notification_settings (
  user_id UUID PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  default_reminder_times INTEGER[] DEFAULT ARRAY[30, 15, 5],
  sound_enabled BOOLEAN DEFAULT true,
  browser_notifications BOOLEAN DEFAULT true,
  in_app_banner BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### meeting_custom_reminders

Stores custom reminder times for specific meetings:

```sql
CREATE TABLE meeting_custom_reminders (
  id UUID PRIMARY KEY,
  meeting_id UUID REFERENCES day_assistant_v2_meetings(id),
  user_id UUID REFERENCES auth.users(id),
  reminder_times INTEGER[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Integration

The notification system is integrated into `DayAssistantV2View`:

```tsx
// 1. Import components and hook
import { useMeetingNotifications } from '@/hooks/useMeetingNotifications'
import { MeetingNotificationBanner } from './MeetingNotificationBanner'

// 2. Configure notification settings
const [notificationSettings, setNotificationSettings] = useState({
  enabled: true,
  defaultReminderTimes: [30, 15, 5],
  soundEnabled: true,
  browserNotifications: true,
  inAppBanner: true
})

// 3. Use the hook
const { upcomingNotification, dismissNotification } = useMeetingNotifications(
  meetings,
  notificationSettings
)

// 4. Render the banner
{upcomingNotification && (
  <MeetingNotificationBanner
    meeting={upcomingNotification}
    onDismiss={dismissNotification}
    onJoin={() => {
      // Open meeting link
      const meeting = meetings.find(m => m.id === upcomingNotification.meetingId)
      if (meeting?.meeting_link) {
        window.open(meeting.meeting_link, '_blank')
      }
      dismissNotification()
    }}
  />
)}
```

## CSS Animations

Added to `app/globals.css`:

```css
@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slideDown {
  animation: slideDown 0.3s ease-out;
}
```

## Usage

### For Users

1. **Enable Notifications**: Go to notification settings and toggle on
2. **Set Reminder Times**: Choose when you want to be reminded (5, 10, 15, 30, 60, or 120 minutes before)
3. **Choose Notification Types**: Enable sound, browser notifications, and/or in-app banner
4. **Save Settings**: Click "Save" to persist your preferences

### For Developers

**Adding the NotificationSettings UI:**

```tsx
import { NotificationSettings } from '@/components/day-assistant-v2/NotificationSettings'

<NotificationSettings
  settings={notificationSettings}
  onSave={setNotificationSettings}
/>
```

**Customizing Reminder Times:**

Modify the `PRESET_TIMES` array in `NotificationSettings.tsx`:

```tsx
const PRESET_TIMES = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 godz', value: 60 },
  { label: '2 godz', value: 120 }
]
```

## Testing

### Manual Test Scenarios

1. **Test Notification Triggering**:
   - Create a test meeting 30 minutes in the future
   - Set reminder for 30 minutes
   - Wait for notification to appear

2. **Test Multiple Reminders**:
   - Set reminders at [60, 30, 15, 5] minutes
   - Verify all notifications trigger at correct times

3. **Test Urgency Styling**:
   - Verify red banner for ≤5 min
   - Verify orange banner for ≤15 min
   - Verify indigo banner for >15 min

4. **Test Browser Notifications**:
   - Grant browser notification permission
   - Verify desktop notification appears
   - Test clicking notification to focus window

5. **Test Sound**:
   - Enable sound notifications
   - Verify sound plays when notification triggers

6. **Test Dismissal**:
   - Click X button on banner
   - Verify banner disappears

7. **Test Join Button**:
   - For online meetings, verify "Join" button appears
   - Click "Join" and verify meeting link opens

## Known Limitations

1. **Sound File**: Currently uses a fallback beep sound. Add `/public/sounds/notification.mp3` for custom sound.
2. **Meeting Icon**: Browser notifications use `/public/icons/meeting-icon.png` which needs to be added.
3. **Browser Notification Permission**: Users must grant permission for desktop notifications.
4. **Check Interval**: Notifications are checked every 30 seconds, so there's a ±30s tolerance window.

## Future Enhancements

- [ ] Per-meeting custom reminder times
- [ ] Smart reminder suggestions based on meeting type
- [ ] Snooze functionality
- [ ] Integration with calendar sync
- [ ] Mobile push notifications
- [ ] Notification history
- [ ] Meeting preparation reminders (e.g., "Review agenda")

## Files Modified/Created

**New Files:**
- `components/day-assistant-v2/NotificationSettings.tsx`
- `components/day-assistant-v2/MeetingNotificationBanner.tsx`
- `hooks/useMeetingNotifications.ts`
- `supabase/migrations/20260121_meeting_notifications.sql`
- `public/sounds/README.md`
- `public/icons/README.md`

**Modified Files:**
- `components/day-assistant-v2/DayAssistantV2View.tsx`
- `app/globals.css`

## Support

For issues or questions, refer to the main repository documentation or create an issue.
