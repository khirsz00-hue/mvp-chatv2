# 🧠 AI Assistants PRO (Final SaaS Edition)

Modularna platforma AI zbudowana w **Next.js 14 + Supabase + OpenAI + Tailwind + Framer Motion**  

## 🎯 Asystenci AI

1. 📝 **Todoist Helper** - Zarządzaj zadaniami z AI (w pełni zaimplementowany)
2. ☀️ **Day Assistant (Asystent Dnia)** - NOW/NEXT/LATER workflow z trybami energii (w pełni zaimplementowany MVP)
3. 📅 **AI Planner** - Inteligentne planowanie dnia (w przygotowaniu)
4. 📔 **Journal** - Codzienny dziennik refleksji (w pełni zaimplementowany)
5. 🧠 **Decision Assistant** - Framework decyzyjny Six Thinking Hats (w pełni zaimplementowany)
6. 💬 **Chat Support** - Coaching dla ADHD (w pełni zaimplementowany)

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
│ ☀️ Day    │     Content Area                    │
│ 📅 Planner│     (DayAssistantView, Tasks, etc)  │
│ 📔 Journal│                                     │
│ 🧠 Decisions                                   │
│ 💬 Support│                                     │
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

## ☀️ Asystent Dnia v2 (Day Assistant v2)

**Status:** ✅ Active Version (v2)

Day Assistant v2 is an ADHD-friendly day planner with dual sliders, intelligent recommendations, and seamless Todoist integration.

### Key Features
- ✅ **Dual Sliders** - Energy (1-5) and Focus (1-5) level tracking
- ✅ **MUST Tasks** - Limit critical tasks to 1-3 per day
- ✅ **Context Filtering** - Filter by work type (code, admin, komunikacja, prywatne)
- ✅ **Todoist Sync** - Real-time bidirectional sync (10s interval)
- ✅ **Smart Recommendations** - AI-powered suggestions based on energy/focus
- ✅ **Undo Functionality** - Configurable undo window (5-15s)
- ✅ **Postpone Tracking** - Monitor and warn on excessive postpones
- ✅ **Decision Log** - Complete audit trail for learning
- ✅ **Manual Tasks** - Add tasks directly without Todoist

### Architecture

**Components:**
- Main View: `components/day-assistant-v2/DayAssistantV2View.tsx`
- API Routes: `app/api/day-assistant-v2/`
- Services: `lib/services/dayAssistantV2Service.ts`
- Sync: `lib/todoistSync.ts`

**Database Tables:**
- `assistant_config` - Assistant settings per user
- `test_day_assistant_tasks` - Main task table
- `test_day_plan` - Daily plan with energy/focus
- `test_day_proposals` - AI recommendations
- `test_day_decision_log` - Decision audit trail
- `sync_metadata` - Sync status tracking

### Documentation
📘 **Full Architecture Guide:** [docs/DAY_ASSISTANT_V2_ARCHITECTURE.md](./docs/DAY_ASSISTANT_V2_ARCHITECTURE.md)

### Setup
```bash
# Apply migrations in order
# 1. Day Assistant v2 tables
# supabase/migrations/20251217_test_day_assistant.sql

# 2. Todoist sync tables
# supabase/migrations/20251218_todoist_sync.sql

# 3. Cleanup v1/v2 conflicts
# supabase/migrations/20251218_cleanup_assistant_conflict.sql

# Or use Supabase CLI
supabase db push
```

### Migration from v1 to v2

Old Day Assistant v1 components are deprecated and marked with `@deprecated`.
The migration script (`20251218_cleanup_assistant_conflict.sql`) will:
- Create 'asystent dnia v2' assistant for all users
- Fix `assistant_id` for all tasks
- Mark old v1 assistants as inactive
- Add foreign key constraints for data integrity

**Note:** v1 is no longer accessible from the sidebar. All users are automatically redirected to v2.

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

**💡 Pomoc w aplikacji:** Jeśli zapomniałeś utworzyć tabele dla Dziennika, aplikacja automatycznie wykryje to i pokaże szczegółową instrukcję konfiguracji z możliwością skopiowania SQL jednym kliknięciem. Wystarczy kliknąć przycisk "Konfiguracja bazy danych" w interfejsie Dziennika.

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

### 📚 Dodatkowa dokumentacja

- Szczegółowy przewodnik konfiguracji Dziennika: [JOURNAL_SETUP.md](./JOURNAL_SETUP.md)
- Instrukcja dostępna również bezpośrednio w aplikacji (przycisk "Konfiguracja" w Dzienniku)

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

---

## 🔐 Supabase & Vercel Auth Cookie Setup

### Overview
The application uses Supabase SSR authentication with Next.js 14 App Router. For authentication to work correctly in production (Vercel), cookies must be properly configured to be sent with every API request.

