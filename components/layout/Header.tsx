'use client'

import Button from '../ui/Button'
import { User, SignOut } from '@phosphor-icons/react'

interface HeaderProps {
  user?: {
    name?: string
    email?: string
  } | null
  onSignIn?: () => void
  onSignOut?: () => void
}

export default function Header({ user, onSignIn, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 glass shadow-glow border-b border-white/20">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-pink flex items-center justify-center">
            <span className="text-white font-bold text-xl">AI</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            AI Assistants PRO
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm">
                <User size={16} className="text-gray-600" />
                <span className="text-gray-700 font-medium">
                  {user.name || user.email || 'Użytkownik'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="flex items-center gap-2"
              >
                <SignOut size={16} />
                <span className="hidden md:inline">Wyloguj</span>
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onSignIn}
              className="gap-2"
            >
              <User size={20} />
              <span className="hidden md:inline">Użytkownik</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
