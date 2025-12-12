'use client'

import React, { useState } from 'react'
import Button from './ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import Badge from './ui/Badge'
import Separator from './ui/Separator'
import ScrollArea from './ui/ScrollArea'

/**
 * Design System Demo Component
 * 
 * This component demonstrates all the new UI components from the design system.
 * It's meant for testing and showcasing the visual design.
 */
export default function DesignSystemDemo() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-brand-purple mb-2">Design System Demo</h1>
        <p className="text-gray-600 mb-8">Migrated from adhd-buddy-asystent</p>

        {/* Buttons */}
        <Card className="mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Button variant="default">Default</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="success">Success</Button>
            </div>
            <Separator />
            <div className="flex gap-3 items-center flex-wrap">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card className="mb-8 animate-slide-in-up">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Color-coded labels for priorities and statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="purple">Purple</Badge>
              <Badge variant="pink">Pink</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Glassmorphism */}
        <Card className="mb-8 animate-scale-in">
          <CardHeader>
            <CardTitle>Glassmorphism Effects</CardTitle>
            <CardDescription>Modern frosted glass effects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="glass p-4 rounded-xl">
              <p className="font-medium">Light Glass Effect</p>
              <p className="text-sm text-gray-600">Subtle translucent background with blur</p>
            </div>
            <div className="glass-purple p-4 rounded-xl">
              <p className="font-medium text-brand-purple">Purple Glass Effect</p>
              <p className="text-sm text-gray-600">Purple tinted glassmorphism</p>
            </div>
          </CardContent>
        </Card>

        {/* Shadows & Animations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Shadows & Animations</CardTitle>
            <CardDescription>Soft shadows and glow effects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-soft">
              <p className="font-medium">Soft Shadow</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-soft-lg">
              <p className="font-medium">Soft Shadow Large</p>
            </div>
            <div className="bg-brand-purple text-white p-4 rounded-xl shadow-glow">
              <p className="font-medium">Purple Glow</p>
            </div>
            <div className="bg-gradient-to-r from-brand-purple to-brand-pink text-white p-4 rounded-xl shadow-glow-lg shimmer">
              <p className="font-medium">Shimmer Effect</p>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Input fields with focus rings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Text input with focus ring" />
            <Textarea placeholder="Textarea with focus ring" rows={3} />
          </CardContent>
        </Card>

        {/* Dialog */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Dialog Modal</CardTitle>
            <CardDescription>Animated modal system</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Example Dialog</DialogTitle>
              <DialogDescription>
                This is a modal dialog with smooth animations and glassmorphism backdrop.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input placeholder="Enter something..." />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Scroll Area */}
        <Card>
          <CardHeader>
            <CardTitle>Scroll Area</CardTitle>
            <CardDescription>Custom scrollable container</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 border rounded-lg p-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="py-2 border-b last:border-b-0">
                  Item {i + 1}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
