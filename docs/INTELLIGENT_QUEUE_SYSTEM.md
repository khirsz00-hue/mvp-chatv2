# Intelligent Queue System - Dokumentacja

## 📋 Przegląd

System Inteligentnej Kolejki to zaawansowany mechanizm zarządzania zadaniami oparty na algorytmach uczenia maszynowego (ML-inspired), który adaptuje się do zachowań użytkownika i dostosowuje rekomendacje w czasie rzeczywistym.

## 🏗️ Architektura Systemu

### Główne Komponenty

#### 1. **Intelligent Scoring Engine** (`lib/services/intelligentScoringEngine.ts`)
Silnik scoringowy z wielowymiarowymi metrykami:

- **Base Score**: Ulepszona wersja podstawowej logiki z wykładniczymi wagami dla pilności
- **Context Switch Cost**: Kara za przełączanie między różnymi kontekstami/projektami
- **Time-of-Day Fit**: Dopasowanie zadań do pory dnia i historycznych wzorców energii
- **Completion Probability**: Predykcja prawdopodobieństwa ukończenia na podstawie historii
- **Momentum Bonus**: Bonus za kontynuację podobnych zadań
- **Event Proximity Penalty**: Kara za zadania, które mogą być przerwane przez spotkania

#### 2. **Behavior Learning Service** (`lib/services/behaviorLearningService.ts`)
Serwis uczący się z zachowań użytkownika:

- Trackowanie ukończeń zadań
- Analiza wzorców odkładania
- Aktualizacja profilu energii w ciągu dnia
- Dostosowywanie preferowanej długości zadań
- Wykrywanie godzin szczytowej produktywności

#### 3. **AI Recommendation Engine** (`lib/services/aiRecommendationEngine.ts`)
Generator inteligentnych rekomendacji:

- **BATCH**: Grupowanie podobnych zadań
- **ENERGY_MATCH**: Ostrzeżenia o niezgodności energii
- **DECOMPOSE**: Rozbijanie długich zadań
- **REORDER**: Zmiana kolejności dla lepszej efektywności
- **DEFER**: Odraczanie zadań z niskim prawdopodobieństwem ukończenia

#### 4. **Intelligent Queue Hook** (`hooks/useIntelligentQueue.ts`)
React Hook zarządzający kolejką:

- Budowanie kolejki z uwzględnieniem konfliktów kalendarzowych
- Auto-refresh co 5 minut
- Alternatywy dla każdego zadania w kolejce
- Szacowane czasy rozpoczęcia i zakończenia

## 📊 Profil Zachowań Użytkownika

### Struktura Danych

```typescript
interface UserBehaviorProfile {
  user_id: string
  peak_productivity_start: number      // Godzina (0-23)
  peak_productivity_end: number        // Godzina (0-23)
  preferred_task_duration: number      // Minuty
  context_switch_sensitivity: number   // 0-1
  postpone_patterns: Record<string, any>
  energy_patterns: EnergyPattern[]
  completion_streaks: CompletionStreak[]
  updated_at: string
}
```

### Domyślne Wartości

Dla nowych użytkowników system używa domyślnych wartości:
- Peak productivity: 9:00 - 12:00
- Preferred duration: 30 minut
- Context switch sensitivity: 0.5
- Puste wzorce (będą się uczyć z użytkowania)

## 🔢 Algorytmy Scoringu

### 1. Enhanced Base Score

```
score = priority^1.5 * 8 + deadline_score + must_bonus + important_bonus
```

**Deadline scoring** (wykładnicze nasilenie):
- Overdue: +50 punktów
- Due today: +35 punktów
- Due tomorrow: +20 punktów
- Due in 2-3 days: +10 punktów

### 2. Context Switch Cost

```
cost = base_cost * context_switch_sensitivity
```

Gdzie:
- base_cost = 15 dla zmiany context_type
- base_cost = 10 dla dużej zmiany cognitive_load (≥3)

### 3. Time-of-Day Fit

```
bonus = peak_hour_bonus + energy_pattern_fit + current_state_fit
```

