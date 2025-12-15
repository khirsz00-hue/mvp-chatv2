'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface User {
  id: string
  email: string
  full_name?: string
  subscription_status: string
  subscription_tier: string
  is_admin: boolean
  created_at: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        showToast('Brak uprawnień administratora', 'error')
        router.push('/')
        return
      }

      setIsAdmin(true)
      await loadUsers()
    } catch (error) {
      console.error('Error:', error)
      showToast('Błąd podczas ładowania danych', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading users:', error)
      showToast('Błąd podczas ładowania użytkowników', 'error')
      return
    }

    setUsers(data || [])
  }

  const toggleSubscription = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        subscription_status: newStatus,
        subscription_tier: newStatus === 'active' ? 'pro' : 'free'
      })
      .eq('id', userId)

    if (error) {
      showToast('Błąd podczas aktualizacji statusu', 'error')
      return
    }

    showToast('Status zaktualizowany', 'success')
    await loadUsers()
  }

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_admin: !isAdmin })
      .eq('id', userId)

    if (error) {
      showToast('Błąd podczas aktualizacji uprawnień', 'error')
      return
    }

    showToast('Uprawnienia zaktualizowane', 'success')
    await loadUsers()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">⚙️ Panel administratora</h1>
          <Button onClick={() => router.push('/')} variant="outline">
            ← Wróć do asystentów
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Użytkownicy ({users.length})</CardTitle>
            <CardDescription>
              Zarządzaj użytkownikami i ich subskrypcjami
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Imię</th>
                    <th className="pb-3 font-medium">Data rejestracji</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Admin</th>
                    <th className="pb-3 font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">{user.full_name || '-'}</td>
                      <td className="py-3">
                        {new Date(user.created_at).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="py-3">
                        <Badge 
                          variant={['active', 'trialing'].includes(user.subscription_status) ? 'success' : 'default'}
                        >
                          {user.subscription_status}
                        </Badge>
                      </td>
                      <td className="py-3 capitalize">{user.subscription_tier}</td>
                      <td className="py-3">
                        {user.is_admin ? '✅' : '❌'}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleSubscription(user.id, user.subscription_status)}
                          >
                            {['active', 'trialing'].includes(user.subscription_status) ? 'Dezaktywuj' : 'Aktywuj'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAdmin(user.id, user.is_admin)}
                          >
                            {user.is_admin ? 'Usuń admin' : 'Nadaj admin'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompty i wiedza</CardTitle>
            <CardDescription>
              Zarządzaj promptami systemowymi i bazą wiedzy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin/knowledge')}>
              Przejdź do edytora
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
