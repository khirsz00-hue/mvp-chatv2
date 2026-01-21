# Meeting Notification System - Visual Guide

## Overview

This document provides visual descriptions and testing instructions for the Meeting Notification System.

## Components

### 1. MeetingNotificationBanner

The banner appears at the **very top** of the screen (z-index: 999) and slides down from above.

#### Appearance by Urgency Level

**🔴 CRITICAL (≤5 minutes):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [RED BACKGROUND - bg-red-600]                                       │
│                                                                     │
│  ⭕  🚨 TERAZ! • 14:00                    [Dołącz]  [X]             │
│     Daily Standup                                                   │
│     📍 Zoom Link                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**🟠 URGENT (≤15 minutes):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [ORANGE BACKGROUND - bg-orange-500]                                 │
│                                                                     │
│  ⭕  Za 15 min • 14:00                    [Dołącz]  [X]             │
│     Team Meeting                                                    │
│     📍 Google Meet                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

**🔵 NORMAL (>15 minutes):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [INDIGO BACKGROUND - bg-indigo-600]                                 │
│                                                                     │
│  ⭕  Za 30 min • 14:30                             [X]              │
│     Project Review                                                  │
│     📍 Conference Room A                                            │
└─────────────────────────────────────────────────────────────────────┘
```

#### Features

- **Icon**: Changes based on meeting type
  - 💻 Video icon for online meetings
  - 📍 Map pin for on-site meetings
  - ⏰ Clock for in-office meetings

- **Join Button**: Only appears for online meetings with meeting_link

- **Animation**: Slides down from top (0.3s ease-out)

- **Responsive**: Adapts to mobile and desktop screens

### 2. NotificationSettings

Settings panel for configuring notification preferences.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔔 Powiadomienia o spotkaniach                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ☑ Włącz powiadomienia o spotkaniach                                │
│   Otrzymasz przypomnienia przed każdym spotkaniem w kalendarzu      │
│                                                                     │
│ Kiedy przypominać? (przed spotkaniem)                              │
│                                                                     │
│ Selected times:                                                     │
│ [ 1h ] [x]  [ 30 min ] [x]  [ 15 min ] [x]  [ 5 min ] [x]         │
│                                                                     │
│ Add reminder:                                                       │
│ [+ 5 min]  [+ 10 min]  [+ 15 min]  [+ 30 min]  [+ 1 godz]  [+ 2 godz] │
│                                                                     │
│ Notification types:                                                 │
│ ☑ 🔊 Dźwięk powiadomienia                                          │
│ ☑ 🌐 Powiadomienia przeglądarki (desktop)                          │
│ ☑ 📢 Banner w aplikacji (zawsze widoczny)                          │
│                                                                     │
│ [         Zapisz ustawienia         ]                              │
└─────────────────────────────────────────────────────────────────────┘
```

#### Color Scheme

- **Accent Color**: Indigo (indigo-600)
- **Selected Pills**: Light indigo background (indigo-100)
- **Borders**: Slate-200
- **Text**: Slate-700/800

### 3. Integration in DayAssistantV2View

The notification banner appears **above** all other content:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [NOTIFICATION BANNER - if triggered]                                │
├─────────────────────────────────────────────────────────────────────┤
│ [FOCUS BAR - if timer active]                                       │
├─────────────────────────────────────────────────────────────────────┤
│ [STATUS BAR - always visible]                                       │
├─────────────────────────────────────────────────────────────────────┤
│ [OVERDUE ALERT - if overdue tasks]                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Main Content:                                                       │
│ - Meetings Section                                                  │
│ - MUST Tasks                                                        │
│ - Top 3 Tasks                                                       │
│ - etc.                                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Browser Notification

Desktop notification that appears outside the browser window:

```
┌─────────────────────────────────┐
│ 🔔 Spotkanie za 15 min          │
│                                 │
│ Daily Standup                   │
│                                 │
│ [From: MVP Chat]                │
└─────────────────────────────────┘
```

## Testing Checklist

### Visual Tests

- [ ] **Banner Slide Animation**
  - Opens: Slides down from top (smooth 0.3s)
  - Closes: Disappears instantly
  
- [ ] **Color Coding**
  - Red for ≤5 min
  - Orange for ≤15 min  
  - Indigo for >15 min

- [ ] **Responsive Design**
  - Desktop: Full width with max-width constraint
  - Mobile: Adapts to screen width
  - Text truncation works properly

- [ ] **Settings UI**
  - Pills display correctly
  - Add/remove buttons work
  - Checkboxes toggle properly
  - Save button is accessible

### Functional Tests

- [ ] **Notification Triggering**
  - Notifications appear at configured times
  - Multiple reminders work for same meeting
  - No duplicate notifications

- [ ] **Browser Notifications**
  - Permission request appears
  - Desktop notification shows
  - Click focuses window

- [ ] **Sound**
  - Plays when enabled
  - Silent when disabled
  - Fallback beep works if no file

- [ ] **Join Button**
  - Appears only for online meetings
  - Opens correct link
  - Dismisses banner after click

- [ ] **Dismissal**
  - X button removes banner
  - Banner doesn't reappear for same notification

### Edge Cases

- [ ] **No Meetings**: No notifications appear
- [ ] **Past Meetings**: No notifications for past meetings
- [ ] **Future Meetings**: Only today's meetings trigger notifications
- [ ] **Notifications Disabled**: No notifications when settings.enabled = false
- [ ] **Empty Reminder Times**: No notifications if defaultReminderTimes is empty
- [ ] **Browser Tab Inactive**: Notifications still trigger (browser notification helps)

## Browser Compatibility

### Tested Browsers

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

### Known Issues

- Safari: May require additional permission prompt for notifications
- Mobile: Browser notifications may not work on mobile browsers
- Notification sound: May not auto-play if user hasn't interacted with page

## Accessibility

- [ ] Keyboard navigation works in settings
- [ ] Screen readers announce notification banner
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators visible
- [ ] aria-label on dismiss button

## Performance

- [ ] Hook checks every 30 seconds (not too frequent)
- [ ] No memory leaks from interval
- [ ] Banner animation is smooth (60fps)
- [ ] No layout shift when banner appears

## Future Improvements

1. **Snooze Functionality**: "Remind me in 5 minutes"
2. **Notification History**: View past notifications
3. **Per-Meeting Settings**: Custom reminder times per meeting
4. **Smart Suggestions**: AI-suggested reminder times based on meeting type
5. **Meeting Preparation**: "Review agenda" notifications
6. **Calendar Sync**: Real-time updates from calendar
7. **Mobile Push**: Native mobile notifications

## Screenshots

*Note: Add screenshots here during manual testing*

### Banner Screenshots

1. Critical (Red) Banner - [Screenshot needed]
2. Urgent (Orange) Banner - [Screenshot needed]
3. Normal (Indigo) Banner - [Screenshot needed]

### Settings Screenshots

1. Notification Settings Panel - [Screenshot needed]
2. Adding Reminder Time - [Screenshot needed]
3. Saved State - [Screenshot needed]

### Browser Notification

1. Desktop Notification - [Screenshot needed]
2. Permission Prompt - [Screenshot needed]

### Mobile View

1. Mobile Banner - [Screenshot needed]
2. Mobile Settings - [Screenshot needed]
