export const LIMITS = {
  free: {
    messages_per_month: 50,
    tasks_per_day: 10,
    decisions_per_month: 3,
    ai_analyses_per_month: 5
  },
  pro: {
    messages_per_month: Infinity,
    tasks_per_day: Infinity,
    decisions_per_month: Infinity,
    ai_analyses_per_month: Infinity
  }
} as const

export type SubscriptionTier = keyof typeof LIMITS
export type ResourceType = 'messages' | 'tasks' | 'decisions' | 'ai_analyses'
