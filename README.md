# 🧠 AI Assistants PRO (Final SaaS Edition)

Modularna platforma AI zbudowana w **Next.js 14 + Supabase + OpenAI + Tailwind + Framer Motion**  

## 🎯 Asystenci AI

1. 📝 **Todoist Helper** - Zarządzaj zadaniami z AI (w pełni zaimplementowany)
2. 📅 **AI Planner** - Inteligentne planowanie dnia (w przygotowaniu)
3. 📔 **Journal** - Codzienny dziennik refleksji (w pełni zaimplementowany)
4. 🧠 **Decision Assistant** - AI wspierający podejmowanie decyzji (w pełni zaimplementowany)
4. 🧠 **Decision Assistant** - Framework decyzyjny Six Thinking Hats (w pełni zaimplementowany)
5. 💬 **Chat Support** - Coaching dla ADHD (w pełni zaimplementowany)

---

## 📐 Architektura Layoutu

Aplikacja wykorzystuje nową strukturę layoutu z glassmorphism i nawigacją:

### Komponenty Layout
- **Header** (`components/layout/Header.tsx`) - Glassmorphism header z gradient logo
- **Sidebar** (`components/layout/Sidebar.tsx`) - Nawigacja między asystentami z animacjami
- **MainLayout** (`components/layout/MainLayout.tsx`) - Główny kontener integrujący header + sidebar + content

### Struktura Nawigacji
```
┌─────────────────────────────────────────────────┐
│  [Logo AI Assistants PRO]        [User Menu]   │  ← Header (glass)
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ 📝 Todoist│                                     │
│ 📅 Planner│     Content Area                    │
│ 📔 Journal│     (TodoistTasksView lub Chat)     │
│ 🎩 6 Hats │                                     │
│ 💬 Chat   │                                     │
│          │                                      │
│ Sidebar  │                                      │
│ (glass)  │                                      │
└──────────┴──────────────────────────────────────┘
```

Nawigacja wykorzystuje state-based routing bez przeładowania strony.

---

## 🎨 Design System

Projekt wykorzystuje design system zmigrowany z `adhd-buddy-asystent` z następującymi elementami:

### Kolory
- **Brand Purple**: `#8B5CF6` - główny kolor marki
- **Brand Pink**: `#EC4899` - akcenty i secondary actions
- **Success Green**: `#10B981` - komunikaty sukcesu

### Cienie
- `shadow-soft` - delikatny cień (0 2px 8px rgba(0,0,0,0.05))
- `shadow-soft-lg` - większy delikatny cień
- `shadow-glow` - świecący efekt purple (0 0 20px rgba(139,92,246,0.3))
- `shadow-glow-lg` - większy świecący efekt

### Animacje
- `animate-fade-in` - płynne pojawienie się (0.3s)
- `animate-slide-in-up` - wjazd od dołu (0.4s)
- `animate-scale-in` - powiększenie (0.2s)
- `animate-shimmer` - efekt shimmer (2s infinite)

### Komponenty UI
Dostępne w `components/ui/`:
- **Button** - przyciski z wariantami (default, ghost, outline, destructive, success)
- **Card** - karty z Header, Title, Description, Content, Footer
- **Dialog** - system modali z animacjami
- **Input/Textarea** - pola tekstowe
- **Select** - dropdown
- **Badge** - etykiety z wariantami kolorów
- **Separator** - separator poziomy/pionowy
- **ScrollArea** - obszar przewijalny

### Utility Classes
- `.glass` - efekt glassmorphism (białe tło z blur)
- `.glass-dark` - ciemny glassmorphism
- `.glass-purple` - fioletowy glassmorphism
- `.focus-ring` - spójny focus ring (purple)
- `.shimmer` - efekt shimmer na elementach

Szczegóły w `theme.json` i `tailwind.config.ts`.

---

## 🧠 Asystent Decyzji (Decision Assistant)

Asystent decyzji wykorzystuje metodologię **Six Thinking Hats** (6 kapeluszy myślowych) do kompleksowej analizy decyzji z różnych perspektyw.

### Funkcjonalności
- ✅ Tworzenie decyzji z opcjami do rozważenia
- ✅ Analiza AI przez 6 etapów:
  - 🔵 **Niebieski** - Definicja problemu i synteza
  - ⚪ **Biały** - Fakty i obiektywne dane
  - 🔴 **Czerwony** - Emocje i intuicje
  - ⚫ **Czarny** - Ryzyka i zagrożenia
  - 🟡 **Żółty** - Korzyści i szanse
  - 🟢 **Zielony** - Kreatywne pomysły i rozwiązania
- ✅ Automatyczna synteza z rekomendacjami
- ✅ Persystencja w Supabase
- ✅ Historia analizy dla każdej decyzji

### Struktura
```
src/features/decision-assistant/
├── types/           # Typy TypeScript
├── services/        # Logika biznesowa (Supabase, AI)
├── prompts/         # Prompty dla każdego kapelusza
└── components/      # Komponenty React

db/migrations/
└── 20231214_create_decision_tables.sql  # Migracja bazy danych
```

### Baza danych
Tabele utworzone przez migrację:
- `decisions` - Główne decyzje użytkownika
- `decision_options` - Opcje do rozważenia dla każdej decyzji
- `decision_events` - Historia analizy (AI responses, user input, synthesis)

