import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Assistants PRO - Intelligent Task Management',
  description: 'World-class AI assistant platform with modular tools for task management and decision making'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        {/* Top navigation bar with glassmorphism effect */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/70 backdrop-blur-xl shadow-soft">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 flex items-center justify-center shadow-glow transition-all duration-200 group-hover:shadow-glow-lg group-hover:scale-105">
                <span className="text-white text-xl font-bold">AI</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-gradient-to-r from-brand-700 to-accent-700 bg-clip-text text-transparent">AI Assistants PRO</span>
                <span className="text-xs text-gray-500 -mt-0.5">Intelligent Task Management</span>
              </div>
            </Link>
            <Link href="/login" className="btn btn-ghost text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Konto
            </Link>
          </div>
        </nav>

        {/* Main content with top padding for fixed nav */}
        <main className="pt-20 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
