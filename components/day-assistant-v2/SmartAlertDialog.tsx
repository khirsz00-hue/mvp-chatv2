'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { OverflowAlert } from '@/lib/capacityManager'

interface SmartAlertDialogProps {
  alert: OverflowAlert | null
  isOpen: boolean
  onClose: () => void
  onActionClick: (action: string, data?: any) => void
}

export function SmartAlertDialog({ alert, isOpen, onClose, onActionClick }: SmartAlertDialogProps) {
  if (!alert) return null
  
  const getBgColor = () => {
    return alert.type === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
  }
  
  const getTextColor = () => {
    return alert.type === 'warning' ? 'text-orange-900' : 'text-blue-900'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={getTextColor()}>
            {alert.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className={`p-4 border rounded-lg ${getBgColor()}`}>
            <p className={`text-sm ${getTextColor()} whitespace-pre-line`}>
              {alert.message}
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Możliwe działania:</p>
            {alert.actions.map((action, i) => (
              <Button
                key={i}
                variant={action.action === 'CONFIRM_OVERLOAD' ? 'ghost' : 'outline'}
                className={`w-full justify-start text-left text-sm ${
                  action.action === 'CONFIRM_OVERLOAD' ? 'text-gray-600' : ''
                }`}
                onClick={() => {
                  onActionClick(action.action, action.data)
                  onClose()
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
          
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={onClose}
          >
            Anuluj
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
