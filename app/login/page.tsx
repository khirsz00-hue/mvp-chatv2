'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setSent(true)
      showToast('Magic link wysłany! Sprawdź swoją skrzynkę email.', 'success')
    } catch (error: any) {
      showToast(error.message || 'Wystąpił błąd podczas wysyłania linku', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            🧠 AI Assistants PRO
          </CardTitle>
          <CardDescription className="text-center">
            {sent ? 'Sprawdź swoją skrzynkę email' : 'Zaloguj się za pomocą magic link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Wysłaliśmy link do logowania na adres <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Link jest ważny przez 60 minut. Kliknij go, aby się zalogować.
              </p>
              <Button
                variant="outline"
                onClick={() => setSent(false)}
                className="w-full"
              >
                Wyślij ponownie
              </Button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Adres email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="twoj@email.pl"
                  required
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email}
              >
                {loading ? 'Wysyłanie...' : 'Wyślij magic link'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Nie masz konta? Zostanie utworzone automatycznie po pierwszym logowaniu.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
