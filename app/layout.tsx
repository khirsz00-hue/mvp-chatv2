import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Assistants PRO',
  description: 'SaaS platforma z modułowymi asystentami (Todoist + Six Hats)'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <div className="border-b bg-white/80 backdrop-blur">
          <div className="max-w-6xl mx-auto py-3 px-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">AI Assistants PRO</Link>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">Konto</Link>
          </div>
        </div>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