Komponenty:
- Peak hour z trudnym zadaniem: +15
- Dopasowanie do historycznych wzorców: +0 do +10
- Idealne dopasowanie do obecnego stanu: +10

### 4. Completion Probability

```
adjustment = postpone_adjustment + duration_fit + streak_bonus
```

Faktory:
- Wysokie odkładanie (4+): -20 lub +10 (eskalacja)
- Długość zgodna z preferencjami: +8
- Dobra passa ukończeń: +5

### 5. Momentum Bonus

```
bonus = same_context_bonus + similar_load_bonus
```

Warunki:
- 2+ ostatnie zadania w tym samym kontekście: +12
- 2+ ostatnie zadania o podobnym obciążeniu: +8

### 6. Event Proximity Penalty

```
penalty = 25 (task interrupted) or 15 (not enough time)
```

## 🔄 Learning Loop

### Automatyczne Uczenie

System uczy się automatycznie z następujących akcji:

#### 1. **Task Completion**
```typescript
trackTaskCompletion(userId, task, completionTime, hour, energy, focus)
```
Aktualizuje:
- Energy patterns (średnie wartości per godzina)
- Completion streaks (statystyki dzienne)
- Preferred duration (moving average)

#### 2. **Task Postpone**
```typescript
trackTaskPostpone(userId, task, fromDate, toDate, reason)
```
Aktualizuje:
- Postpone patterns (wzorce per cognitive_load)
- Completion streaks (negatywne zdarzenie)

#### 3. **Energy/Focus Change**
```typescript
trackEnergyFocusChange(userId, energy, focus, hour)
```
Aktualizuje:
- Energy patterns
- Peak productivity hours (po zebraniu wystarczających danych)

#### 4. **Context Switch Analysis**
```typescript
updateContextSwitchSensitivity(userId, recentTasks)
```
Analizuje completion rate przy przełączaniu kontekstu vs bez.

## 🎯 Inteligentne Rekomendacje

### Typy Rekomendacji

#### BATCH - Grupowanie Zadań
**Trigger**: 3+ zadania w tym samym kontekście

**Outcome**:
- Time saved: 5 min * liczba unikniętych przełączeń
- Stress reduction: 0.3
- Completion probability: 0.8

#### ENERGY_MATCH - Dopasowanie Energii
**Trigger**: |cognitive_load - current_state| ≥ 3

**Outcome**:
- Stress reduction: 0.4 (for mismatch) lub 0.1 (for match)
- Completion probability: 0.7 lub 0.85

#### DECOMPOSE - Rozbicie Zadania
**Trigger**: 
- Task duration > 2x preferred_duration
- Postpone count ≥ 2
- No subtasks

**Outcome**:
- Stress reduction: 0.5
- Completion probability: 0.75

#### REORDER - Zmiana Kolejności
**Trigger**: High energy/focus, ale lekkie zadanie na pierwszym miejscu

**Outcome**:
- Time saved: 10 min
- Stress reduction: 0.2
- Completion probability: 0.8

#### DEFER - Odroczenie
**Trigger**:
- Postpone count ≥ 4
- Task duration > 50% available time
- No imminent deadline

**Outcome**:
- Stress reduction: 0.3
- Completion probability: 0.6

## 📡 API Endpoints

### GET /api/user-profile/behavior
Pobiera profil zachowań użytkownika.

**Response**:
```json
{
  "user_id": "uuid",
  "peak_productivity_start": 9,
  "peak_productivity_end": 12,
  "preferred_task_duration": 30,
  "context_switch_sensitivity": 0.5,
  "postpone_patterns": {},
  "energy_patterns": [],
  "completion_streaks": [],
  "updated_at": "2025-12-21T..."
}
```

### POST /api/user-profile/behavior
Aktualizuje profil zachowań (zwykle automatycznie przez system).

**Request Body** (wszystkie pola opcjonalne):
```json
{
  "peak_productivity_start": 9,
  "peak_productivity_end": 12,
  "preferred_task_duration": 30,
  "context_switch_sensitivity": 0.5,
  "postpone_patterns": {},
  "energy_patterns": [],
  "completion_streaks": []
}
```