Zastosuj migrację w Supabase:
```sql
-- Uruchom skrypt: db/migrations/20231214_create_decision_tables.sql
-- lub skopiuj z: supabase/migrations/20231214_create_decision_tables.sql
```

---

## 🚀 Uruchomienie lokalne
```bash
npm install
cp .env.example .env.local
npm dev
```

---

## 🗄️ Konfiguracja Supabase

Projekt korzysta z Supabase jako bazy danych. Aby uruchomić aplikację, musisz skonfigurować projekt Supabase.

### 1. Tworzenie projektu Supabase

1. Przejdź do [supabase.com](https://supabase.com) i utwórz nowe konto (jeśli nie masz)
2. Kliknij "New Project" i wypełnij wymagane dane:
   - Nazwa projektu
   - Hasło do bazy danych (zapisz je bezpiecznie!)
   - Region (wybierz najbliższy)
3. Poczekaj kilka minut na utworzenie projektu

### 2. Pobranie kluczy API

Po utworzeniu projektu:

1. W menu bocznym przejdź do **Settings** → **API**
2. Skopiuj:
   - **Project URL** (np. `https://xxxxx.supabase.co`)
   - **anon/public key** (klucz publiczny)

### 3. Konfiguracja zmiennych środowiskowych

Otwórz plik `.env.local` i uzupełnij:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-api-key
```

### 4. Uruchomienie migracji SQL

Aby utworzyć tabele w bazie danych:

1. W panelu Supabase przejdź do **SQL Editor**
2. Otwórz kolejno pliki z folderu `supabase/migrations/` i wykonaj je:
   - `20231213_journal_tables.sql` - tabele dla dziennika
   - `20231214_decision_assistant_tables.sql` - tabele dla asystenta decyzji
   
**Lub** wykonaj migracje lokalnie:
```bash
# Jeśli masz zainstalowane Supabase CLI
supabase db push
```

### 5. Weryfikacja

Po uruchomieniu migracji, sprawdź w panelu Supabase → **Table Editor**, czy zostały utworzone następujące tabele:

**Dla Decision Assistant:**
- `decisions` - przechowuje decyzje użytkowników
- `decision_options` - opcje dla każdej decyzji
- `decision_events` - historia wydarzeń i analiz AI
- `users` - rozszerzenie profilu użytkownika

**Dla Journal:**
- `journal_entries` - wpisy dziennika
- `journal_archives` - zarchiwizowane wpisy

### 6. Row Level Security (RLS)

Wszystkie tabele mają włączone RLS - użytkownicy widzą tylko swoje dane. Polityki bezpieczeństwa są już skonfigurowane w migracjach.

---

## 🧠 Decision Assistant - Funkcje

Asystent decyzji to narzędzie AI wspierające użytkownika w podejmowaniu trudnych wyborów:

### Główne funkcje:
- ✅ **Tworzenie decyzji** - opisz decyzję, która wymaga przemyślenia
- ✅ **Dodawanie opcji** - wymień możliwe wybory z zaletami i wadami
- ✅ **Analiza AI** - GPT-4 analizuje sytuację i przedstawia rekomendacje
- ✅ **Persystencja** - wszystkie decyzje zapisywane w Supabase
- ✅ **Historia** - przeglądaj historię decyzji i analiz AI
- ✅ **Status tracking** - śledź postęp każdej decyzji

### API Endpoints:
- `GET /api/decisions` - lista decyzji użytkownika
- `POST /api/decisions` - utwórz nową decyzję
- `GET /api/decisions/[id]` - szczegóły decyzji
- `PUT /api/decisions/[id]` - aktualizuj decyzję
- `DELETE /api/decisions/[id]` - usuń decyzję
- `POST /api/decisions/[id]/analyze` - uruchom analizę AI
- `POST /api/decisions/options` - dodaj opcję do decyzji

### Komponenty:
- `DecisionAssistant.tsx` - główny komponent zarządzający widokami
- `DecisionList.tsx` - lista decyzji użytkownika
- `DecisionForm.tsx` - formularz tworzenia nowej decyzji
- `DecisionDetail.tsx` - widok szczegółów decyzji z opcjami
- `AIAnalysisPanel.tsx` - panel z analizą AI i rekomendacjami

---

## 📝 Uwagi dla deweloperów

### Struktura projektu
```
├── app/api/decisions/          # API endpoints dla decyzji
├── components/decisions/       # Komponenty UI dla asystenta decyzji
├── lib/
│   ├── services/
│   │   ├── decisionService.ts  # CRUD operacje na Supabase
│   │   └── decisionAI.ts       # Logika analizy AI
│   └── types/
│       └── decisions.ts        # TypeScript typy
└── supabase/migrations/        # Migracje SQL
```

### User ID Mock
Obecnie użyty jest `MOCK_USER_ID` w komponentach. W produkcji należy:
1. Zintegrować Supabase Auth
2. Pobrać `auth.uid()` z sesji użytkownika
3. Zastąpić mocka prawdziwym ID

### OpenAI API
Asystent używa modelu `gpt-4-turbo-preview`. Upewnij się, że:
- Masz aktywny klucz API OpenAI
- Masz dostęp do modelu GPT-4
- Ustawiono `OPENAI_API_KEY` w zmiennych środowiskowych
