# Visual Implementation Guide

## AI Insights Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Powrót                                                        │
│                                                                  │
│  ✨ AI Insights                                                 │
│  Personalne obserwacje bazujące na Twoich rzeczywistych danych  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ✨ Czym są AI Insights?                          [Purple Card] │
│  AI analizuje Twoje dane z dziennika, zadań i wzorców pracy    │
│  z ostatnich 30 dni...                                          │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │   15    │  │   42    │  │   8     │  │   25    │          │
│  │ Wpisy   │  │Ukończo- │  │Przełożeń│  │  Dni z  │          │
│  │dziennika│  │nych zad.│  │         │  │  planem │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ℹ️  Efektywność przy 7h snu                     [Blue Card]    │
│                                                                  │
│  Przy 7+ godzinach snu kończysz średnio 6 zadań dziennie.      │
│  Przy <6h - tylko 2 zadania.                                    │
│                                                                  │
│  Szczegóły:                                                     │
│  avg_tasks_7h_plus: 6                                           │
│  avg_tasks_under_6h: 2                                          │
│  avg_energy_7h_plus: 7.2                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  Niska jakość snu wpływa na motywację       [Orange Card]   │
│                                                                  │
│  Dni z jakością snu <5/10 mają 40% niższą motywację            │
│  i 3x więcej przełożeń.                                         │
│                                                                  │
│  Szczegóły:                                                     │
│  sleep_quality_threshold: 5                                     │
│  motivation_drop: 40%                                           │
│  postpone_increase: 3x                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ✅  100% ukończonych zadań w ostatnich 7 dniach [Green Card]   │
│                                                                  │
│  Świetna passa! Ukończyłeś wszystkie 12 zadania z 12 dodanych. │
│                                                                  │
│  Szczegóły:                                                     │
│  completion_rate: 100%                                          │
│  tasks_completed: 12                                            │
│  tasks_added: 12                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  📊 Podsumowanie ostatnich 30 dni                               │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  7.3h    │  │  5.7/10  │  │  5.7/10  │  │   100%   │      │
│  │  Średni  │  │  Średnia │  │  Średnia │  │ Wskaźnik │      │
│  │   sen    │  │  energia │  │motywacja │  │realizacji│      │
│  │jakość 7/10│ │          │  │          │  │12/12 zadań│     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│   [Blue]       [Green]       [Purple]      [Orange]          │
└─────────────────────────────────────────────────────────────────┘
```

## Decision Log Panel Structure

Located in Day Assistant V2 main content (bottom section):

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 Decision Log                                            [+]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [When + is clicked:]                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Opisz swoją decyzję...                                     │ │
│  │                                                            │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│  [Zapisz]  [Anuluj]                                            │
│                                                                  │
│  • Przełożyłem "Raport Q4" na jutro, bo mam dziś niską energię │
│    14:32                                                         │
│                                                                  │
│  • Dodałem przerwy między zadaniami dla lepszej koncentracji   │
│    11:15                                                         │
│                                                                  │
│  • Zamieniłem kolejność - zaczynam od łatwiejszego zadania     │
│    09:03                                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Insight Types

**Info (Blue)**
- Icon: ℹ️ Info (filled, blue)
- Background: `bg-blue-50`
- Border: `border-blue-200`
- Usage: Neutral observations, patterns, correlations

**Warning (Orange)**
- Icon: ⚠️ Warning (filled, orange)
- Background: `bg-orange-50`
- Border: `border-orange-200`
- Usage: Concerns, areas for improvement

**Success (Green)**
- Icon: ✅ CheckCircle (filled, green)
- Background: `bg-green-50`
- Border: `border-green-200`
- Usage: Achievements, positive trends

### Summary Cards

1. **Sleep Card** - Blue theme
   - `bg-blue-50`, `border-blue-200`
   - Shows: avg_hours_slept + avg_sleep_quality

2. **Energy Card** - Green theme
   - `bg-green-50`, `border-green-200`
   - Shows: avg_energy/10

3. **Motivation Card** - Purple theme
   - `bg-purple-50`, `border-purple-200`
   - Shows: avg_motivation/10

4. **Success Rate Card** - Orange theme
   - `bg-orange-50`, `border-orange-200`
   - Shows: completion percentage + tasks completed/added

## Navigation Flow

```
Sidebar
├── Zadania
├── Asystent Dnia ← [Contains Decision Log Panel]
├── Asystent Tygodnia
├── Dziennik
├── Decyzje
├── Społeczność
├── Wsparcie
└── [External Links]
    ├── ✨ AI Insights ← [NEW/UPDATED]
    └── 🌅 Poranny Brief
