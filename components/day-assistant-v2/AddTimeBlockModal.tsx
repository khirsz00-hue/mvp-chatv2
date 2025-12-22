'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { Label } from '@/components/ui/label'
import { Clock } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAddTimeBlock: (minutes: number) => void
}

export function AddTimeBlockModal({ isOpen, onClose, onAddTimeBlock }: Props) {
  const [minutes, setMinutes] = useState<string>('60')

  const handleSubmit = () => {
    const mins = parseInt(minutes, 10)
    
    if (isNaN(mins) || mins <= 0) {
      toast.error('Podaj prawidłową liczbę minut')
      return
    }

    if (mins > 480) {
      toast.warning('To dużo czasu! Może podziel na mniejsze bloki?')
    }

    onAddTimeBlock(mins)
    toast.success(`⏰ Dodano ${mins} min do dostępnego czasu`)
    onClose()
    setMinutes('60') // Reset for next time
  }

  const quickOptions = [30, 60, 90, 120]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={24} />
            Dodaj blok czasu
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Na ile czasu masz teraz? Dodaj blok czasu, aby system dopasował kolejkę zadań.
          </p>

          <div>
            <Label htmlFor="minutes">Minuty</Label>
            <input
              id="minutes"
              type="number"
              min="1"
              max="480"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-purple focus:ring focus:ring-brand-purple/20"
              placeholder="np. 60"
            />
          </div>

          <div className="space-y-2">
            <Label>Szybki wybór:</Label>
            <div className="grid grid-cols-4 gap-2">
              {quickOptions.map((mins) => (
                <Button
                  key={mins}
                  variant="outline"
                  size="sm"
                  onClick={() => setMinutes(mins.toString())}
                  className={minutes === mins.toString() ? 'border-brand-purple bg-brand-purple/10' : ''}
                >
                  {mins} min
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit}>
              ✅ Dodaj
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
