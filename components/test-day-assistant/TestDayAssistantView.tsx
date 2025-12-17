'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export function TestDayAssistantView() {
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [assistant, setAssistant] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkExistingAssistant()
  }, [])

  const checkExistingAssistant = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Musisz być zalogowany')
        return
      }

      const response = await fetch('/api/test-day-assistant/init', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAssistant(data.assistant)
        setInitialized(true)
      }
    } catch (error) {
      console.error('Error checking assistant:', error)
    }
  }

  const initializeAssistant = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Musisz być zalogowany')
        setLoading(false)
        return
      }

      const response = await fetch('/api/test-day-assistant/init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAssistant(data.assistant)
        setMessage(data.message)
        setInitialized(true)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Błąd podczas tworzenia asystenta')
      }
    } catch (error) {
      console.error('Error initializing assistant:', error)
      setError('Błąd połączenia z serwerem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-3xl text-brand-purple">
            Test Day Assistant (asystent dnia test)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!initialized ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Kliknij poniższy przycisk, aby utworzyć nowego asystenta dnia test z funkcjami ADHD-friendly.
              </p>
              
              <Button
                onClick={initializeAssistant}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Tworzenie asystenta...' : 'Utwórz Asystenta Dnia Test'}
              </Button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {message && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">{message}</p>
                </div>
              )}

              {assistant && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Informacje o asysteńcie</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Nazwa</p>
                      <p className="font-semibold">{assistant.name}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Typ</p>
                      <p className="font-semibold">{assistant.type}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold">
                        {assistant.is_active ? '✅ Aktywny' : '❌ Nieaktywny'}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Utworzony</p>
                      <p className="font-semibold">
                        {new Date(assistant.created_at).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Ustawienia asystenta:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>🔄 Okno undo: <strong>{assistant.settings?.undo_window || 15}s</strong></li>
                      <li>⚠️ Max postpones przed eskalacją: <strong>{assistant.settings?.max_postpones_before_escalation || 3}</strong></li>
                      <li>🌅 Poranny blok MUST: <strong>{assistant.settings?.morning_must_block_default || 30} min</strong></li>
                      <li>✂️ Próg auto-dekompozycji: <strong>{assistant.settings?.auto_decompose_threshold || 60} min</strong></li>
                      <li>🎯 Limit lekkich zadań: <strong>{assistant.settings?.light_task_limit_minutes || 30} min</strong></li>
                      <li>💡 Max rekomendacji dziennie: <strong>{assistant.settings?.max_daily_recommendations || 5}</strong></li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Funkcje asystenta:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <FeatureItem icon="🎚️" text="Dwa suwaki: energia (1-5) i skupienie (1-5)" />
                      <FeatureItem icon="📌" text="MUST tasks (max 1-3 dziennie)" />
                      <FeatureItem icon="⚡" text="Live replanning z rekomendacjami" />
                      <FeatureItem icon="🧊" text="Przycisk 'Nie dziś' z undo" />
                      <FeatureItem icon="✂️" text="Auto-dekompozycja zadań >60 min" />
                      <FeatureItem icon="🔄" text="Nightly rollover przeterminowanych" />
                      <FeatureItem icon="📊" text="DecisionLog wszystkich akcji" />
                      <FeatureItem icon="⚠️" text="Soft warnings zamiast bloków" />
                      <FeatureItem icon="🧠" text="ADHD-friendly interfejs" />
                      <FeatureItem icon="🎯" text="Kontekstowy filtr zadań" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumentacja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="Filozofia asystenta">
            <p>
              Asystent dnia test to niezależny planner z dwoma suwakami (energia i skupienie),
              który nie blokuje użytkownika, ale pomaga w podejmowaniu lepszych decyzji poprzez
              soft warnings, undo i inteligentne rekomendacje.
            </p>
          </Section>

          <Section title="Kluczowe mechanizmy">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Wszystkie akcje użytkownika są dozwolone - brak twardych bloków</li>
              <li>System stosuje soft warnings z opcją kontynuacji</li>
              <li>Każda decyzja logowana do DecisionLog dla audytu</li>
              <li>Undo dostępne przez 5-15s po akcji</li>
              <li>Live replanning przy każdej zmianie (dodanie zadania, zmiana suwaków)</li>
              <li>Eskalacja przy postpone_count {'>='} 3 (rezerwacja porannego slotu)</li>
            </ul>
          </Section>

          <Section title="API Endpoints">
            <ul className="list-disc list-inside space-y-1 text-sm font-mono">
              <li>GET /api/test-day-assistant/dayplan?date=YYYY-MM-DD</li>
              <li>POST /api/test-day-assistant/task (create)</li>
              <li>POST /api/test-day-assistant/postpone</li>
              <li>POST /api/test-day-assistant/proposal (respond)</li>
              <li>POST /api/test-day-assistant/undo</li>
              <li>POST /api/test-day-assistant/init (initialize)</li>
            </ul>
          </Section>
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2 p-2 bg-white rounded border">
      <span className="text-lg">{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  )
}
