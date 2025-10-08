'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface User {
  id: string
  email: string
  paid: boolean
  created_at?: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('user_access').select('user_id, paid')
      const authUsers = await supabase.auth.admin.listUsers()
      const mapped = authUsers.data.users.map(u => ({
        id: u.id,
        email: u.email!,
        paid: data?.find(d => d.user_id === u.id)?.paid ?? false,
        created_at: u.created_at
      }))
      setUsers(mapped)
    }
    load()
  }, [])

  const togglePaid = async (userId: string, paid: boolean) => {
    await supabase.from('user_access')
      .upsert({ user_id: userId, paid: !paid })
    setUsers(users.map(u => u.id === userId ? { ...u, paid: !paid } : u))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">⚙️ Panel administratora</h1>
      <div className="card">
        <h2 className="text-lg font-medium mb-3">Użytkownicy</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th>Email</th><th>Data</th><th>Status</th><th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td>{u.email}</td>
                <td>{new Date(u.created_at || '').toLocaleDateString()}</td>
                <td>{u.paid ? '✅ płatny' : '❌ darmowy'}</td>
                <td>
                  <button
                    className="btn text-sm"
                    onClick={() => togglePaid(u.id, u.paid)}
                  >
                    Zmień
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2 className="text-lg font-medium mb-3">Prompty i wiedza</h2>
        <a href="/admin/knowledge" className="btn btn-primary text-sm">
          Przejdź do edytora
        </a>
      </div>
    </div>
  )
}
