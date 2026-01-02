# 🎯 Universal Task Modal - Implementation Complete

## ✅ Zrealizowane zadania:

### 1. Utworzenie UniversalTaskModal
- ✅ Skopiowano bazę z `NewTaskModal.tsx` → `components/common/UniversalTaskModal.tsx`
- ✅ Usunięto checkboxy MUST/Ważne
- ✅ Usunięto sekcję "Typ pracy" (Deep Work/Admin/Komunikacja)
- ✅ Dodano dropdown "Projekt" z Todoist API
- ✅ Zmieniono "Tagi" na "Etykiety" z Todoist labels API
- ✅ Zaimplementowano logikę CREATE vs EDIT mode (bazując na `task` prop)
- ✅ Dodano uniwersalny interface props

### 2. Collapsible Sections
Utworzono komponent `CollapsibleSection.tsx` oraz 4 sekcje w modalu:

1. **🤖 Jak AI rozumie zadanie**
   - Przycisk "Doprecyzuj"
   - Przycisk "Wygeneruj plan"
   - Wyświetlanie AI understanding

2. **📋 Podzadania (X/Y)**
   - Input do dodawania podzadań
   - Lista z checkboxami
   - Licznik ukończonych

3. **⏱️ Mierzenie czasu**
   - Tab: Manual timer
   - Tab: Pomodoro
   - Historia ostatnich 3 sesji

4. **🕐 Historia zmian** (tylko w EDIT mode)
   - Lista zmian z timestampami
   - Porównanie old → new values

### 3. Integracja w Day Assistant V2
Lokalizacja: `components/day-assistant-v2/DayAssistantV2View.tsx`

**Zastąpiono:**
- ❌ `TaskDetailsModal` (read-only) → ✅ `UniversalTaskModal`
- ❌ `CreateTaskModal` → ✅ `UniversalTaskModal`
- ❌ `NewTaskModal` → ✅ `UniversalTaskModal`
- ❌ `QuickAddModal` → ✅ `UniversalTaskModal`

**Dodano:**
- Handler `handleUniversalTaskSave(taskData: TaskData)`
- State: `showUniversalModal`, `universalModalTask`
- Mapowanie TestDayTask → TaskData

**Punkty wejścia:**
- Kliknięcie w TaskCard
- Przycisk "+" w interface
- Wszystkie miejsca używające `setSelectedTask`

### 4. Integracja w Tasks Assistant
Lokalizacja: `components/assistant/TasksAssistant.tsx`

**Zastąpiono:**
- ❌ `TaskDetailsModal` (Task Cockpit Pro) → ✅ `UniversalTaskModal`
- ❌ `CreateTaskModal` → ✅ `UniversalTaskModal`

**Dodano:**
- Handler `handleUniversalTaskSave(taskData: TaskData)`
- State: `showUniversalModal`, `universalModalTask`
- Mapowanie Task → TaskData

**Punkty wejścia:**
- Kliknięcie w TaskCard
- Przycisk "Dodaj zadanie"
- Przycisk "Dodaj pierwsze zadanie" (empty state)
- SevenDaysBoardView onDetails

### 5. Integracja Quick Add (Ctrl+K)
Lokalizacja: `components/layout/MainLayout.tsx`

**Zastąpiono:**
- ❌ `NewTaskModal` → ✅ `UniversalTaskModal`

**Punkty wejścia:**
- Skrót Ctrl+K (globalny)
- FloatingAddButton (prawy dolny róg)

**Handler:**
- Zaktualizowano `handleQuickAdd` dla nowego interface `TaskData`

### 6. Cleanup
Usunięte pliki (nie są już potrzebne):
- ✅ `components/day-assistant-v2/NewTaskModal.tsx`
- ✅ `components/day-assistant-v2/QuickAddModal.tsx`
- ✅ `components/day-assistant-v2/TaskDetailsModal.tsx`
- ✅ `components/assistant/CreateTaskModal.tsx`
- ✅ `components/assistant/TaskDetailsModal.tsx`

---

## 📍 Mapa użycia UniversalTaskModal w aplikacji:

```
UniversalTaskModal
├── Day Assistant V2 (DayAssistantV2View.tsx)
│   ├── CREATE mode: Przycisk "+", Quick actions
│   └── EDIT mode: Kliknięcie w TaskCard
│
├── Tasks Assistant (TasksAssistant.tsx)
│   ├── CREATE mode: "Dodaj zadanie", "Dodaj pierwsze zadanie"
│   └── EDIT mode: Kliknięcie w TaskCard, SevenDaysBoardView
│
└── Global Quick Add (MainLayout.tsx)
    ├── Ctrl+K (keyboard shortcut)
    └── FloatingAddButton (prawy dolny róg)
```

---

## 🎨 Props UniversalTaskModal:

```typescript
interface UniversalTaskModalProps {
  // Core
  open: boolean
  onOpenChange: (open: boolean) => void
  
  // Data
  task?: TaskData | null  // null = CREATE, obiekt = EDIT
  defaultDate?: string    // Pre-fill date
  
  // Handlers
  onSave: (taskData: TaskData) => void | Promise<void>
  onDelete?: (taskId: string) => void | Promise<void>
  onComplete?: (taskId: string) => void | Promise<void>
  
  // Optional overrides
  title?: string
  hideSubtasks?: boolean
  hideTimeTracking?: boolean
  hideHistory?: boolean
}

interface TaskData {
  id?: string
  content: string
  description?: string
  estimated_minutes: number
  cognitive_load: number
  project_id?: string
  priority: 1 | 2 | 3 | 4
  due?: string
  labels?: string[]
}
```

