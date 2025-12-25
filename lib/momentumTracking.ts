/**
 * Momentum Tracking Module
 * Real-time tracking of progress vs expected, motivational nudges
 */

import dayjs from 'dayjs'

export interface MomentumStatus {
  status: 'ahead' | 'on_track' | 'behind'
  message: string
  percentage: number
  actions: string[]
}

/**
 * Track momentum based on completed tasks vs total tasks
 */
export function trackMomentum(completedToday: number, totalToday: number): MomentumStatus {
  const currentHour = dayjs().hour()
  const percentage = totalToday > 0 ? (completedToday / totalToday) * 100 : 0
  
  // Expected milestones by hour
  const milestones: Record<number, number> = {
    9: 0.15,   // 15% by 9am
    12: 0.40,  // 40% by noon
    15: 0.70,  // 70% by 3pm
    18: 0.90   // 90% by 6pm
  }
  
  // Find current milestone
  let expected = 0
  for (const [hour, percent] of Object.entries(milestones)) {
    if (currentHour >= parseInt(hour)) {
      expected = percent * 100
    }
  }
  
  const diff = percentage - expected
  
  if (diff > 10) {
    return {
      status: 'ahead',
      message: `🎉 Świetne tempo! Ukończono ${completedToday}/${totalToday} zadań (${Math.round(percentage)}%). Wyprzedzasz plan o ${Math.round(diff)}%!`,
      percentage,
      actions: [
        'Weź 15min przerwę',
        'Dodaj bonus task',
        'Zakończ wcześniej'
      ]
    }
  } else if (diff < -10) {
    return {
      status: 'behind',
      message: `⚠️ Tempo poniżej oczekiwanego. Ukończono ${completedToday}/${totalToday} zadań (${Math.round(percentage)}%). Oczekiwano ${Math.round(expected)}%.`,
      percentage,
      actions: [
        'Zwiększ skupienie',
        'Zmniejsz estymaty',
        'Odłóż mniej pilne',
        'Przedłuż dzień pracy o 1h'
      ]
    }
  } else {
    return {
      status: 'on_track',
      message: `✅ W planie! Ukończono ${completedToday}/${totalToday} zadań (${Math.round(percentage)}%).`,
      percentage,
      actions: []
    }
  }
}

/**
 * Get motivational message based on time of day and progress
 */
export function getMotivationalMessage(
  completedCount: number,
  timeOfDay: 'morning' | 'afternoon' | 'evening'
): string {
  const messages = {
    morning: [
      '☀️ Świetny start dnia!',
      '🌅 Poranny flow włączony!',
      '⚡ Produktywny poranek!'
    ],
    afternoon: [
      '🚀 Połowa dnia za Tobą!',
      '💪 Trzymaj tempo!',
      '🎯 Świetna robota!'
    ],
    evening: [
      '🌙 Dobijasz do mety!',
      '🏁 Końcówka dnia - jeszcze chwila!',
      '✨ Niemal u celu!'
    ]
  }
  
  const timeMessages = messages[timeOfDay]
  const index = completedCount % timeMessages.length
  return timeMessages[index]
}

/**
 * Calculate expected completion time based on current pace
 */
export function calculateExpectedCompletion(
  completedCount: number,
  totalCount: number,
  startTime: Date
): Date | null {
  if (completedCount === 0) return null
  
  const now = new Date()
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60
  const avgMinutesPerTask = elapsedMinutes / completedCount
  
  const remainingTasks = totalCount - completedCount
  const estimatedMinutesLeft = remainingTasks * avgMinutesPerTask
  
  const expectedCompletion = new Date(now.getTime() + estimatedMinutesLeft * 60 * 1000)
  return expectedCompletion
}
