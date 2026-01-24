import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthStateProvider } from '@/components/auth/AuthStateProvider'
import { PWAGestureHandler } from '@/components/pwa/PWAGestureHandler'

export const metadata: Metadata = {
  title: 'AI Assistants PRO',
  description: 'SaaS platforma z modułowymi asystentami (Todoist + Six Hats)',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI Assistants PRO'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#8B5CF6'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <PWAGestureHandler />
        <AuthStateProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthStateProvider>
      </body>
    </html>
  )
}
