'use client'

import { useState } from 'react'
import Button from '../ui/Button'
import { User, SignOut, CreditCard, UserCircle } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  user?: {
    name?: string
    email?: string
  } | null
  onSignIn?: () => void
  onSignOut?: () => void
}

export default function Header({ user, onSignIn, onSignOut }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowMenu(false)
    }
  }

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
            <div className="flex items-center gap-3 relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                onKeyDown={handleKeyDown}
                aria-expanded={showMenu}
                aria-haspopup="true"
                className="hidden md:flex items-center gap-2 text-sm hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
              >
                <User size={16} className="text-gray-600" />
                <span className="text-gray-700 font-medium">
                  {user.name || user.email || 'Użytkownik'}
                </span>
              </button>
              
              {showMenu && (
                <div 
                  role="menu"
                  className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                  onKeyDown={handleKeyDown}
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowMenu(false)
                      router.push('/profile')
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <UserCircle size={18} />
                    Mój profil
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowMenu(false)
                      router.push('/subscription')
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <CreditCard size={18} />
                    Subskrypcja
                  </button>
                  <hr className="my-1" />
                  <button
                    role="menuitem"
                    onClick={() => {
                      setShowMenu(false)
                      onSignOut?.()
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <SignOut size={18} />
                    Wyloguj
                  </button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="flex md:hidden items-center gap-2"
              >
                <SignOut size={16} />
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
              <span className="hidden md:inline">Zaloguj się</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
