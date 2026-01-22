import './globals.css'
import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthStateProvider } from '@/components/auth/AuthStateProvider'

export const metadata: Metadata = {
  title: 'AI Assistants PRO',
  description: 'SaaS platforma z modułowymi asystentami (Todoist + Six Hats)',
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  themeColor: '#8B5CF6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI Assistants PRO'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <AuthStateProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthStateProvider>
      </body>
    </html>
  )
}
