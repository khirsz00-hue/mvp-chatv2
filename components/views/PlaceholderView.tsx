'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'

interface PlaceholderViewProps {
  icon: string
  title: string
  description: string
}

export default function PlaceholderView({ icon, title, description }: PlaceholderViewProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4 animate-scale-in">{icon}</div>
          <CardTitle className="bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent">
            {title}
          </CardTitle>
          <CardDescription className="mt-2">{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-500 text-sm">
            Ta funkcja jest w trakcie implementacji.
          </p>
          <div className="mt-6 inline-block px-4 py-2 bg-brand-purple/10 text-brand-purple rounded-lg text-sm font-medium">
            Coming Soon 🚀
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
