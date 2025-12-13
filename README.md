# 🧠 AI Assistants PRO (Final SaaS Edition)

Modularna platforma AI zbudowana w **Next.js 14 + Supabase + OpenAI + Tailwind + Framer Motion**  

## 🎯 Asystenci AI

1. 📝 **Todoist Helper** - Zarządzaj zadaniami z AI (w pełni zaimplementowany)
2. 📅 **AI Planner** - Inteligentne planowanie dnia (w przygotowaniu)
3. 📔 **Journal** - Codzienny dziennik refleksji (w pełni zaimplementowany)
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
