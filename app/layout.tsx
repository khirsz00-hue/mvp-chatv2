import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Assistants PRO',
  description: 'SaaS platforma z modułowymi asystentami (Todoist + Six Hats)'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        {children}
      </body>
    </html>
  )
}
