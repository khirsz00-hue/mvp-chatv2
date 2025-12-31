'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Moon, Plus, Clock } from '@phosphor-icons/react'
import { TestDayTask } from '@/lib/types/dayAssistantV2'

interface AfterWorkHoursCardProps {
  workHoursEnd: string
  onAddTimeBlock: (minutes: number) => void
  suggestedTasks?: TestDayTask[]
  manualTimeBlock: number
}

const TIME_BLOCKS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 }
]

export function AfterWorkHoursCard({
  workHoursEnd,
  onAddTimeBlock,
  suggestedTasks,
  manualTimeBlock
}: AfterWorkHoursCardProps) {
  const [showTimeSelector, setShowTimeSelector] = useState(false)
  const [selectedTime, setSelectedTime] = useState<number | null>(null)

  const handleConfirm = () => {
    if (selectedTime) {
      onAddTimeBlock(selectedTime)
      setShowTimeSelector(false)
      setSelectedTime(null)
    }
  }

  // If user already added time block, show suggested tasks
  if (manualTimeBlock > 0 && suggestedTasks && suggestedTasks.length > 0) {
    return (
      <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={24} className="text-purple-600" />
            <span>Dodatkowy czas: {manualTimeBlock} min</span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Sugerowane zadania, które zmieszczą się w tym czasie:
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {suggestedTasks.map(task => (
            <div key={task.id} className="p-3 bg-white rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">{task.title}</span>
                <span className="text-sm text-gray-600">
                  ⏱️ {task.estimate_min} min
                </span>
              </div>
            </div>
          ))}
          <Button
            onClick={() => onAddTimeBlock(0)}
            variant="outline"
            className="w-full mt-4"
          >
            Zresetuj czas
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon size={24} className="text-purple-600" />
          <span>Koniec dnia pracy ({workHoursEnd})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-gray-700">
          Twój dzień roboczy się skończył! 🎉
        </p>
        
        {!showTimeSelector ? (
          <>
            <p className="text-sm text-gray-600">
              Chcesz jeszcze popracować?
            </p>
            <Button
              onClick={() => setShowTimeSelector(true)}
              className="gap-2"
            >
              <Plus size={20} />
              Dodaj blok czasu
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Ile czasu masz?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {TIME_BLOCKS.map(block => (
                <button
                  key={block.value}
                  onClick={() => setSelectedTime(block.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all font-medium
                    ${selectedTime === block.value
                      ? 'border-purple-600 bg-purple-100 text-purple-900'
                      : 'border-gray-300 hover:border-purple-300 bg-white'
                    }
                  `}
                >
                  {block.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleConfirm}
                disabled={!selectedTime}
                className="flex-1"
              >
                Potwierdź
              </Button>
              <Button
                onClick={() => {
                  setShowTimeSelector(false)
                  setSelectedTime(null)
                }}
                variant="outline"
                className="flex-1"
              >
                Anuluj
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
