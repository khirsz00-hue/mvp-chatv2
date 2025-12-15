'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import { User, Notebook, Sparkle, CreditCard, Link as LinkIcon, CheckCircle, XCircle } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  subscription_status: string
  subscription_tier: string
  subscription_start_date?: string
  subscription_end_date?: string
  created_at: string
  todoist_token?: string
  google_access_token?: string
  google_token_expiry?: number
}

interface JournalEntry {
  id: string
  content: string
  created_at: string
}

interface AIInsight {
  id: string
  insight_type: string
  title: string
  content: string
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('journal')
  const [connectingTodoist, setConnectingTodoist] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const handleConnectTodoist = async () => {
    setConnectingTodoist(true)
    try {
      window.location.href = '/api/todoist/auth'
    } catch (error) {
      console.error('Error connecting to Todoist:', error)
      showToast('Błąd podczas połączenia z Todoist', 'error')
      setConnectingTodoist(false)
    }
  }

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true)
    try {
      window.location.href = '/api/google/auth'
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error)
      showToast('Błąd podczas połączenia z Google Calendar', 'error')
      setConnectingGoogle(false)
    }
  }

  const handleDisconnectTodoist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_profiles')
        .update({ todoist_token: null })
        .eq('id', user.id)

      if (error) throw error

      showToast('Todoist został odłączony', 'success')
      loadData()
    } catch (error) {
      console.error('Error disconnecting Todoist:', error)
      showToast('Błąd podczas odłączania Todoist', 'error')
    }
  }

  const handleDisconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          google_access_token: null,
          google_refresh_token: null,
          google_token_expiry: null
        })
        .eq('id', user.id)

      if (error) throw error

      showToast('Google Calendar został odłączony', 'success')
      loadData()
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      showToast('Błąd podczas odłączania Google Calendar', 'error')
    }
  }

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load profile with integration tokens
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*, todoist_token, google_access_token, google_token_expiry')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Load journal entries
      const { data: journalData } = await supabase
        .from('journal_entries')
        .select('id, content, created_at')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (journalData) {
        setJournalEntries(journalData)
      }

      // Load AI insights
      const { data: insightsData } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (insightsData) {
        setInsights(insightsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Błąd podczas ładowania danych', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <Card>
          <CardContent>
            <p>Nie znaleziono profilu użytkownika</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasActiveSubscription = ['active', 'trialing'].includes(profile.subscription_status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Mój profil</h1>
          <Button onClick={() => router.push('/')} variant="outline">
            ← Wróć do asystentów
          </Button>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center">
                <User size={24} className="text-white" />
              </div>
              <div>
                <CardTitle>{profile.full_name || profile.email}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status subskrypcji</div>
                <Badge variant={hasActiveSubscription ? 'success' : 'default'}>
                  {hasActiveSubscription ? 'Aktywna' : 'Nieaktywna'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Plan</div>
                <div className="font-medium capitalize">{profile.subscription_tier}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Członek od</div>
                <div className="font-medium">
                  {format(new Date(profile.created_at), 'dd MMM yyyy', { locale: pl })}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <Button
                onClick={() => router.push('/subscription')}
                variant="outline"
                className="gap-2"
              >
                <CreditCard size={20} />
                Zarządzaj subskrypcją
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Journal, Insights, and Integrations */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="journal">
              <Notebook size={20} className="mr-2" />
              Wpisy z dziennika ({journalEntries.length})
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Sparkle size={20} className="mr-2" />
              Wnioski AI ({insights.length})
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <LinkIcon size={20} className="mr-2" />
              Integracje
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journal">
            <Card>
              <CardHeader>
                <CardTitle>Ostatnie wpisy z dziennika</CardTitle>
                <CardDescription>
                  Twoje 10 najnowszych wpisów z dziennika
                </CardDescription>
              </CardHeader>
              <CardContent>
                {journalEntries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nie masz jeszcze żadnych wpisów w dzienniku
                  </p>
                ) : (
                  <div className="space-y-4">
                    {journalEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-brand-purple transition-colors"
                      >
                        <div className="text-xs text-muted-foreground mb-2">
                          {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm', { locale: pl })}
                        </div>
                        <p className="text-sm line-clamp-3">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights">
            <Card>
              <CardHeader>
                <CardTitle>Wnioski AI</CardTitle>
                <CardDescription>
                  Analizy i rekomendacje wygenerowane przez AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nie masz jeszcze żadnych wniosków AI
                  </p>
                ) : (
                  <div className="space-y-4">
                    {insights.map((insight) => (
                      <div
                        key={insight.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-brand-purple transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs">
                              {insight.insight_type}
                            </Badge>
                            <span className="font-medium">{insight.title}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(insight.created_at), 'dd MMM yyyy', { locale: pl })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {insight.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Integracje</CardTitle>
                <CardDescription>
                  Zarządzaj połączeniami z zewnętrznymi usługami
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Todoist Integration */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <CheckCircle size={24} className="text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">Todoist</h3>
                            <p className="text-sm text-muted-foreground">
                              Zarządzanie zadaniami i projektami
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          {profile?.todoist_token ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle size={20} className="text-green-600" />
                              <span className="text-sm text-green-600 font-medium">
                                Połączono
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle size={20} className="text-gray-400" />
                              <span className="text-sm text-gray-500">
                                Nie połączono
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        {profile?.todoist_token ? (
                          <Button
                            onClick={handleDisconnectTodoist}
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                          >
                            Odłącz
                          </Button>
                        ) : (
                          <Button
                            onClick={handleConnectTodoist}
                            disabled={connectingTodoist}
                            className="gap-2"
                          >
                            <LinkIcon size={20} />
                            {connectingTodoist ? 'Łączenie...' : 'Połącz'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Google Calendar Integration */}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <CheckCircle size={24} className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">Google Calendar</h3>
                            <p className="text-sm text-muted-foreground">
                              Synchronizacja wydarzeń z kalendarza
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          {profile?.google_access_token ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle size={20} className="text-green-600" />
                              <span className="text-sm text-green-600 font-medium">
                                Połączono
                              </span>
                              {profile.google_token_expiry && profile.google_token_expiry < Date.now() && (
                                <span className="text-xs text-orange-600 ml-2">
                                  (Token wygasł - połącz ponownie)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle size={20} className="text-gray-400" />
                              <span className="text-sm text-gray-500">
                                Nie połączono
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        {profile?.google_access_token ? (
                          <Button
                            onClick={handleDisconnectGoogle}
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                          >
                            Odłącz
                          </Button>
                        ) : (
                          <Button
                            onClick={handleConnectGoogle}
                            disabled={connectingGoogle}
                            className="gap-2"
                          >
                            <LinkIcon size={20} />
                            {connectingGoogle ? 'Łączenie...' : 'Połącz'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
