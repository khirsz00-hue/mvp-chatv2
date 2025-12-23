export const FEATURES = {
  free: {
    day_assistant: true,
    tasks_assistant: false,
    journal_assistant: false,
    decision_assistant: false,
    todoist_integration: false,
    week_assistant: false,
  },
  pro: {
    day_assistant: true,
    tasks_assistant: true,
    journal_assistant: true,
    decision_assistant: true,
    todoist_integration: true,
    week_assistant: true,
  }
} as const

export type FeatureName = keyof typeof FEATURES.free

export function hasFeatureAccess(
  tier: 'free' | 'pro',
  feature: FeatureName
): boolean {
  return FEATURES[tier]?.[feature] ?? false
}
