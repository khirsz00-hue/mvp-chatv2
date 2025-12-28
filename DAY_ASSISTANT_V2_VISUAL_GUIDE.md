# Day Assistant V2 - Visual Design Guide

## 🎨 New Task Card Design

### Example: High Priority Task with All Badges

```
┌──────────────────────────────────────────────────────────────────────┐
│ [#1] [📌 MUST] [🚩 P1] [⏰ Dziś 17:00] [🧠 3/5] [⏱ 30m] [📁 IT]     │
│                                                                        │
│ [▶️ Start]                                          [⋮]               │
│                                                                        │
│ Napisać raport kwartalny Q4                                          │
│                                                                        │
│ Przygotować szczegółową analizę wyników sprzedażowych...             │
│                                                                        │
│ ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│ 📊 Score: 125  ℹ️  ← hover for breakdown                            │
└──────────────────────────────────────────────────────────────────────┘
```

### Example: AI-Inferred Context with Postpone Warning

```
┌──────────────────────────────────────────────────────────────────────┐
│ [#3] [🚩 P2] [📅 Jutro] [🧠 2/5] [⏱ 45m] [📁 KAMPANIE ✨]          │
│                                                                        │
│ [▶️ Start]                                          [⋮]               │
│                                                                        │
│ Zaktualizować landing page dla nowej kampanii                        │
│                                                                        │
│ ⚠️ Odkładane już 4x - może warto podzielić?                         │
│                                                                        │
│ ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│ 📊 Score: 45  ℹ️                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## 🎯 Badge Reference Guide

### Position Badge
- **Style**: Circle with purple background
- **Examples**: `#1`, `#2`, `#3`
- **Purpose**: Shows task's position in queue

### MUST Badge
- **Style**: Red background, white text
- **Icon**: 📌
- **Text**: `MUST`
- **Purpose**: Indicates pinned/must-do task

### Priority Badges
| Priority | Label | Color | Style |
|----------|-------|-------|-------|
| P1 | 🚩 P1 | Red | `bg-red-100 text-red-800` |
| P2 | 🚩 P2 | Orange | `bg-orange-100 text-orange-800` |
| P3 | 🚩 P3 | Blue | `bg-blue-100 text-blue-800` |
| P4 | 🚩 P4 | Gray | `bg-gray-100 text-gray-600` |

### Deadline Badges
| Status | Label | Color | Style |
|--------|-------|-------|-------|
| Overdue | 🔴 Przeterminowane | Red (dark) | `bg-red-600 text-white` |
| Due today (with time) | ⏰ Dziś 17:00 | Orange | `bg-orange-100 text-orange-800` |
| Due today (no time) | ⏰ Dziś | Orange | `bg-orange-100 text-orange-800` |
| Tomorrow | 📅 Jutro | Yellow | `bg-yellow-100 text-yellow-800` |
| 2-7 days | 📅 Za 3d | Blue | `bg-blue-100 text-blue-800` |
| 8+ days | 📅 Za 10d | Gray | `bg-gray-100 text-gray-600` |

## 🎨 Color Palette

### Primary Colors
- **Brand Purple**: `#8B5CF6` - Primary actions, position badges
- **Red**: `#EF4444` - Urgent, MUST, overdue
- **Orange**: `#F97316` - High priority, today's deadline
- **Blue**: `#3B82F6` - Medium priority
- **Gray**: `#6B7280` - Low priority
- **Green**: `#10B981` - Success, easy tasks
- **Yellow**: `#F59E0B` - Warning, postpone alerts
- **Indigo**: `#6366F1` - Context badges