## 🎨 Integracja z UI

### useIntelligentQueue Hook

```typescript
import { useIntelligentQueue } from '@/hooks/useIntelligentQueue'

function MyComponent() {
  const {
    queue,           // QueueSlot[]
    later,           // TestDayTask[]
    availableMinutes,
    usedMinutes,
    usagePercentage,
    isLoading,
    buildQueue,      // Manual rebuild
    completeTask,    // Complete and rebuild
    swapTaskInQueue  // Swap with alternative
  } = useIntelligentQueue(tasks, dayPlan, userId, {
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000,  // 5 minutes
    upcomingEvents: calendarEvents
  })

  // Display queue slots with reasoning
  return queue.map(slot => (
    <div key={slot.task.id}>
      <h3>{slot.task.title}</h3>
      <p>Score: {slot.score} (Confidence: {slot.confidence})</p>
      <ul>
        {slot.reasoning.map(reason => <li>{reason}</li>)}
      </ul>
      <div>
        Alternatives:
        {slot.alternatives.map(alt => (
          <button onClick={() => swapTaskInQueue(index, alt.id)}>
            {alt.title}
          </button>
        ))}
      </div>
    </div>
  ))
}
```

### Wyświetlanie Rekomendacji AI

```typescript
import { generateAISmartRecommendations } from '@/lib/services/dayAssistantV2RecommendationEngine'
import { formatRecommendationForChat } from '@/lib/services/aiRecommendationEngine'

async function loadRecommendations() {
  const recs = await generateAISmartRecommendations(
    userId,
    tasks,
    dayPlan,
    todayDate
  )

  recs.forEach(rec => {
    const message = formatRecommendationForChat(rec)
    showInChat(message)
  })
}
```

## ⚡ Performance

### Optymalizacje

1. **Scoring Performance**: Max 50ms dla 100 zadań
   - Wszystkie obliczenia po stronie klienta
   - Brak wywołań API podczas scoringu

2. **Profile Loading**: Single query per sesja
   - Cached w pamięci React
   - Aktualizacje batch w tle

3. **Auto-refresh**: Throttled do 5 minut
   - Rebuild tylko gdy potrzebny
   - Nie blokuje UI

## 🔒 Bezpieczeństwo

### Row Level Security (RLS)

Tabela `user_behavior_profiles` ma włączone RLS:
```sql
-- Users can only read their own profile
CREATE POLICY "Users can read own behavior profile"
  ON user_behavior_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "Users can update own behavior profile"
  ON user_behavior_profiles FOR UPDATE
  USING (auth.uid() = user_id);
```

### API Authentication

Wszystkie endpointy wymagają:
- Valid session token w Authorization header
- Sprawdzanie `auth.uid()` przez Supabase

## 🐛 Troubleshooting

### Problem: Scoring zwraca niskie wartości
**Diagnoza**: Sprawdź czy profil użytkownika istnieje
```typescript
const profile = await getUserBehaviorProfile(userId)
console.log('Profile:', profile)
```

**Rozwiązanie**: Inicjalizuj profil:
```typescript
await initializeBehaviorProfile(userId)
```

### Problem: Brak rekomendacji AI
**Diagnoza**: Sprawdź ilość zadań i profil
```typescript
console.log('Tasks:', tasks.length)
console.log('Profile patterns:', profile.energy_patterns.length)
```

**Rozwiązanie**: 
- Minimum 3 zadania potrzebne dla większości rekomendacji
- System używa domyślnego profilu dla nowych użytkowników

### Problem: Auto-refresh nie działa
**Diagnoza**: Sprawdź czy hook jest active
```typescript
useIntelligentQueue(tasks, dayPlan, userId, {
  autoRefresh: true,  // Upewnij się że true
  refreshInterval: 5 * 60 * 1000
})
```