---

## 🔧 Kluczowe zmiany techniczne:

### State management
**Przed:**
```typescript
const [showCreateModal, setShowCreateModal] = useState(false)
const [selectedTask, setSelectedTask] = useState<Task | null>(null)
const [showDetailsModal, setShowDetailsModal] = useState(false)
```

**Po:**
```typescript
const [showUniversalModal, setShowUniversalModal] = useState(false)
const [universalModalTask, setUniversalModalTask] = useState<Task | null>(null)
```

### Otwieranie modalu
**CREATE mode:**
```typescript
setUniversalModalTask(null)
setShowUniversalModal(true)
```

**EDIT mode:**
```typescript
setUniversalModalTask(task)
setShowUniversalModal(true)
```

### Handler patterns
Każdy view ma własny `handleUniversalTaskSave`, który:
1. Sprawdza czy `taskData.id` istnieje (EDIT vs CREATE)
2. Wywołuje odpowiedni API endpoint
3. Aktualizuje lokalny state
4. Wyświetla toast notification

---

## ✅ Zakończone kroki implementacji:

1. ✅ Utworzenie UniversalTaskModal z wszystkimi funkcjami
2. ✅ Utworzenie CollapsibleSection (reusable component)
3. ✅ Integracja w Day Assistant V2
4. ✅ Integracja w Tasks Assistant
5. ✅ Integracja Quick Add (Ctrl+K + FloatingButton)
6. ✅ Usunięcie starych plików
7. ✅ Naprawienie błędów TypeScript

---

## 🧪 Checklist testowania:

### Day Assistant V2
- [ ] Otwórz modal przez przycisk "+" (CREATE mode)
- [ ] Dodaj nowe zadanie z pełnymi danymi
- [ ] Kliknij w istniejące zadanie (EDIT mode)
- [ ] Edytuj zadanie i zapisz
- [ ] Sprawdź czy dropdown "Projekt" działa
- [ ] Sprawdź czy "Etykiety" działają
- [ ] Otwórz sekcję "Jak AI rozumie zadanie"
- [ ] Otwórz sekcję "Podzadania" i dodaj podzadanie
- [ ] Otwórz sekcję "Mierzenie czasu" - Manual tab
- [ ] Sprawdź sekcję "Historia zmian" (EDIT mode)

### Tasks Assistant
- [ ] Otwórz modal przez "Dodaj zadanie" (CREATE mode)
- [ ] Dodaj nowe zadanie
- [ ] Kliknij w istniejące zadanie (EDIT mode)
- [ ] Edytuj zadanie i zapisz
- [ ] Usuń zadanie przez modal
- [ ] Oznacz zadanie jako ukończone przez modal

### Quick Add (Global)
- [ ] Naciśnij Ctrl+K
- [ ] Modal otwiera się w CREATE mode
- [ ] Dodaj zadanie
- [ ] Kliknij FloatingAddButton (prawy dolny róg)
- [ ] Modal otwiera się w CREATE mode

### Todoist Integration
- [ ] Sprawdź czy projekty ładują się z API
- [ ] Sprawdź czy etykiety ładują się z API
- [ ] Wybierz projekt i zapisz
- [ ] Wybierz etykiety i zapisz
- [ ] Sprawdź w Todoist czy dane się zapisały

### Collapsible Sections
- [ ] Wszystkie sekcje domyślnie zwinięte
- [ ] Kliknięcie rozwija sekcję
- [ ] Kliknięcie ponownie zwija sekcję
- [ ] Timer działa (Start/Pause/Stop)
- [ ] Podzadania się dodają i zaznaczają

### Keyboard Shortcuts
- [ ] Enter zapisuje zadanie (gdy tytuł wypełniony)
- [ ] Esc zamyka modal
- [ ] Ctrl+K otwiera quick add (globalnie)

---

## 🎯 Expected Outcome:

Po tym refactorze aplikacja ma:
✅ **JEDEN** uniwersalny modal używany wszędzie  
✅ **Spójny UX** - zawsze ten sam interfejs  
✅ **Łatwiejszy maintenance** - zmiany w jednym miejscu  
✅ **Pełna funkcjonalność** - CREATE, EDIT, subtasks, timers, AI  
✅ **Minimalistyczny** - advanced features w collapsible sections  
✅ **Todoist integration** - projekty i etykiety z API

---

## 📝 Notatki:

- Wszystkie stare modale zostały usunięte
- UniversalTaskModal jest w `components/common/` (współdzielony)
- CollapsibleSection jest reusable
- Każdy view mapuje swoje Task type → TaskData
- Handler patterns są spójne we wszystkich views
- TypeScript errors zostały naprawione

**Status: ✅ IMPLEMENTACJA ZAKOŃCZONA**

Aplikacja jest gotowa do testowania manualnego w przeglądarce.