```

## Data Flow Diagram

```
User Action
    │
    ├─→ Navigate to AI Insights
    │      │
    │      ├─→ Fetch from API: /api/day-assistant-v2/insights
    │      │      │
    │      │      ├─→ Query journal_entries (30 days)
    │      │      ├─→ Query day_assistant_v2_tasks (30 days)
    │      │      ├─→ Query day_assistant_v2_decision_log (30 days)
    │      │      ├─→ Query day_assistant_v2_plan (30 days)
    │      │      │
    │      │      ├─→ Calculate Statistics
    │      │      │
    │      │      └─→ Generate AI Insights (OpenAI GPT-4o)
    │      │
    │      └─→ Display:
    │             ├─→ Info Card (4 metrics)
    │             ├─→ Insight Cards (5-7 insights)
    │             └─→ Summary Stats (4 cards)
    │
    └─→ Use Day Assistant V2
           │
           ├─→ View Decision Log
           │      │
           │      └─→ Fetch from day_assistant_v2_decision_log
           │
           └─→ Add Decision
                  │
                  └─→ Save to day_assistant_v2_decision_log
                         │
                         └─→ Update UI optimistically
```

## Example Insights

### Good Examples (with real data)

**Info Insight:**
```json
{
  "type": "info",
  "title": "Deep work rано rano lepsze wyniki",
  "description": "W godzinach 8-11 kończysz 80% zadań o wysokim cognitive load. Po 15:00 tylko 20%.",
  "details": {
    "morning_completion": "80%",
    "afternoon_completion": "20%",
    "best_hours": "8-11"
  }
}
```

**Warning Insight:**
```json
{
  "type": "warning",
  "title": "Zadanie 'Refactor API' przełożone 5 razy",
  "description": "Zawsze przełożone gdy energia <5. Zarezerwuj dzień z energią >7 i rozpocznij od tego zadania.",
  "details": {
    "task": "Refactor API",
    "postpone_count": 5,
    "avg_energy_at_postpone": 3.8,
    "recommended_energy": ">7"
  }
}
```

**Success Insight:**
```json
{
  "type": "success",
  "title": "Streak: 7 dni z planem dnia",
  "description": "Nieprzerwaną serię 7 dni z zaplanowanym dniem! Średnio 85% realizacji zadań.",
  "details": {
    "streak_days": 7,
    "avg_completion": "85%",
    "total_tasks": 47,
    "completed": 40
  }
}
```

## Responsive Design

### Desktop (>1024px)
- Info Card: 4 columns grid for metrics
- Insights: Full width cards with details expanded
- Summary: 4 columns grid

### Tablet (768-1024px)
- Info Card: 2x2 grid for metrics
- Insights: Full width cards
- Summary: 2x2 grid

### Mobile (<768px)
- Info Card: 2x2 grid (smaller)
- Insights: Stacked vertically
- Summary: 2x2 grid

## Loading States

### AI Insights Page
```
┌─────────────────────────────────────────────────────────────────┐
│                  [Spinning purple circle]                        │
│                                                                  │
│                  Analizuję Twoje dane...                        │
└─────────────────────────────────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────────────────────────────────┐
│                     [Gray Sparkle icon]                          │
│                                                                  │
│            Brak wystarczających danych                          │
│                                                                  │
│    Aby wygenerować insighty, potrzebujesz więcej danych         │
│    w dzienniku i zadaniach. Prowadź dziennik regularnie        │
│    przez kilka dni!                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

### API Error
```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ Błąd                                           [Red Card]    │
│  Nie udało się wygenerować insightów                            │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Log Error
- Toast notification: "Nie udało się zapisać decyzji"
- Console error logged
- UI state reverted

## Performance Metrics

### Expected Load Times
- Decision Log fetch: <200ms
- AI Insights generation: 2-5 seconds (OpenAI API)
- Page render: <100ms

### Data Limits
- Decision Log: 10 most recent entries
- Journal Entries: 30 days
- Tasks: 30 days
- AI Insights: 5-7 insights per request

## Accessibility

- All icons have weight="fill" for better visibility
- Color contrast meets WCAG AA standards
- Semantic HTML structure
- Keyboard navigation supported (via Next.js router)
- Screen reader friendly text

## Brand Colors Used

- Purple: `text-brand-purple`, `bg-purple-50`, `border-purple-200`
- Pink: `text-brand-pink`
- Gradient: `from-brand-purple to-brand-pink`

## Icons Used (Phosphor Icons)

- Sparkle (filled) - AI Insights
- ArrowLeft - Back button
- Warning (filled) - Warning insights
- CheckCircle (filled) - Success insights
- Info (filled) - Info insights
- NotePencil (filled) - Decision Log
- Plus (bold) - Add decision button
