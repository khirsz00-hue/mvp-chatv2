'use client'

import { Card } from '@/components/ui/Card'
import { MomentumStatus } from '@/lib/momentumTracking'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import Button from '@/components/ui/Button'

interface MomentumStatusBarProps {
  momentum: MomentumStatus
  onActionClick?: (action: string) => void
}

export function MomentumStatusBar({ momentum, onActionClick }: MomentumStatusBarProps) {
  const getStatusColor = () => {
    switch (momentum.status) {
      case 'ahead':
        return 'text-green-600'
      case 'behind':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  const getProgressBarColor = () => {
    switch (momentum.status) {
      case 'ahead':
        return 'bg-green-500'
      case 'behind':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            {momentum.message}
          </p>
        </div>
        
        {momentum.actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="flex-shrink-0">
                Akcje
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {momentum.actions.map((action, idx) => (
                <DropdownMenuItem 
                  key={idx}
                  onClick={() => onActionClick?.(action)}
                >
                  {action}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${getProgressBarColor()}`}
          style={{ width: `${Math.min(100, momentum.percentage)}%` }}
        />
      </div>
    </Card>
  )
}
