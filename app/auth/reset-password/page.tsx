'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Verify that we have a valid session from the password reset link
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.error('[ResetPassword] No valid session:', sessionError)
          setError('Link resetowania hasła jest nieprawidłowy lub wygasł. Spróbuj ponownie.')
        } else {
          console.log('[ResetPassword] ✓ Valid session found')
        }
      } catch (err) {
        console.error('[ResetPassword] Error checking session:', err)
        setError('Wystąpił błąd podczas weryfikacji linku.')
      } finally {
        setVerifying(false)
      }
    }

    checkSession()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      showToast('Hasła nie są identyczne', 'error')
      return
    }

    if (password.length < 6) {
      showToast('Hasło musi mieć minimum 6 znaków', 'error')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      console.log('[ResetPassword] ✓ Password updated successfully')
      showToast('Hasło zostało zmienione pomyślnie!', 'success')
      
      // Wait a moment for the toast to be visible
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (error: any) {
      console.error('[ResetPassword] ✗ Password update failed:', error)
      showToast(error.message || 'Wystąpił błąd podczas zmiany hasła', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Weryfikacja linku...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              ⚠️ Błąd
            </CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Wróć do logowania
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            🔐 Ustaw nowe hasło
          </CardTitle>
          <CardDescription className="text-center">
            Wprowadź swoje nowe hasło
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Nowe hasło
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 6 znaków
              </p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">
                Potwierdź hasło
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? 'Zmiana hasła...' : 'Zmień hasło'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
