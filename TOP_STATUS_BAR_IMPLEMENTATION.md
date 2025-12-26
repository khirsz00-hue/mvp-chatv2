# Implementacja górnego paska statusu (TopStatusBar)

## Przegląd zmian

Zreorganizowano interfejs "Asystent Dnia v2" tak, aby wszystkie kluczowe metryki i status pracy były wyświetlane w jednym, rozciągniętym na całą szerokość pasku na górze widoku.

## Implementacja techniczna

### 1. Nowy komponent: `TopStatusBar.tsx`

Utworzono nowy komponent w `components/day-assistant-v2/TopStatusBar.tsx` który zawiera:

**Wyświetlane elementy:**
- 🔥 **Streak**: Pokazuje obecną serię dni z ukończonymi zadaniami (używa `StreakDisplay`)
- 📊 **Zadania dzisiaj**: "X/Y zadań" - ukończone/wszystkie z dzisiaj
- ⏱️ **Czas**: "Xh Ymin / Zh Wmin (P%)" - zaplanowane/dostępne z procentem (używa `TimeStatsCompact`)
- 🎯 **Tryb pracy**: Wyświetla aktualnie wybrany tryb (Low Focus, Focus, Quick Wins) jako read-only badge
- **Aktualny status**:
  - Gdy timer włączony: "▶️ Pracujesz nad: [nazwa zadania]"
  - Gdy timer wyłączony: "👉 Pierwsze w kolejce: [nazwa zadania]"
  - Gdy brak zadań: "✨ Brak zadań"

**Cechy:**
- `sticky top-0 z-50` - pasek przykleja się do góry przy scrollowaniu
- Gradient background: `from-purple-50 to-blue-50`
- Border: `border-2 border-purple-200`
- Responsywny: `flex-wrap` - elementy zawijają się na mobile
- Shadow: `shadow-md` dla lepszej widoczności

### 2. Modyfikacje w `DayAssistantV2View.tsx`

**Dodane obliczenia (przed renderowaniem):**
```typescript
// Calculate today's task stats for TopStatusBar
const completedToday = useMemo(() => {
  return tasks.filter(t => t.completed && t.due_date === selectedDate).length
}, [tasks, selectedDate])

const totalToday = useMemo(() => {
  return tasks.filter(t => t.due_date === selectedDate).length
}, [tasks, selectedDate])

// Get first task in queue for TopStatusBar
const firstInQueue = useMemo(() => {
  if (mustTasks.length > 0) {
    return { title: mustTasks[0].title }
  }
  if (queue.length > 0) {
    return { title: queue[0].title }
  }
  return undefined
}, [mustTasks, queue])
```

**Zmiany w strukturze renderowania:**
1. ✅ Usunięto `StreakDisplay`, `ProgressRing`, `TimeStatsCompact` z CardHeader
2. ✅ Dodano `<TopStatusBar />` **przed** główną kartą `<Card>`
3. ✅ `CurrentActivityBox` pozostaje w swoim miejscu wewnątrz Card
4. ✅ `WorkModeSelector` pozostaje w swoim miejscu, ale informacja o trybie jest także w TopStatusBar

## Struktura końcowa

```
┌─────────────────────────────────────────────────────────────┐
│ TopStatusBar (full-width, sticky)                           │
│ 🔥 X dni | 📊 X/Y zadań | ⏱️ Xh Ymin/Zh Wmin (P%)         │
│ 🎯 Tryb: Focus | ▶️ Pracujesz nad: "Zadanie XYZ"          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Card: Asystent Dnia v2                           [⚙️]        │
│ ─────────────────────────────────────────────────────────   │
│ CurrentActivityBox (jeśli timer aktywny)                    │
│ WorkModeSelector                                            │
│ MomentumStatusBar                                           │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Rekomendacje (sidebar)                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Kolejka MUST                                                │
└─────────────────────────────────────────────────────────────┘

...
```

## Interface TopStatusBarProps

```typescript
export interface TopStatusBarProps {
  // Zadania
  completedToday: number
  totalToday: number
  
  // Czas
  usedMinutes: number
  availableMinutes: number
  usagePercentage: number
  
  // Tryb pracy
  workMode: WorkMode // 'focus' | 'low_focus' | 'quick_wins'
  
  // Aktualny status
  activeTimer?: {
    taskId: string
    taskTitle: string
    elapsedSeconds: number
    estimatedMinutes: number
  }
  firstInQueue?: {
    title: string
  }
}
```

## Korzyści z nowej struktury

1. **Widoczność metryk**: Wszystkie kluczowe informacje w jednym miejscu
2. **Sticky positioning**: Metryki zawsze widoczne podczas scrollowania
3. **Aktualny status**: Jasna informacja o tym, nad czym się pracuje lub co jest następne
4. **Responsywność**: Elementy automatycznie zawijają się na mniejszych ekranach
5. **Zachowana funkcjonalność**: Żadna istniejąca funkcjonalność nie została usunięta

## Pliki zmodyfikowane

- ✅ **Utworzony**: `components/day-assistant-v2/TopStatusBar.tsx` (132 linie)
- ✅ **Zmodyfikowany**: `components/day-assistant-v2/DayAssistantV2View.tsx`
  - Dodano import `TopStatusBar`
  - Dodano obliczenia `completedToday`, `totalToday`, `firstInQueue`
  - Usunięto bezpośrednie użycie `StreakDisplay`, `ProgressRing`, `TimeStatsCompact`
  - Dodano `<TopStatusBar />` przed główną kartą

## Status weryfikacji

- ✅ TypeScript compilation: SUCCESS
- ✅ Next.js build: SUCCESS (1 minor ESLint warning - pre-existing)
- ✅ ESLint: PASSED
- ✅ Zachowana logika biznesowa
- ✅ Brak breaking changes

## Następne kroki

Aby zobaczyć wizualizację zmian:
1. Uruchom aplikację: `npm run dev`
2. Zaloguj się do Asystent Dnia v2
3. Sprawdź nowy górny pasek statusu
4. Przetestuj responsywność (różne rozmiary ekranu)
5. Sprawdź zachowanie przy scrollowaniu (sticky)
