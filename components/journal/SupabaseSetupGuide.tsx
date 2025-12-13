'use client'

import { useState } from 'react'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { 
  Database, 
  Copy, 
  CheckCircle, 
  Warning, 
  X,
  ArrowRight,
  Key
} from '@phosphor-icons/react'
import { useToast } from '@/components/ui/Toast'

interface SupabaseSetupGuideProps {
  onClose?: () => void
  standalone?: boolean
}

// SQL from migration file
const JOURNAL_ENTRIES_SQL = `-- Journal Entries Table
-- Stores all journal entries with user association
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Indexes for better query performance
create index if not exists idx_journal_entries_user_id on journal_entries(user_id);
create index if not exists idx_journal_entries_archived on journal_entries(archived);
create index if not exists idx_journal_entries_created_at on journal_entries(created_at desc);

-- Enable Row Level Security (RLS)
alter table journal_entries enable row level security;

-- RLS Policies for journal_entries
-- Users can only see their own entries
create policy "Users can view their own journal entries"
  on journal_entries for select
  using (auth.uid() = user_id);

-- Users can insert their own entries
create policy "Users can create their own journal entries"
  on journal_entries for insert
  with check (auth.uid() = user_id);

-- Users can update their own entries
create policy "Users can update their own journal entries"
  on journal_entries for update
  using (auth.uid() = user_id);

-- Users can delete their own entries
create policy "Users can delete their own journal entries"
  on journal_entries for delete
  using (auth.uid() = user_id);`

const JOURNAL_ARCHIVES_SQL = `-- Journal Archives Table
-- Stores archived journal entries separately for history
create table if not exists journal_archives (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references journal_entries(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  archived_at timestamptz default now()
);

-- Indexes for better query performance
create index if not exists idx_journal_archives_user_id on journal_archives(user_id);
create index if not exists idx_journal_archives_archived_at on journal_archives(archived_at desc);

-- Enable Row Level Security (RLS)
alter table journal_archives enable row level security;

-- RLS Policies for journal_archives
-- Users can only see their own archived entries
create policy "Users can view their own archived entries"
  on journal_archives for select
  using (auth.uid() = user_id);

-- Users can insert their own archive records
create policy "Users can create their own archive records"
  on journal_archives for insert
  with check (auth.uid() = user_id);

-- Users can delete their own archive records
create policy "Users can delete their own archive records"
  on journal_archives for delete
  using (auth.uid() = user_id);`