### Required Configuration

#### 1. Supabase Dashboard Settings

Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**:

- **Site URL**: Set to your production domain
  - Production: `https://mvp-chatv2.vercel.app`
  - Development: `http://localhost:3000`
  
- **Redirect URLs**: Add these URLs
  - `https://mvp-chatv2.vercel.app/**`
  - `http://localhost:3000/**`
  - Any other OAuth callback URLs

#### 2. Vercel Environment Variables

In your Vercel project settings, configure these environment variables:

**Required for Client & Server:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Optional (Server-side only):**
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: 
- `NEXT_PUBLIC_*` variables are exposed to the browser
- Non-prefixed variables are server-side only
- Deploy after adding/changing environment variables

#### 3. Cookie Configuration

Supabase automatically handles cookie configuration when using `@supabase/ssr`. The cookies are:
- **SameSite=Lax** (default for same-site requests)
- **Secure=true** (automatically set for HTTPS domains)
- **HttpOnly=true** (for security)

**Cookie Names:**
- Pattern: `sb-<project-ref>-auth-token`
- Pattern: `sb-<project-ref>-auth-token.0`, `.1`, etc. (for chunked cookies)

### Implementation Details

#### Client-Side: API Helper with Credentials

All API requests use the centralized helper in `lib/api.ts`:

```typescript
import { apiGet, apiPost } from '@/lib/api'

// GET request with credentials
const response = await apiGet('/api/day-assistant/queue')

// POST request with credentials
const response = await apiPost('/api/day-assistant/chat', {
  message: 'Hello'
})
```

This ensures `credentials: 'include'` is set on every request, sending cookies to the server.

#### Server-Side: Reading Session from Cookies

API routes use `lib/supabaseAuth.ts` helpers:

```typescript
import { createAuthenticatedSupabaseClient, getAuthenticatedUser } from '@/lib/supabaseAuth'

export async function GET(request: NextRequest) {
  // Create Supabase client that reads cookies
  const supabase = await createAuthenticatedSupabaseClient()
  
  // Get authenticated user from session
  const user = await getAuthenticatedUser(supabase)
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    )
  }
  
  // User is authenticated, proceed with logic
  // ...
}
```

### Debugging Cookie Issues

#### 1. Check if cookies are being sent from client

Use the debug endpoint:
```bash
# In browser console or via curl
fetch('/api/debug/headers', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
```

Check the response:
- `cookiePresent: true` → Cookies are being sent ✓
- `cookiePresent: false` → Cookies are NOT being sent ✗

#### 2. Check server logs

Look for these log messages in Vercel/local console:
- `[Auth] ✓ Found N Supabase auth cookie(s)` → Auth working
- `[Auth] ✗ No Supabase auth cookies found` → Auth failing
- `[Auth] ✓ User authenticated: <user-id>` → User session valid

#### 3. Verify with curl (advanced)

```bash
# 1. Get cookies from browser DevTools → Application → Cookies
# 2. Copy the sb-*-auth-token cookies
# 3. Test with curl

curl -i \
  -H "Cookie: sb-xxxxx-auth-token=<your-token>" \
  https://mvp-chatv2.vercel.app/api/day-assistant/queue
```

Expected: `200 OK` with queue data
If `401 Unauthorized`: Session invalid or cookies not configured correctly

#### 4. Check browser DevTools Network tab

1. Open DevTools → Network
2. Make a request to any `/api/day-assistant/*` endpoint
3. Check request headers → `Cookie` should include `sb-*-auth-token`
4. If Cookie header is missing, check:
   - Are you using the `apiGet`/`apiPost` helpers?
   - Is the domain the same? (Cross-origin requests need CORS config)

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 errors on all API requests | Cookies not being sent | Use `apiGet`/`apiPost` helpers from `lib/api.ts` |
| "No Supabase auth cookies found" | Session expired or logged out | Re-login via `/login` |
| Cookies work locally, not on Vercel | Environment variables missing | Add all `NEXT_PUBLIC_SUPABASE_*` vars in Vercel |
| Cookies present but still 401 | Site URL mismatch | Update Site URL in Supabase Dashboard |
| Cross-origin cookie issues | SameSite=Strict or wrong domain | Verify Site URL matches deployment domain |

### Testing Checklist

- [ ] Environment variables set in Vercel
- [ ] Site URL matches production domain in Supabase Dashboard
- [ ] Redirect URLs include production domain
- [ ] User can log in successfully
- [ ] `/api/debug/headers` shows `cookiePresent: true`
- [ ] Day Assistant API requests return 200 (not 401)
- [ ] Server logs show "✓ User authenticated"

### Additional Resources

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Cookies Documentation](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

