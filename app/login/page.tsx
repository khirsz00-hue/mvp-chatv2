'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import Separator from '@/components/ui/Separator'

type LoginMode = 'signin' | 'signup' | 'magic-link' | 'magic-link-sent' | 'forgot-password' | 'reset-sent'

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const router = useRouter()

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      console.log('[Login] ✓ Email/password sign in successful')
      showToast('Zalogowano pomyślnie!', 'success')
      
      // Refresh session to ensure cookies are set
      await supabase.auth.refreshSession()
      
      router.push('/')
    } catch (error: any) {
      console.error('[Login] ✗ Email/password sign in failed:', error)
      showToast(error.message || 'Błąd podczas logowania', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailPasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_SITE_URL is not configured')
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`,
        },
      })

      if (error) throw error

      console.log('[Login] ✓ Email/password sign up successful')
      
      if (data.user?.identities?.length === 0) {
        // User already exists
        showToast('Ten email jest już zarejestrowany. Spróbuj się zalogować.', 'error')
      } else {
        // Check if email confirmation is required
        if (data.user && !data.session) {
          showToast('Sprawdź email, aby potwierdzić rejestrację', 'success')
        } else {
          showToast('Konto utworzone! Możesz się teraz zalogować.', 'success')
          
          // Refresh session to ensure cookies are set
          await supabase.auth.refreshSession()
          
          router.push('/')
        }
      }
    } catch (error: any) {
      console.error('[Login] ✗ Email/password sign up failed:', error)
      showToast(error.message || 'Błąd podczas rejestracji', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      if (!baseUrl) {
        console.error('[Login] NEXT_PUBLIC_SITE_URL is not configured')
        throw new Error('Konfiguracja aplikacji jest nieprawidłowa. Skontaktuj się z administratorem.')
      }

      console.log('[Login] Initiating Google OAuth flow...')
      console.log('[Login] Redirect URL:', `${baseUrl}/auth/callback`)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('[Login] ✗ Google OAuth error:', error)
        throw error
      }

      console.log('[Login] ✓ Google OAuth initiated successfully')
      // Browser will redirect to Google - no need to update loading state
    } catch (error: any) {
      console.error('[Login] ✗ Google sign in failed:', error)
      showToast(
        error.message || 'Błąd podczas logowania przez Google. Sprawdź czy masz włączone pliki cookie.',
        'error'
      )
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_SITE_URL is not configured')
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`,
        },
      })

      if (error) throw error

      console.log('[Login] ✓ Magic link sent')
      setMode('magic-link-sent')
      showToast('Magic link wysłany! Sprawdź swoją skrzynkę email.', 'success')
    } catch (error: any) {
      console.error('[Login] ✗ Magic link failed:', error)
      showToast(error.message || 'Wystąpił błąd podczas wysyłania linku', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      if (!baseUrl) {
        throw new Error('NEXT_PUBLIC_SITE_URL is not configured')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/reset-password`,
      })

      if (error) throw error

      console.log('[Login] ✓ Password reset email sent')
      setMode('reset-sent')
      showToast('Link do resetowania hasła został wysłany! Sprawdź swoją skrzynkę email.', 'success')
    } catch (error: any) {
      console.error('[Login] ✗ Password reset failed:', error)
      showToast(error.message || 'Wystąpił błąd podczas wysyłania linku resetującego', 'error')
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
            {mode === 'signin' && 'Zaloguj się do swojego konta'}
            {mode === 'signup' && 'Utwórz nowe konto'}
            {mode === 'magic-link' && 'Zaloguj się za pomocą magic link'}
            {mode === 'magic-link-sent' && 'Sprawdź swoją skrzynkę email'}
            {mode === 'forgot-password' && 'Zresetuj swoje hasło'}
            {mode === 'reset-sent' && 'Link do resetowania został wysłany'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'reset-sent' ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Wysłaliśmy link do resetowania hasła na adres <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Link jest ważny przez 60 minut. Kliknij go, aby ustawić nowe hasło.
              </p>
              <Button
                variant="outline"
                onClick={() => setMode('forgot-password')}
                className="w-full"
              >
                Wyślij ponownie
              </Button>
              <Button
                variant="ghost"
                onClick={() => setMode('signin')}
                className="w-full"
              >
                ← Powrót do logowania
              </Button>
            </div>
          ) : mode === 'forgot-password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
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
                {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('signin')}
                className="w-full"
              >
                ← Powrót do logowania
              </Button>
            </form>
          ) : mode === 'magic-link-sent' ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Wysłaliśmy link do logowania na adres <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Link jest ważny przez 60 minut. Kliknij go, aby się zalogować.
              </p>
              <Button
                variant="outline"
                onClick={() => setMode('magic-link')}
                className="w-full"
              >
                Wyślij ponownie
              </Button>
              <Button
                variant="ghost"
                onClick={() => setMode('signin')}
                className="w-full"
              >
                ← Powrót do logowania
              </Button>
            </div>
          ) : mode === 'magic-link' ? (
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('signin')}
                className="w-full"
              >
                ← Powrót do logowania
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading ? 'Łączenie...' : 'Zaloguj się przez Google'}
              </Button>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
                  lub
                </span>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={mode === 'signin' ? handleEmailPasswordSignIn : handleEmailPasswordSignUp} className="space-y-4">
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
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium">
                      Hasło
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-xs text-brand-purple hover:underline"
                        disabled={loading}
                      >
                        Nie pamiętasz hasła?
                      </button>
                    )}
                  </div>
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
                  {mode === 'signup' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 6 znaków
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !email || !password}
                >
                  {loading ? 'Ładowanie...' : mode === 'signin' ? 'Zaloguj się' : 'Utwórz konto'}
                </Button>
              </form>

              {/* Toggle between sign in/sign up */}
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-sm text-brand-purple hover:underline"
                  disabled={loading}
                >
                  {mode === 'signin' ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => setMode('magic-link')}
                  className="text-sm text-muted-foreground hover:text-brand-purple hover:underline"
                  disabled={loading}
                >
                  Lub użyj magic link
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