### Problem: Context switch sensitivity nie zmienia się
**Diagnoza**: Sprawdź ilość danych
```typescript
// Potrzeba minimum 10 zadań do kalkulacji
if (recentTasks.length >= 10) {
  await updateContextSwitchSensitivity(userId, recentTasks)
}
```

## 📈 Metryki i Monitoring

### Ważne Metryki

1. **Profile Completeness**
   - Energy patterns count (cel: ≥12 godzin)
   - Completion streaks count (cel: ≥7 dni)

2. **Scoring Confidence**
   - Średnia confidence score (cel: ≥0.7)
   - % zadań z confidence >0.8

3. **Recommendation Acceptance**
   - % zaakceptowanych rekomendacji
   - Impact level distribution

4. **Learning Effectiveness**
   - Completion rate trend
   - Postpone count trend
   - Context switch frequency

## 🔄 Migration Guide

### Przejście ze Starego Systemu

Stary system (`useTaskQueue`) nadal działa jako fallback.

**Stopniowa migracja**:
```typescript
// Krok 1: Testuj równolegle
const oldQueue = useTaskQueue(scoredTasks, dayPlan)
const newQueue = useIntelligentQueue(tasks, dayPlan, userId)

// Krok 2: Porównaj wyniki
console.log('Old:', oldQueue.queue.length)
console.log('New:', newQueue.queue.length)

// Krok 3: Przełącz się całkowicie
// Usuń useTaskQueue i używaj tylko useIntelligentQueue
```

## 🎓 Przykłady Użycia

### Przykład 1: Podstawowe Użycie

```typescript
import { useIntelligentQueue } from '@/hooks/useIntelligentQueue'

function DayAssistant() {
  const { queue, isLoading } = useIntelligentQueue(
    tasks,
    dayPlan,
    userId
  )

  if (isLoading) return <Spinner />

  return (
    <div>
      {queue.map(slot => (
        <TaskCard 
          key={slot.task.id}
          task={slot.task}
          score={slot.score}
          reasoning={slot.reasoning}
        />
      ))}
    </div>
  )
}
```

### Przykład 2: Z Kalendarzem Google

```typescript
import { useIntelligentQueue } from '@/hooks/useIntelligentQueue'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'

function DayAssistantWithCalendar() {
  const { events } = useCalendarEvents()
  
  const { queue } = useIntelligentQueue(
    tasks,
    dayPlan,
    userId,
    {
      upcomingEvents: events.map(e => ({
        start: new Date(e.start),
        end: new Date(e.end)
      }))
    }
  )

  return <QueueDisplay queue={queue} />
}
```

### Przykład 3: Manual Learning Update

```typescript
import { trackTaskCompletion } from '@/lib/services/behaviorLearningService'

async function handleTaskComplete(task: TestDayTask) {
  const completionTime = calculateActualTime(task)
  const currentHour = new Date().getHours()
  
  await trackTaskCompletion(
    userId,
    task,
    completionTime,
    currentHour,
    dayPlan.energy,
    dayPlan.focus
  )

  // Queue will auto-rebuild on next refresh
}
```

## 📚 Dalsze Rozwinięcie

### Potencjalne Usprawnienia

1. **Deep Learning Model**
   - Train neural network na completion patterns
   - Predict exact completion time

2. **Collaborative Filtering**
   - Learn from similar users
   - Recommend based on community patterns

3. **A/B Testing Framework**
   - Compare different scoring algorithms
   - Measure actual improvement in completion rates

4. **Real-time Adaptation**
   - Adjust scores during the day based on progress
   - Dynamic re-prioritization

5. **Integration z Więcej Źródeł**
   - Email importance
   - Slack messages urgency
   - GitHub PR deadlines

## 📞 Support

Dla pytań i problemów:
- GitHub Issues: [khirsz00-hue/mvp-chatv2](https://github.com/khirsz00-hue/mvp-chatv2)
- Email: support@dayassistant.com
- Discord: Day Assistant Community

---

**Wersja**: 2.0.0  
**Ostatnia aktualizacja**: 2025-12-21  
**Autor**: Day Assistant Team