export function SupabaseSetupGuide({ onClose, standalone = false }: SupabaseSetupGuideProps) {
  const { showToast } = useToast()
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(section)
      showToast('SQL skopiowany do schowka', 'success')
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (err) {
      showToast('Nie udało się skopiować', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            Konfiguracja Bazy Danych
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Instrukcja krok po kroku konfiguracji tabel Supabase dla Dziennika
          </p>
        </div>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <X size={20} weight="bold" />
            Zamknij
          </Button>
        )}
      </div>

      {/* Warning Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Warning size={24} weight="bold" className="text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">
                Wymagana konfiguracja
              </h3>
              <p className="text-orange-800 text-sm">
                Dziennik wymaga utworzenia tabel w bazie danych Supabase. 
                Postępuj zgodnie z instrukcją poniżej, aby skonfigurować bazę danych.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Access Supabase */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-white font-bold">
              1
            </div>
            <CardTitle>Otwórz panel Supabase</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-600">
            Zaloguj się do panelu Supabase i przejdź do swojego projektu:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-2">
            <li>Odwiedź <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:underline">supabase.com</a></li>
            <li>Zaloguj się do swojego konta</li>
            <li>Wybierz swój projekt z listy</li>
          </ol>
        </CardContent>
      </Card>

      {/* Step 2: SQL Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-white font-bold">
              2
            </div>
            <CardTitle>Przejdź do SQL Editor</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-600">
            W menu bocznym znajdź i kliknij <strong>SQL Editor</strong>
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <Database size={20} weight="bold" className="text-brand-purple" />
            <span>SQL Editor pozwala wykonywać zapytania SQL bezpośrednio w bazie danych</span>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Create journal_entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-white font-bold">
              3
            </div>
            <CardTitle>Utwórz tabelę journal_entries</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-600">
            Skopiuj i wklej poniższy kod SQL, następnie kliknij <strong>Run</strong>:
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{JOURNAL_ENTRIES_SQL}</code>
            </pre>
            <Button
              onClick={() => copyToClipboard(JOURNAL_ENTRIES_SQL, 'entries')}
              size="sm"
              className="absolute top-2 right-2 gap-2"
            >
              {copiedSection === 'entries' ? (
                <>
                  <CheckCircle size={16} weight="bold" />
                  Skopiowano
                </>
              ) : (
                <>
                  <Copy size={16} weight="bold" />
                  Kopiuj SQL
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Create journal_archives */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-white font-bold">
              4
            </div>
            <CardTitle>Utwórz tabelę journal_archives</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-600">
            Skopiuj i wklej poniższy kod SQL, następnie kliknij <strong>Run</strong>:
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{JOURNAL_ARCHIVES_SQL}</code>
            </pre>
            <Button
              onClick={() => copyToClipboard(JOURNAL_ARCHIVES_SQL, 'archives')}
              size="sm"
              className="absolute top-2 right-2 gap-2"
            >
              {copiedSection === 'archives' ? (
                <>
                  <CheckCircle size={16} weight="bold" />
                  Skopiowano
                </>
              ) : (
                <>
                  <Copy size={16} weight="bold" />
                  Kopiuj SQL
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 5: Verify */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center text-white font-bold">
              5
            </div>
            <CardTitle>Weryfikacja</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-600">
            Sprawdź czy tabele zostały utworzone:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-2">
            <li>Przejdź do <strong>Table Editor</strong> w menu bocznym</li>
            <li>Sprawdź czy widzisz tabele: <code className="bg-gray-100 px-2 py-1 rounded">journal_entries</code> i <code className="bg-gray-100 px-2 py-1 rounded">journal_archives</code></li>
            <li>Jeśli tabele są widoczne - konfiguracja zakończona! 🎉</li>
          </ol>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">🔧 Rozwiązywanie problemów</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Błąd: &quot;relation already exists&quot;
            </h4>
            <p className="text-blue-800 text-sm">
              Tabele już istnieją w bazie danych. Nie musisz ich tworzyć ponownie. 
              Jeśli widzisz błędy w aplikacji, sprawdź polityki RLS (Row Level Security).
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Błąd: &quot;permission denied&quot;
            </h4>
            <p className="text-blue-800 text-sm">
              Sprawdź czy jesteś zalogowany jako administrator projektu w Supabase.
              Upewnij się, że masz uprawnienia do tworzenia tabel.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Wciąż widzę błędy w aplikacji
            </h4>
            <p className="text-blue-800 text-sm mb-2">
              Sprawdź następujące rzeczy:
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm ml-2">
              <li>Czy zmienne środowiskowe są poprawnie ustawione?</li>
              <li>Czy jesteś zalogowany w aplikacji?</li>
              <li>Czy polityki RLS zostały utworzone?</li>
              <li>Czy odświeżyłeś stronę po utworzeniu tabel?</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Gdzie znaleźć klucze API?
            </h4>
            <div className="text-blue-800 text-sm space-y-2">
              <p>W panelu Supabase przejdź do <strong>Settings → API</strong></p>
              <p>Skopiuj:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Project URL</strong> → <code className="bg-blue-100 px-2 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code></li>
                <li><strong>anon/public key</strong> → <code className="bg-blue-100 px-2 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      {!standalone && (
        <div className="flex justify-center gap-3 pt-4">
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <ArrowRight size={20} weight="bold" />
            Gotowe - Odśwież stronę
          </Button>
        </div>
      )}
    </div>
  )
}
