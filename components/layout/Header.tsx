'use client'

import React from 'react'
import Button from '../ui/Button'
import { User, LogOut } from 'lucide-react'

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
    <header className="glass sticky top-0 z-50 border-b border-white/20 shadow-glow">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo with gradient */}
          <div className="text-2xl font-bold bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            AI Assistants PRO
          </div>
        </div>
        
        {/* User menu / Auth button */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700 font-medium">
                  {user.name || user.email || 'User'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onSignIn}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
